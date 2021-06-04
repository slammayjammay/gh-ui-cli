import escapes from 'ansi-escapes';
import sliceAnsi from 'slice-ansi';
import chalk from 'chalk';
import pad from '../utils/pad.js';
import pager from '../utils/pager.js';
import jumper from '../jumper.js';
import vats from '../vats.js';
import colorscheme from '../colorscheme.js';
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

		this.previewSelectedFile();
	}

	previewSelectedFile() {
		const selected = this.resultsUI.getSelectedBlock();
		const file = this.repo.tree.map.get(selected.item.path);
		const hr = new Array(this.preview.width()).fill(chalk.gray('-')).join('');
		const fragments = selected.item.text_matches.map(match => this.formatFragment(match));
		this.previewBlock.content(fragments.join(`\n\n${hr}\n${hr}\n\n`));
		jumper.render();
	}

	formatFragment(match) {
		const { fragment, matches } = match;
		const allIndices = matches.map(({ indices }) => indices);

		const slices = [];
		let start = 0, end = 0;

		for (let i = 0, l = allIndices.length; i < l; i++) {
			start = allIndices[i][0];
			slices.push(fragment.slice(end, start));
			end = allIndices[i][1];
			slices.push(chalk.bgYellow(fragment.slice(start, end)));
		}
		slices.push(fragment.slice(end, fragment.length));

		return slices.join('');
	}

	async onKeypress({ key }) {
		if (key.formatted === 'return') {
			this.onSelectNode(this.resultsUI.getSelectedBlock().item);
		} else if (key.formatted === 'ctrl+l') {
			const selected = this.resultsUI.getSelectedBlock();
			const file = this.repo.tree.map.get(selected.item.path);
			await this.repo.loadFileData(file);
			vats.emitEvent('state-change');
		} else if (['J', 'K', 'F', 'B'].includes(key.formatted)) {
			const height = this.preview.height();
			const amount = { J: 1, K: -1, F: height, B: -height }[key.formatted];
			this.preview.scrollDown(amount);
			jumper.render();
		}
	}

	async onSelectNode(node) {
		const dialog = new DialogUI();
		dialog.addHeader(node.path);
		dialog.addActions(['Show details', 'Show in file tree']);

		this.unfocus();
		dialog.open();
		dialog.run().then(block => this.onDialogSelect(block));
		vats.emitEvent('state-change');
	}

	async onDialogSelect(block) {
		this.focus();

		if (!block) {
			return vats.emitEvent('state-change');
		}

		const selectedItem = this.resultsUI.getSelectedBlock().item;

		if (block.name === 'Show details') {
			await pager(colorscheme.syntax(JSON.stringify(selectedItem, null, 2), 'json'));
			vats.emitEvent('state-change');
		} else if (block.name === 'Show in file tree') {
			this.end({ action: 'open-in-file-tree', path: selectedItem.path });
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
