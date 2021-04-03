const { basename } = require('path');
const chalk = require('chalk');
const fetcher = require('./fetcher');
const vats = require('./vats');
const pad = require('./pad');
const createFileTree = require('./create-file-tree');
const BaseUI = require('./BaseUI');
const ViStateUI = require('./ViStateUI');

module.exports = class FileTreeUI extends BaseUI {
	constructor(jumper, divOptions, repoData) {
		super(...arguments);

		this.repoData = repoData;

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
			left: `{col-1}r`,
			width: `(100% - {col-1}l) * 0.3`,
			height: `100% - {col-1}t`
		});
		this.col3 = this.jumper.addDivision({
			id: 'col-3',
			top: `{col-2}t`,
			left: `{col-2}r`,
			width: `(100% - {col-1}l) * 0.4`,
			height: `100% - {col-1}t`,
			overflowX: 'scroll'
		});

		this.addVatsListener('state-change', 'onStateChange');
		this.addVatsListener('keybinding', 'onKeybinding');
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
		[this.col1, this.col2.div, this.col3].forEach(div => div.reset());

		node.parent && this.getChildren(node.parent).forEach(file => {
			this.col1.addBlock(basename(file.path));
		});

		this.getChildren(node).forEach(file => {
			const block = this.col2.addBlock(pad(basename(file.path), this.col2.div.width()));
			block.path = file.path;
		});
		this.col2.sync();

		this.current = node;
	}

	getChildren(node) {
		const [dirs, files] = [[], []];
		node.children.forEach(child => {
			(child.type === 'tree' ? dirs : files).push(child);
		});

		return [...dirs, ...files];
	}

	getSelectedFile() {
		return this.tree.cache.get(this.col2.getSelectedBlock().path);
	}

	onStateChange({ previousState }) {
		if (previousState && previousState.cursorY === this.getState().cursorY) {
			return;
		}

		const file = this.getSelectedFile();
		this.col3.reset();

		if (file.type === 'tree') {
			file.children.forEach(child => this.col3.addBlock(basename(child.path)));
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

	onKeybinding({ kb }) {
		if (/cursor-(left|right)/.test(kb.action.name)) {
			let needsRender = false;
			if (kb.action.name.includes('right')) {
				const node = this.getSelectedFile();
				node.type === 'tree' && this.cd(node);
				needsRender = node.type === 'tree';
			} else if (this.current.parent) {
				this.cd(this.current.parent);
				needsRender = true;
			}
			needsRender && vats.emitEvent('state-change');
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
