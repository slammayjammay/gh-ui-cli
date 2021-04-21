import chalk from 'chalk';
import stringWidth from 'string-width';
import figlet from 'figlet';
import pad from '../utils/pad.js';
import center from '../utils/center.js';
import map from '../map.js';
import jumper from '../jumper.js';
import vats from '../vats.js';
import createFileTree from '../utils/create-file-tree.js';
import Loader from '../Loader.js';
import BaseUI from './BaseUI.js';
import DialogUI from './DialogUI.js';
import FileTreeUI from './FileTreeUI.js';
import BranchesUI from './BranchesUI.js';
import CommitsUI from './CommitsUI.js';
import IssuesUI from './IssuesUI.js';

const DIVS = {
	SIDEBAR_PROMPT: { id: 'sidebar-prompt', top: 0, left: 0, overflowX: 'scroll', width: '{sidebar-prompt}nw' },
	REPO_NAME: { id: 'repo-name', top: '{sidebar-prompt}b', left: 1, width: '100% - 2' },
	SIDEBAR: { id: 'sidebar', top: '{sidebar-prompt}t', left: 0, width: 'min(40, 100%)', height: '100%' },
	HR: { id: 'hr', top: '{repo-name}b', left: 1, width: '{repo-name}w' },
	FILE_UI: { id: 'file-ui', top: '{hr}b', left: '{hr}l', width: '{repo-name}w' },
	COMMITS_UI: { id: 'commits-ui', top: '{hr}b', left: '{hr}l', width: '{repo-name}w' },
	BRANCHES_UI: { id: 'branches-ui', top: '{hr}b', left: '{hr}l', width: '{repo-name}w' },
	ISSUES_UI: { id: 'issues-ui', top: '{hr}b', left: '{hr}l', width: '{repo-name}w' }
};

export default class RepoUI extends BaseUI {
	constructor(repoName) {
		super();

		this.repoName = repoName;

		this.onKeypress = this.onKeypress.bind(this);

		this.sidebarPrompt = jumper.addDivision(DIVS.SIDEBAR_PROMPT);
		jumper.getDivision('sidebar-prompt').addBlock(chalk.bgHex('#0d1117').blue.bold(' Tab > '), 'prompt');

		this.sidebarUI = null;

		this.figletName = this.getFigletName();
		jumper.addDivision(DIVS.REPO_NAME);
		jumper.getDivision('repo-name').addBlock(this.figletName, 'figlet');
		jumper.getDivision('repo-name').addBlock(this.repoName, 'name');

		this.hr = jumper.addDivision(DIVS.HR);
		this.hr.addBlock('', 'current-action');
		this.hr.addBlock(new Array(this.hr.width()).fill(chalk.strikethrough(' ')));

		vats.on('keypress', this.onKeypress);
		this.addVatsListener('branch-select', 'onBranchSelect');
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
		const loaderString = `Loading repo "${this.repoName}"...`;
		const x = ~~((this.hr.width() - stringWidth(loaderString)) / 2);
		jumper.chain().render().jumpTo(x, '{hr}t').execute();
		const loader = new Loader(loaderString);

		loader.play();
		this.repoData = await (await map.get('fetcher').getRepo(this.repoName)).json();
		loader.end();

		await this.loadFiles(this.repoData.default_branch);

		vats.emitEvent('state-change');

		return super.run();
	}

	async loadFiles(branch) {
		map.set('currentBranch', branch);
		// this.repoData.currentBranch = branch;

		// if (this.repoData.tree) {
			// this.repoData.tree.destroy();
		// }

		const loaderString = `Loading branch "${branch}"...`;
		const x = ~~((this.hr.width() - stringWidth(loaderString)) / 2);
		jumper.jumpTo(x, '{hr}t');
		const loader = new Loader(loaderString);

		loader.play();
		const json = await (await map.get('fetcher').getFiles(this.repoData, branch)).json();
		loader.end();

		map.set('allFiles', json.tree);
		map.set('tree', createFileTree(json.tree));
		this.openUI('files');
		await this.cdToReadme();
	}

