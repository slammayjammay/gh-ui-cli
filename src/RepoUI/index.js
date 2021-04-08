const pad = require('../pad');
const vats = require('../vats');
const fetcher = require('../fetcher');
const colorscheme = require('../colorscheme');
const createFileTree = require('../create-file-tree');
const uiEndOnEscape = require('../uiEndOnEscape');
const BaseUI = require('../BaseUI');
const ViStateUI = require('../ViStateUI');
const ReadmeUI = require('./ReadmeUI');
const FileTreeUI = require('../FileTreeUI');
const BranchesUI = require('./BranchesUI');
const CommitsUI = require('./CommitsUI');
const IssuesUI = require('./IssuesUI');
const HorizontalBlock = require('../HorizontalBlock');

module.exports = class RepoUI extends BaseUI {
	constructor(jumper, repoName) {
		super(jumper);

		this.repoName = repoName;
		this.onFilesFetched = null;

		this.jumper.addDivision({ id: 'repo-name', top: 0, left: 1, width: '100% - 1' });
		this.jumper.getDivision('repo-name').addBlock(this.repoName + '\n', 'name');

		this.div = new HorizontalBlock(this.jumper, {
			id: 'repo-actions',
			top: '{repo-name}b',
			left: 1,
			width: '100%'
		});
		this.div.focus();

		// TODO: releases
		const actions = ['readme', 'files', 'branches', 'commits', 'issues'];
		actions.forEach(action => {
			const block = this.div.addBlock(` ${action} `);
			block.name = action;
		});

		this.addVatsListener('keybinding', 'onKeybinding');
	}

	getViState() {
		return this.div.state;
	}

	async run() {
		this.repoData = await (await fetcher.getRepo(this.repoName)).json();

		const block = this.jumper.getBlock('repo-name.name');
		block.content(`${this.repoName} (loading files...)`);

		this.onFilesFetched = fetcher.getFiles(this.repoData).then(res => res.json());
		this.onFilesFetched.then(json => {
			this.repoData.tree = createFileTree(json.tree);
			this.repoData.tree.allFiles = json.tree;
			block.content(this.repoName);
			this.jumper.render();
		});

		this.jumper.render();
		this.div.sync();
		vats.emitEvent('state-change');
	}

	onKeybinding({ kb }) {
		if (kb.action.name === 'return') {
			this.onFilesFetched.then(() => this.onTabClick());
		}
	}

	onTabClick() {
		const block = this.div.getSelectedBlock();
		const divOptions = {
			id: `repo-${block.name}`,
			top: '{repo-actions}b + 1',
			left: '{repo-actions}l',
			width: `100% - {repo-${block.name}}l`
		};

		const View = uiEndOnEscape({
			readme: ReadmeUI,
			files: FileTreeUI,
			branches: BranchesUI,
			commits: CommitsUI,
			issues: IssuesUI,
			// releases: ReleasesUI
		}[block.name]);

		const view = new View(this.jumper, divOptions, this.repoData);

		block.content(colorscheme.color(block.escapedText, 'inactive'));
		this.div.setContent();

		this.unfocus();
		this.div.unfocus();
		view.focus();
		view.run().then(() => {
			this.focus();
			this.div.focus();
			vats.emitEvent('state-change');
		});
	}
};
