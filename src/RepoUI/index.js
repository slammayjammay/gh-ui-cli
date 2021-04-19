import chalk from 'chalk';
import stringWidth from 'string-width';
import figlet from 'figlet';
import pad from '../pad.js';
import center from '../center.js';
import vats from '../vats.js';
import fetcher from '../fetcher.js';
import createFileTree from '../create-file-tree.js';
import Loader from '../Loader.js';
import BaseUI from '../BaseUI.js';
import DialogUI from '../DialogUI.js';
import FileTreeUI from '../FileTreeUI.js';
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
	constructor(jumper, repoName) {
		super(jumper);

		this.repoName = repoName;

		this.sidebarPrompt = this.jumper.addDivision(DIVS.SIDEBAR_PROMPT);
		this.jumper.getDivision('sidebar-prompt').addBlock(chalk.bgHex('#0d1117').blue.bold(' Tab > '), 'prompt');

		this.sidebarUI = new DialogUI(this.jumper, DIVS.SIDEBAR, {
			colorDefault: text => chalk.bgHex('#0d1117').blue.bold(text),
			colorHighlight: text => chalk.white.bold.bgHex('#21262d')(text)
		});
		const width = this.jumper.evaluate('{sidebar}w');
		['Files', 'Branches', 'Commits', 'Issues', 'Code search', 'Repo search'].forEach(string => {
			const block = this.sidebarUI.addBlock(this.sidebarUI.options.colorDefault(pad(` ${string} `, width)));
			block.name = string.toLowerCase();
		});
		this.sidebarUI.sync();
		this.sidebarUI.close();

		this.figletName = this.getFigletName();
		this.jumper.addDivision(DIVS.REPO_NAME);
		this.jumper.getDivision('repo-name').addBlock(this.figletName, 'figlet');
		this.jumper.getDivision('repo-name').addBlock(this.repoName, 'name');

		this.hr = this.jumper.addDivision(DIVS.HR);
		this.hr.addBlock('', 'current-action');
		this.hr.addBlock(new Array(this.hr.width()).fill(chalk.strikethrough(' ')));

		vats.on('keypress', e => this.onKeypress(e));
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
		this.jumper.chain().render().jumpTo(x, '{hr}t').execute();
		const loader = new Loader(loaderString);

		loader.play();
		this.repoData = await (await fetcher.getRepo(this.repoName)).json();
		loader.end();

		await this.loadFiles(this.repoData.default_branch);

		vats.emitEvent('state-change');

		return super.run();
	}

	async loadFiles(branch) {
		this.repoData.currentBranch = branch;

		if (this.repoData.tree) {
			this.repoData.tree.destroy();
		}

		const loaderString = `Loading branch "${branch}"...`;
		const x = ~~((this.hr.width() - stringWidth(loaderString)) / 2);
		this.jumper.jumpTo(x, '{hr}t');
		const loader = new Loader(loaderString);

		loader.play();
		const json = await (await fetcher.getFiles(this.repoData, branch)).json();
		loader.end();

		this.repoData.tree = createFileTree(json.tree);
		this.openUI('files');
		await this.cdToReadme();
	}

	openUI(action) {
		this.currentAction = action;
		if (action === 'files') {
			this.setCurrentAction(chalk.bold(`Files (${chalk.hex('#43ff43')(this.repoData.currentBranch)})`));
			this.currentUI = new FileTreeUI(this.jumper, DIVS.FILE_UI, this.repoData);
		} else if (action === 'branches') {
			this.setCurrentAction(chalk.bold('Branches'));
			this.currentUI = new BranchesUI(this.jumper, DIVS.BRANCHES_UI, this.repoData);
		} else if (action === 'commits') {
			this.setCurrentAction(chalk.bold('Commits'));
			this.currentUI = new CommitsUI(this.jumper, DIVS.COMMITS_UI, this.repoData);
		} else if (action === 'issues') {
			this.setCurrentAction(chalk.bold('Issues'));
			this.currentUI = new IssuesUI(this.jumper, DIVS.ISSUES_UI, this.repoData);
		}
		this.currentUI.focus();
		this.currentUI.run();
	}

	setCurrentAction(string) {
		this.hr.getBlock('current-action').content(center(string, this.hr.width()));
	}

	async cdToReadme() {
		const readme = this.repoData.tree.allFiles.find(file => /^readme\.md/i.test(file.path));
		if (!readme) {
			this.currentUI.cd(this.repoData.tree.root);
		} else {
			this.currentUI.cdToFile(readme);
			if (!readme.content) {
				const content = await this.currentUI.loadFileContent(readme);
				readme.content = content;
			}
		}
	}

	onKeypress({ key }) {
		if (this.sidebarUI.isFocused && ['tab', 'escape'].includes(key.formatted)) {
			this.sidebarUI.close();
			this.sidebarUI.end(null, false);
			this.currentUI.focus();
			vats.emitEvent('state-change');
		} else if (!this.sidebarUI.isFocused && key.formatted === 'tab') {
			this.currentUI.unfocus();
			this.sidebarUI.open();
			this.sidebarUI.run().then(block => this.onSidebarAction(block));
			vats.emitEvent('state-change');
		}
	}

	onSidebarAction(block) {
		if (!block) {
			return vats.emitEvent('state-change');
		}

		this.sidebarUI.close();
		this.sidebarUI.end(null, false);
		this.currentUI.focus();

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
			this.currentUI.cd(this.repoData.tree.root);
		}

		this.jumper.render();
		vats.emitEvent('state-change');
	}

	async onBranchSelect({ branch }) {
		this.currentUI.end();
		await this.loadFiles(branch);
		vats.emitEvent('state-change');
	}

	destroy() {
		this.currentUI.destroy();
		this.sidebarUI.destroy();

		['sidebar-prompt', 'repo-name', 'hr'].forEach(id => {
			const div = this.jumper.getDivision(id);
			this.jumper.removeDivision(div);
			div.destroy();
		});

		this.currentUI = this.sidebarPrompt = this.sidebarUI = this.hr = null;
		this.repoName = this.repoData = this.figletName = null;

		super.destroy();
	}
};
