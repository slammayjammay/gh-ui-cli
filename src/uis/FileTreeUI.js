import { basename } from 'path';
import escapes from 'ansi-escapes';
import chalk from 'chalk';
import pager from '../utils/pager.js';
import vim from '../utils/vim.js';
import map from '../map.js';
import jumper from '../jumper.js';
import vats from '../vats.js';
import pad from '../utils/pad.js';
import colorscheme from '../colorscheme.js';
import Loader from '../Loader.js';
import BaseUI from './BaseUI.js';
import ViStateUI from './ViStateUI.js';
import DialogUI from './DialogUI.js';
import CtrlPUI from './CtrlPUI.js';

// TODO: Use ViStateUI for all columns
export default class FileTreeUI extends BaseUI {
	constructor(divOptions, repo) {
		super(...arguments);

		this.repo = repo;
		this.cache = new Map();
		this.current = null;

		this.col1 = jumper.addDivision({
			id: 'col-1',
			top: divOptions.top,
			left: divOptions.left,
			width: `(100% - {col-1}l) * 0.3`,
			height: `100% - {col-1}t`
		});
		this.col2 = new ViStateUI({
			id: 'col-2',
			top: `{col-1}t`,
			left: `{col-1}r + 1`,
			width: `(100% - {col-1}l) * 0.3 - 1`,
			height: `100% - {col-1}t`
		}, { colorDefault: this.colorDefault, colorHighlight: this.colorHighlight });
		this.col3 = jumper.addDivision({
			id: 'col-3',
			top: `{col-2}t`,
			left: `{col-2}r + 1`,
			width: `(100% - {col-1}l) * 0.4 - 1`,
			height: `100% - {col-1}t`
		});

		this.addVatsListener('state-change', 'onStateChange');
		this.addVatsListener('keypress', 'onKeypress');
		this.addVatsListener('keybinding', 'onKeybinding');
		this.addVatsListener('command', 'onCommand');
	}

	getViState() {
		return this.col2.getViState();
	}

	focus() {
		this.col2.focus();
		return super.focus();
	}

	unfocus() {
		this.col2.unfocus();
		return super.unfocus();
	}

	cd(node, shouldRender = false) {
		if (this.current) {
			this.cache.get(this.current).activeIdx = this.col2.currentIdx;
		}

		[this.col1, this.col2.div, this.col3].forEach(div => div.reset());

		node.parent && this.populateColumn(this.col1, node.parent);
		this.populateColumn(this.col2.div, node);
		this.col2.sync();

		this.col2.setSelectedBlock(this.cache.get(node).activeIdx);

		this.current = node;

		if (shouldRender) {
			vats.emitEvent('state-change');
			jumper.render();
		}
	}

	cdToFile(file, shouldRender) {
		this.current = null;
		let currentChild = file;
		let currentParent = file.parent;

		while (currentParent) {
			!this.cache.has(currentParent) && this.cache.set(currentParent, {});
			this.cache.get(currentParent).activeIdx = this.getChildren(currentParent).indexOf(currentChild);
			currentChild = currentParent;
			currentParent = currentParent.parent;
		}

		this.cd(file.parent, shouldRender);
	}

	populateColumn(column, node) {
		if (!node) {
			return column.reset();
		}

		!this.cache.has(node) && this.cache.set(node, { activeIdx: 0 });
		const { activeIdx } = this.cache.get(node);

		this.getChildren(node).forEach((file, idx) => {
			const block = column.addBlock(pad(basename(file.path), column.width()));
			block.file = file;
			block.content(colorscheme.colorBlock(block, idx === activeIdx ? 'highlight' : 'default'));
		});
	}

	colorDefault(text, block) {
		return colorscheme.color(text, block.file.type === 'tree' ? 'folder' : 'default');
	}

	colorHighlight(text, block) {
		return colorscheme.color(text, block.file.type === 'tree' ? 'folder-highlight' : 'highlight');
	}

	getChildren(node) {
		const [dirs, files] = [[], []];
		node.children.forEach(child => {
			(child.type === 'tree' ? dirs : files).push(child);
		});

		return [...dirs, ...files];
	}

	getSelectedFile() {
		return this.col2.getSelectedBlock().file;
	}

	onStateChange({ previousState }) {
		if (previousState && previousState.cursorY === this.getViState().cursorY) {
			return;
		}

		const file = this.getSelectedFile();
		this.col3.reset();

		if (file.type === 'tree') {
			this.populateColumn(this.col3, file);
		} else {
			this.previewFile(file);
		}

		jumper.render();
	}

