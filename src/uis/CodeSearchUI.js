import escapes from 'ansi-escapes';
import chalk from 'chalk';
import pad from '../utils/pad.js';
import jumper from '../jumper.js';
import vats from '../vats.js';
import BaseUI from './BaseUI.js';
import ViStateUI from './ViStateUI.js';
import DialogUI from './DialogUI.js';

export default class CodeSearchUI extends BaseUI {
	constructor(divOptions = {}, repo) {
		super();
		this.repo = repo;

		this.input = jumper.addDivision({
			id: 'input',
			top: '100% - 1',
			left: divOptions.left || '1',
			width: divOptions.width || '100%'
		});

		this.resultsUI = new ViStateUI({
			id: 'results',
			top: divOptions.top || '0',
			left: divOptions.left || '1',
			width: divOptions ? `${divOptions.width} * 0.5 - 1` : '50% - 1',
			height: '100%'
		});

		this.preview = jumper.addDivision({
			id: 'preview',
			top: '{results}t',
			left: '{results}r + 1',
			width: divOptions ? `${divOptions.width} * 0.5 - 1` : '50% - 1',
			height: '100%'
		});
		this.previewBlock = this.preview.addBlock('');
	}

	run() {
		const promise = super.run();
		this.promptForSearchQuery().then(query => this.fetchRepos(query));
		return promise;
	}

	focus() {
		this.resultsUI.focus();
		this.addVatsListener('state-change', 'onStateChange');
		this.addVatsListener('keypress', 'onKeypress');
		return super.focus();
	}

	unfocus() {
		this.resultsUI.unfocus();
		super.unfocus();
	}

	async promptForSearchQuery() {
		process.stdout.write(escapes.cursorShow + jumper.jumpToString('{input}l', '{input}t'));
		const prompt = ` Enter a search term > `;
		const query = await vats.prompt({ prompt });
		process.stdout.write(escapes.cursorHide);
		return query;
	}

	async fetchRepos(query) {
		const json = await (await this.repo.searchCode(query)).json();

		if (!json.items || json.items.length === 0) {
			jumper.chain().jumpTo('{results}l', '{results}t').appendToChain('No results found.').execute();
			return this.promptForSearchQuery().then(query => this.fetchRepos(query));
		}

		const width = this.resultsUI.div.width();
		json.items.forEach(item => {
			const block = this.resultsUI.addBlock(pad(item.path, width));
			block.item = item;
		});
		this.resultsUI.sync();

		vats.emitEvent('state-change');
	}

	onStateChange({ previousState }) {
		if (this.resultsUI.blocks.length === 0) {
			return;
		}

		const selected = this.resultsUI.getSelectedBlock();
		const hr = new Array(this.preview.width()).fill(chalk.gray('-')).join('');
		const preview = selected.item.text_matches.map(m => m.fragment).join(`\n\n${hr}\n\n`)
		this.previewBlock.content(preview);
		jumper.render();
	}

	onKeypress({ key }) {
		if (key.formatted === 'return') {
			this.onSelectNode(this.resultsUI.getSelectedBlock().item);
		}
	}

	async onSelectNode(node) {
		const dialog = new DialogUI();
		dialog.addHeader(node.path);
		dialog.addAction('Show in file tree');

		this.unfocus();
		dialog.open();
		dialog.run().then(block => this.onDialogSelect(block));
		vats.emitEvent('state-change');
	}

	onDialogSelect(block) {
		if (!block) {
			this.focus();
			return vats.emitEvent('state-change');
		}

		if (block.name === 'Show in file tree') {
			const path = this.resultsUI.getSelectedBlock().item.path;
			this.end({ action: 'open-in-file-tree', path });
		}
	}

	destroy() {
		['input', 'preview'].forEach(id => {
			const div = jumper.getDivision(id);
			jumper.removeDivision(div);
			div.destroy();
		});

		this.resultsUI.destroy();
		this.input = this.resultsUI = this.preview = null;
		super.destroy();
	}
}
