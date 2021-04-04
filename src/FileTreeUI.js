const { spawnSync } = require('child_process');
const fs = require('fs');
const { basename } = require('path');
const tmp = require('tmp');
const escapes = require('ansi-escapes');
const chalk = require('chalk');
const pager = require('node-pager');
const fetcher = require('./fetcher');
const vats = require('./vats');
const pad = require('./pad');
const colorscheme = require('./colorscheme');
const createFileTree = require('./create-file-tree');
const BaseUI = require('./BaseUI');
const ViStateUI = require('./ViStateUI');

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
			height: `100% - {col-1}t`,
			overflowX: 'scroll'
		});

		this.addVatsListener('state-change', 'onStateChange');
		this.addVatsListener('keybinding', 'onKeybinding');
		this.addVatsListener('command', 'onCommand');
	}

	getState() {
		return this.col2.getState();
	}

	focus() {
		this.col2.focus();
		super.focus();
	}

	async run() {
		const json = await (await fetcher.getFiles(this.repoData.full_name)).json();
		const files = json.tree;
		this.tree = createFileTree(files);

		this.cd(this.tree.root);
		vats.emitEvent('state-change');

		return super.run();
	}

	cd(node) {
		if (this.current) {
			this.cache.get(this.current).activeIdx = this.col2.currentIdx;
		}

		[this.col1, this.col2.div, this.col3].forEach(div => div.reset());

		node.parent && this.populateColumn(this.col1, node.parent);
		this.populateColumn(this.col2.div, node);
		this.col2.sync();

		this.col2.setSelectedBlock(this.cache.get(node).activeIdx);

		this.current = node;
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
		if (previousState && previousState.cursorY === this.getState().cursorY) {
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
		const text = `${JSON.stringify(json, null, 2)}\n`
		this.col3.addBlock(text, 'json');

		if (file.content) {
			return this.col3.addBlock(file.content);
		}

		this.col3.addBlock(`Press ${chalk.italic("ctrl+l")} to load ${chalk.blue(file.path)}.`, 'load');
	}

	async loadFileContent(file) {
		const res = await fetcher.getFile(this.repoData.full_name, file.path);
		const json = await res.json();
		return Buffer.from(json.content, json.encoding).toString();
	}

	onKeypress({ key }) {
		const file = this.getSelectedFile();

		if (key.formatted === 'ctrl+l' && file.type !== 'tree') {
			const block = this.col3.getBlock('load');
			block.content(`Loading ${chalk.blue(file.path)}...`);
			this.jumper.render();

			this.loadFileContent(file).then(content => {
				file.content = content;

				if (this.getSelectedFile() === file) {
					block.content(file.content);
					this.jumper.render();
				}
			});
		}
	}

	async onKeybinding({ kb }) {
		let needsRender = false;
		const file = this.getSelectedFile();

		if (file.type === 'tree' && ['cursor-right', 'return'].includes(kb.action.name)) {
			this.cd(file);
			needsRender = true;
		} else if (file.parent && kb.action.name === 'cursor-left') {
			this.cd(this.current.parent);
			needsRender = true;
		} else if (file.type !== 'tree' && kb.action.name === 'return') {
			file.content = file.content || (await this.loadFileContent(file));
			await pager(file.content);
			needsRender = true;
		}

		needsRender && vats.emitEvent('state-change');
	}

	async onCommand({ argv }) {
		const command = argv._[0];

		if (command === 'vim') {
			const file = this.getSelectedFile();
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
		super.destroy();
	}
};