	previewFile(file) {
		const { children, content, ...json } = file;

		if (file.text) {
			return this.col3.addBlock(colorscheme.autoSyntax(file.text, file.path));
		}

		this.col3.addBlock(`Press ${chalk.yellow('ctrl+l')} to load ${chalk.blue(file.path)}.`, 'load');
	}

	async loadSelectedFile() {
		const file = this.getSelectedFile();
		this.col3.getBlock('load').content('');
		jumper.chain().render().jumpTo('{col-3}l', '{col-3}t').execute();

		const loader = new Loader(`Loading ${chalk.blue(file.path)}...`);
		loader.play();
		await this.repo.loadFileData(file);
		loader.end();

		if (this.getSelectedFile() === file) {
			this.col3.reset();
			this.previewFile(file);
			jumper.render();
		}
	}

	onKeypress({ key }) {
		const file = this.getSelectedFile();
		if (file.type !== 'tree' && ['J', 'K', 'F', 'B'].includes(key.formatted)) {
			const height = this.col3.height();
			const amount = { J: 1, K: -1, F: height, B: -height }[key.formatted];
			this.col3.scrollDown(amount);
			jumper.render();
		} else if (key.formatted === 'ctrl+l' && !file.data) {
			this.loadSelectedFile();
		}
	}

	async onKeybinding({ kb }) {
		const file = this.getSelectedFile();

		if (kb.action.name === 'cursor-to-document-left' && this.current !== this.repo.tree.root) {
			this.cd(this.repo.tree.root, true);
		} else if (file.type === 'tree' && kb.action.name === 'cursor-right') {
			this.cd(file, true);
		} else if (this.current.parent && kb.action.name === 'cursor-left') {
			this.cd(this.current.parent, true);
		} else if (kb.action.name === 'return') {
			this.onSelectNode(file);
		} else if (kb.action.name === 'ctrl+p') {
			const ui = new CtrlPUI(this.repo);

			ui.focus();
			this.unfocus();

			ui.run().then(file => {
				this.focus();
				file ? this.cdToFile(file) : jumper.setDirty(this.col1);
				jumper.render();
				vats.emitEvent('state-change');
			});
		}
	}

	async onSelectNode(node) {
		// TODO: close dialog when sidebar is opened
		const dialog = this.createDialog(node);
		dialog.addHeader(node.path);
		this.unfocus();
		dialog.open();
		dialog.run().then(block => this.onDialogSelect(block));
		vats.emitEvent('state-change');
	}

	createDialog(node) {
		const dialog = new DialogUI();
		const actions = ['Show details'];
		if (node.type !== 'tree') {
			actions.unshift('Open in less', 'Open in Vim');
			!node.data && actions.unshift('Load content');
		}

		dialog.addActions(actions);

		return dialog;
	}

	async onDialogSelect(block) {
		this.focus();
		if (!block) {
			return vats.emitEvent('state-change');
		}

		const file = this.getSelectedFile();

		if (block.name === 'Load content') {
			await this.loadSelectedFile();
		} else if (block.name === 'Show details') {
			vats.emitEvent('state-change');
			!file.data && await this.repo.loadFileData(file);
			await pager(colorscheme.syntax(JSON.stringify(file.data, null, 2), 'json'));
		} else if (block.name === 'Open in less') {
			vats.emitEvent('state-change');
			!file.data && await this.repo.loadFileData(file);
			await pager(colorscheme.autoSyntax(file.text, file.path));
		} else if (block.name === 'Open in Vim') {
			!file.data && await this.repo.loadFileData(file);
			vim(file.text, file.path).then(() => vats.emitEvent('state-change'));
		}

		vats.emitEvent('state-change');
	}

	async onCommand({ argv }) {
		const command = argv._[0];
		const file = this.getSelectedFile();

		if (command === 'less' && file.type !== 'tree') {
			!file.data && await this.repo.loadFileData(file);
			await pager(colorscheme.autoSyntax(file.text, file.path));
		} else if (command === 'vim' && file.type !== 'tree') {
			!file.data && await this.repo.loadFileData(file);
			vim(file.text, file.path);
		}
	}

	destroy() {
		[this.col1, this.col3].forEach(div => {
			jumper.removeDivision(div);
			div.destroy();
		});
		this.col2.destroy();

		this.col1 = this.col2 = this.col3 = null;
		this.repo = this.current = this.cache = null;

		super.destroy();
	}
};
