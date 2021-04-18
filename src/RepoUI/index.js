import chalk from 'chalk';
import figlet from 'figlet';
import pad from '../pad.js';
import vats from '../vats.js';
import fetcher from '../fetcher.js';
import colorscheme from '../colorscheme.js';
import createFileTree from '../create-file-tree.js';
import Loader from '../Loader.js';
import BaseUI from '../BaseUI.js';
import ViStateUI from '../ViStateUI.js';
import SidebarUI from './SidebarUI.js';
import FileTreeUI from '../FileTreeUI.js';
import BranchesUI from './BranchesUI.js';
import CommitsUI from './CommitsUI.js';
import IssuesUI from './IssuesUI.js';

// TODO: display current action in header
const DIVS = {
	REPO_NAME: { id: 'repo-name', top: 0, left: 1, width: '100% - 1' },
	SIDEBAR_PROMPT: { id: 'sidebar-prompt', top: '{repo-name}b', left: 1, overflowX: 'scroll', width: '{sidebar-prompt}nw' },
	SIDEBAR: { id: 'sidebar', top: '{repo-name}b', left: 0, width: 'min(40, 100%)', height: '100%' },
	HR: { id: 'hr', top: '{sidebar-prompt}b', left: 1, width: '100% - {hr}l' },
	FILE_UI: { id: 'file-ui', top: '{hr}b + 1', left: '{hr}l', width: `100% - {file-ui}l` },
	COMMITS_UI: { id: 'commits-ui', top: '{hr}b + 1', left: '{hr}l', width: `100% - {commits-ui}l` },
	BRANCHES_UI: { id: 'branches-ui', top: '{hr}b + 1', left: '{hr}l', width: `100% - {branches-ui}l` },
	ISSUES_UI: { id: 'issues-ui', top: '{hr}b + 1', left: '{hr}l', width: `100% - {issues-ui}l` }
};

export default class RepoUI extends BaseUI {
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
		this.sidebarUI.run();

		this.hr = this.jumper.addDivision(DIVS.HR);
		this.hr.addBlock(new Array(this.hr.width()).fill(chalk.underline(' ')));

		this.figletName = this.getFigletName();
		this.jumper.getDivision('repo-name').addBlock(this.figletName, 'figlet');
		this.jumper.getDivision('repo-name').addBlock(`(${this.repoName})`, 'name');

		this.jumper.getDivision('sidebar-prompt').addBlock(chalk.bgHex('#0d1117').blue.bold(' tab > '), 'prompt');

		this.addVatsListener('keypress', 'onKeypress');
		this.addVatsListener('sidebar-action', 'onSidebarAction');
	}

	getFigletName(text = this.repoName) {
		const lines = [];
		const names = text.split('/').map(string => {
			string = string[0].toUpperCase() + string.slice(1);
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
		this.jumper.chain().render().jumpTo(0, '100%').execute();
		const loader = new Loader('Loading files...');
		loader.play();

		this.repoData = await (await fetcher.getRepo(this.repoName)).json();
		const json = await (await fetcher.getFiles(this.repoData)).json();
		loader.end();

		this.repoData.tree = createFileTree(json.tree);
		this.repoData.tree.allFiles = json.tree;
		this.openUI('files');
	}

	openUI(action) {
		this.currentAction = action;
		if (action === 'files') {
			this.currentUI = this.openFileUI();
		} else if (action === 'commits') {
			this.currentUI = this.openCommitsUI();
		} else if (action === 'branches') {
			this.currentUI = this.openBranchesUI();
		} else if (action === 'issues') {
			this.currentUI = this.openIssuesUI();
		}
		this.currentUI.focus();
		this.currentUI.run();
	}

	openFileUI() {
		const ui = new FileTreeUI(this.jumper, DIVS.FILE_UI, this.repoData);
		const readme = this.repoData.tree.allFiles.find(file => /^readme\.md/i.test(file.path));
		if (!readme) {
			ui.cd(this.repoData.tree.root, true);
		} else {
			ui.cdToFile(readme);
			!readme.content && ui.loadFileContent(readme).then(content => {
				readme.content = content;
				vats.emitEvent('state-change');
			});
		}
		return ui;
	}

	openCommitsUI() {
		return new CommitsUI(this.jumper, DIVS.COMMITS_UI, this.repoData);
	}

	openBranchesUI() {
		return new BranchesUI(this.jumper, DIVS.COMMITS_UI, this.repoData);
	}

	openIssuesUI() {
		return new IssuesUI(this.jumper, DIVS.ISSUES_UI, this.repoData);
	}

	onKeypress({ key }) {
		if (key.formatted === 'escape' && this.sidebarUI.isFocused) {
			this.sidebarUI.close();
			this.sidebarUI.unfocus();
			this.currentUI.focus();
			this.jumper.render();
		} else if (key.formatted === 'tab') {
			if (this.sidebarUI.isFocused) {
				this.sidebarUI.close();
				this.sidebarUI.unfocus();
				this.currentUI.focus();
			} else {
				this.currentUI.unfocus();
				this.sidebarUI.focus();
				this.sidebarUI.open();
				vats.emitEvent('state-change');
			}

			this.jumper.render();
		}
	}

	onSidebarAction({ action }) {
		this.sidebarUI.close();
		this.sidebarUI.unfocus();

		if (action !== this.currentName) {
			this.currentUI.end();
			this.openUI(action);
		}

		this.jumper.render();
		vats.emitEvent('state-change');
	}
};
