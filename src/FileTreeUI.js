const { spawnSync } = require('child_process');
const fs = require('fs');
const { basename } = require('path');
const tmp = require('tmp');
const escapes = require('ansi-escapes');
const chalk = require('chalk');
const pager = require('./pager');
const fetcher = require('./fetcher');
const vats = require('./vats');
const pad = require('./pad');
const colorscheme = require('./colorscheme');
const createFileTree = require('./create-file-tree');
const uiEndOnEscape = require('./uiEndOnEscape');
const BaseUI = require('./BaseUI');
const ViStateUI = require('./ViStateUI');
const CtrlPUI = require('./CtrlPUI');

module.exports = class FileTreeUI extends BaseUI {
	constructor(jumper, divOptions, repoData) {
		super(...arguments);

		this.repoData = repoData;
		this.cache = new Map();
		this.current = null;

		this.col1 = this.jumper.addDivision({
			id: 'col-1',
			top: divOptions.top,
			left: divOptions.left,
			width: `(100% - {col-1}l) * 0.3`,
			height: `100% - {col-1}t`
		});
		this.col2 = new ViStateUI(this.jumper, {
			id: 'col-2',
			top: `{col-1}t`,
			left: `{col-1}r + 1`,
			width: `(100% - {col-1}l) * 0.3 - 1`,
			height: `100% - {col-1}t`
		});
		this.col3 = this.jumper.addDivision({
			id: 'col-3',
			top: `{col-2}t`,
			left: `{col-2}r + 1`,
			width: `(100% - {col-1}l) * 0.4 - 1`,
			height: `100% - {col-1}t`
		});

		this.addVatsListener('state-change', 'onStateChange');
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

	run() {
		this.cd(this.repoData.tree.root);
		vats.emitEvent('state-change');
		return super.run();
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
			this.jumper.render();
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

		this.jumper.render();
	}

	previewFile(file) {
		const { children, content, ...json } = file;

		if (file.content) {
			return this.col3.addBlock(colorscheme.autoSyntax(file.content, file.path));
		}

		this.col3.addBlock(`Press ${chalk.bold('enter')} to load ${chalk.blue(file.path)}.`, 'load');
	}

	async loadFileContent(file) {
		const res = await fetcher.getFile(this.repoData, file.path);
		const json = await res.json();
		return Buffer.from(json.content, json.encoding).toString();
	}

	onKeypress({ key }) {
		const file = this.getSelectedFile();
		if (file.type !== 'tree' && ['J', 'K', 'F', 'B'].includes(key.formatted)) {
			const height = this.col3.height();
			const amount = { J: 1, K: -1, F: height, B: -height }[key.formatted];
			this.col3.scrollDown(amount);
			this.jumper.render();
		}
	}

	async onKeybinding({ kb }) {
		const file = this.getSelectedFile();

		if (file.type === 'tree' && ['cursor-right', 'return'].includes(kb.action.name)) {
			this.cd(file, true);
		} else if (this.current.parent && kb.action.name === 'cursor-left') {
			this.cd(this.current.parent, true);
		} else if (file.type !== 'tree' && kb.action.name === 'return') {
			this.onSelectFile(file);
		} else if (kb.action.name === 'ctrl+p') {
			const ui = new CtrlPUI(this.jumper, this.repoData);

			ui.focus();
			this.unfocus();

			ui.run().then(file => {
				this.focus();
				file ? this.cdToFile(file) : this.jumper.setDirty(this.col1);
				this.jumper.render();
				vats.emitEvent('state-change');
			});
		}
	}

	async onSelectFile(file) {
		if (file.content) {
			await pager(colorscheme.autoSyntax(file.content, file.path));
		} else if (!file.content) {
			this.col3.getBlock('load').content(`Loading ${chalk.blue(file.path)}...`);
			const content = await this.loadFileContent(file);

			file.content = content;
			if (this.getSelectedFile() === file) {
				this.col3.reset();
				this.previewFile(file);
				this.jumper.render();
			}
		}
	}

	async onCommand({ argv }) {
		const command = argv._[0];
		const file = this.getSelectedFile();

		if (command === 'less' && file.type !== 'tree') {
			file.content = file.content || (await this.loadFileContent(file));
			await pager(colorscheme.autoSyntax(file.content, file.path));
		} else if (command === 'vim' && file.type !== 'tree') {
			file.content = file.content || (await this.loadFileContent(file));

			const name = file.path.replace(/\//g, '_');

			tmp.file({ name }, (err, path, fd, done) => {
				if (err) {
					throw err;
				}

				fs.writeSync(fd, file.content);
				process.stdout.write(escapes.cursorShow);
				spawnSync(`vim "${path}"`, { shell: process.env.SHELL, stdio: 'inherit' });
				process.stdout.write(escapes.cursorHide);

				done();
			});
		}
	}

	destroy() {
		[this.col1, this.col3].forEach(div => {
			this.jumper.removeDivision(div);
			div.destroy();
		});
		this.col2.destroy();

		this.col1 = this.col2 = this.col3 = null;
		this.repoData = this.current = this.cache = null;

		super.destroy();
	}
};