	openUI(action) {
		this.currentAction = action;
		if (action === 'files') {
			const currentBranch = map.get('currentBranch');
			this.setCurrentAction(chalk.bold(`Files (${chalk.hex('#43ff43')(currentBranch)})`));
			this.currentUI = new FileTreeUI(DIVS.FILE_UI, this.repoData);
		} else if (action === 'branches') {
			this.setCurrentAction(chalk.bold('Branches'));
			this.currentUI = new BranchesUI(DIVS.BRANCHES_UI, this.repoData);
		} else if (action === 'commits') {
			this.setCurrentAction(chalk.bold('Commits'));
			this.currentUI = new CommitsUI(DIVS.COMMITS_UI, this.repoData);
		} else if (action === 'issues') {
			this.setCurrentAction(chalk.bold('Issues'));
			this.currentUI = new IssuesUI(DIVS.ISSUES_UI, this.repoData);
		}
		this.currentUI.focus();
		this.currentUI.run();
	}

	setCurrentAction(string) {
		this.hr.getBlock('current-action').content(center(string, this.hr.width()));
	}

	async cdToReadme() {
		// const readme = this.repoData.tree.allFiles.find(file => /^readme\.md/i.test(file.path));
		const readme = map.get('allFiles').find(file => /^readme\.md/i.test(file.path));
		if (!readme) {
			this.currentUI.cd(map.get('tree'));
		} else {
			this.currentUI.cdToFile(readme);
			if (!readme.content) {
				const content = await this.currentUI.loadFileContent(readme);
				readme.content = content;
			}
		}
	}

	onKeypress({ key }) {
		if (this.sidebarUI && this.sidebarUI.isFocused && key.formatted === 'tab') {
			this.sidebarUI.end();
			vats.emitEvent('state-change');
		} else if (key.formatted === 'tab') {
			this.currentUI.unfocus();
			this.sidebarUI = this.createSidebar();
			this.sidebarUI.open();
			this.sidebarUI.run().then(block => this.onSidebarAction(block));
			vats.emitEvent('state-change');
		}
	}

	createSidebar() {
		const sidebarUI = new DialogUI(DIVS.SIDEBAR);
		const width = jumper.evaluate('{sidebar}w');
		['Files', 'Branches', 'Commits', 'Issues', 'Code search', 'Repo search'].forEach(string => {
			const block = sidebarUI.addBlock(sidebarUI.options.colorDefault(pad(` ${string} `, width)));
			block.name = string.toLowerCase();
		});
		sidebarUI.sync();
		return sidebarUI;
	}

	onSidebarAction(block) {
		this.currentUI.focus();

		if (!block) {
			return vats.emitEvent('state-change');
		}

		if (block.name === 'repo search') {
			this.end();
			return vats.emitEvent('repo-search-select');
		}

		if (block.name !== this.currentName) {
			this.currentUI.end();
			this.openUI(block.name);
		}

		// TODO: remember last selected file
		if (this.currentAction === 'files') {
			this.currentUI.cd(map.get('tree'));
		}

		jumper.render();
		vats.emitEvent('state-change');
	}

	async onBranchSelect({ branch }) {
		this.currentUI.end();
		await this.loadFiles(branch);
		vats.emitEvent('state-change');
	}

	destroy() {
		this.currentUI.destroy();

		vats.removeListener('keypress', this.onKeypress);

		['sidebar-prompt', 'repo-name', 'hr'].forEach(id => {
			const div = jumper.getDivision(id);
			jumper.removeDivision(div);
			div.destroy();
		});

		this.currentUI = this.sidebarPrompt = this.sidebarUI = this.hr = null;
		this.repoName = this.repoData = this.figletName = null;

		super.destroy();
	}
};
