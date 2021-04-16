const chalk = require('chalk');
const figlet = require('figlet');
const pad = require('../pad');
const vats = require('../vats');
const fetcher = require('../fetcher');
const colorscheme = require('../colorscheme');
const createFileTree = require('../create-file-tree');
const uiEndOnEscape = require('../uiEndOnEscape');
const BaseUI = require('../BaseUI');
const ViStateUI = require('../ViStateUI');
const SidebarUI = require('./SidebarUI');
const FileTreeUI = require('../FileTreeUI');
const BranchesUI = require('./BranchesUI');
const CommitsUI = require('./CommitsUI');
const IssuesUI = require('./IssuesUI');

const DIVS = {
	REPO_NAME: { id: 'repo-name', top: 0, left: 1, width: '100% - 1' },
	SIDEBAR_PROMPT: { id: 'sidebar-prompt', top: '{repo-name}b', left: 1, overflowX: 'scroll', width: '{sidebar-prompt}nw' },
	SIDEBAR: { id: 'sidebar', top: '{repo-name}b', left: 0, width: 'min(40, 100%)', height: '100%' },
	HR: { id: 'hr', top: '{sidebar-prompt}b', left: 1, width: '100% - {hr}l' },
	FILE_UI: { id: 'file-ui', top: '{hr}b + 1', left: '{hr}l', width: `100% - {file-ui}l` }
};

module.exports = class RepoUI extends BaseUI {
	constructor(jumper, repoName) {
		super(jumper);

		this.repoName = repoName;

		this.jumper.addDivision(DIVS.REPO_NAME);
		this.sidebarPrompt = this.jumper.addDivision(DIVS.SIDEBAR_PROMPT);
		this.sidebarUI = new SidebarUI(this.jumper, DIVS.SIDEBAR, {
			colorDefault: text => chalk.bgHex('#0d1117').blue.bold(text),
			colorHighlight: text => chalk.white.bold.bgHex('#21262d')(text)
		});
		this.sidebarUI.close();
		this.sidebarUI.run().then(name => this.end(name));
		this.hr = this.jumper.addDivision(DIVS.HR);

		this.figletName = this.getFigletName();
		this.jumper.getDivision('repo-name').addBlock(this.figletName, 'name');

		this.jumper.getDivision('sidebar-prompt').addBlock(chalk.bgHex('#0d1117').blue.bold(' tab > '), 'prompt');

		this.hr.addBlock(new Array(this.hr.width()).fill(chalk.underline(' ')));

		this.addVatsListener('keypress', 'onKeypress');
	}

	getFigletName(text = this.repoName) {
		const lines = [];
		const names = text.split('/').map(string => {
			return figlet.textSync(string, { font: 'Calvin S' }).split('\n');
		});
		const numLines = names[0].length;

		for (let i = 0; i < numLines; i++) {
			const junk = [];
			names.forEach(line => junk.push(line[i]));
			const slash = [
				...new Array(numLines - i).fill(' '),
				'╱',
				...new Array(i).fill(' '),
			].join('');
			lines.push(junk.join(`${slash} `));
		}
		return lines.join('\n');
	}

	async run() {
		this.repoData = await (await fetcher.getRepo(this.repoName)).json();

		this.jumper.getBlock('repo-name.name').content(`${this.figletName} (loading files...)`);
		this.jumper.render();
		vats.emitEvent('state-change');

		fetcher.getFiles(this.repoData).then(res => res.json()).then(json => {
			this.jumper.getBlock('repo-name.name').content(this.figletName);
			this.repoData.tree = createFileTree(json.tree);
			this.repoData.tree.allFiles = json.tree;
			this.openFileUI();
		});
	}

	openFileUI() {
		this.fileUI = new FileTreeUI(this.jumper, DIVS.FILE_UI, this.repoData);
		this.fileUI.focus();
		const readme = this.repoData.tree.allFiles.find(file => /^readme\.md/i.test(file.path));
		if (!readme) {
			this.fileUI.cd(this.repoData.tree.root, true);
		} else {
			this.fileUI.cdToFile(readme);
			this.fileUI.loadFileContent(readme).then(content => {
				this.fileUI.col2.getSelectedBlock().file = readme;
				readme.content = content;
				vats.emitEvent('state-change');
			});
		}
		this.fileUI.run();
	}

	onKeypress({ key }) {
		if (key.formatted === 'escape' && this.sidebarUI.isOpen()) {
			this.sidebarUI.close();
			this.sidebarUI.unfocus();
			this.fileUI.focus();
			this.jumper.render();
		} else if (key.formatted === 'tab') {
			if (this.sidebarUI.isOpen()) {
				this.sidebarUI.close();
				this.sidebarUI.unfocus();
				this.fileUI.focus();
			} else {
				this.sidebarUI.open();
				this.fileUI.unfocus();
				this.sidebarUI.focus();
				vats.emitEvent('state-change');
			}

			this.jumper.render();
		}
	}
};
