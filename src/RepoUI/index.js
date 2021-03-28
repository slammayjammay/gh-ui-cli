const chalk = require('chalk');
const pad = require('../pad');
const vats = require('../vats');
const fetcher = require('../fetcher');
const uiEndOnEscape = require('../uiEndOnEscape');
const BaseUI = require('../BaseUI');
const ReadmeUI = require('./ReadmeUI');
const ViStateUI = require('../ViStateUI');
const HorizontalBlock = require('../HorizontalBlock');

module.exports = class RepoUI extends BaseUI {
	constructor(jumper, repoName) {
		super(jumper);

		this.repoName = repoName;

		this.jumper.addDivision({ id: 'repo-name', top: 0, left: 1, width: '100% - 1' });
		this.jumper.getDivision('repo-name').addBlock(this.repoName + '\n');

		this.currentDiv = this.actionsDiv = new HorizontalBlock(this.jumper, {
			id: 'repo-actions',
			top: '{repo-name}b',
			left: 0,
			width: '100%'
		});
		this.currentDiv.focus();

		const actions = ['readme', 'files', 'branches', 'commits', 'issues', 'releases'];
		actions.forEach(action => {
			const block = this.actionsDiv.addBlock(` ${action} `);
			block.name = action;
		});

		this.addVatsListener('keypress', 'onKeypress');
	}

	getState() {
		return this.currentDiv.state;
	}

	async run() {
		this.repoData = await (await fetcher.getRepo(this.repoName)).json();

		this.jumper.render();
		this.actionsDiv.sync();
		vats.emitEvent('state-change');
	}

	onKeypress({ key }) {
		if (key.formatted === 'return') {
			const block = this.currentDiv.getSelectedBlock();

			const View = uiEndOnEscape({
				readme: ReadmeUI,
				// branches: BranchesUI,
				// commits: CommitsUI,
				// issues: IssuesUI,
				// releases: ReleasesUI
			}[block.name]);

			const view = new View(this.jumper, {
				id: `repo-${block.name}`,
				top: '{repo-actions}b + 2',
				left: '{repo-actions}l',
				width: '100% - {repo-actions}l'
			}, this.repoName);

			block.content(chalk.bgGray.bold.hex('000')(block.escapedText));
			this.currentDiv.setContent();

			this.unfocus();
			view.focus();
			view.run().then(() => {
				this.focus();
				vats.emitEvent('state-change');
			});
		}

		// const view = this.currentDiv.div.options.id;

		// if (view === 'repo-actions') {
		// 	this.onActionsKeypress(...arguments);
		// } else if (view === 'repo-branches') {
		// 	this.onBranchesKeypress(...arguments);
		// } else if (view === 'repo-commits') {
		// 	this.onCommitsKeypress(...arguments);
		// }
	}

	// onActionsKeypress({ key }) {
	// 	if (key.formatted === 'return') {
	// 		const block = this.currentDiv.getSelectedBlock();
	// 		block.content(chalk.bgGray.bold.hex('000')(block.escapedText));
	// 		this.currentDiv.setContent();

	// 		if (block.name === 'branches') {
	// 			this.showBranches();
	// 		} else if (block.name === 'commits') {
	// 			this.showCommits();
	// 		}
	// 	}
	// }

	// async showBranches() {
	// 	this.branchesDiv = new ViStateUI(this.jumper.addDivision({
	// 		id: 'repo-branches',
	// 		top: '{repo-actions}b + 1',
	// 		left: '0',
	// 		width: '100% - {repo-branches}l'
	// 	}));
	// 	this.currentDiv = this.branchesDiv;

	// 	const url = this.repoData.branches_url.replace('{/branch}', '');
	// 	const branches = await (await fetcher.fetch(url)).json();

	// 	branches.forEach(({ name }) => this.branchesDiv.addBlock(name));

	// 	this.jumper.render();
	// 	this.branchesDiv.sync();
	// 	vats.emitEvent('state-change');
	// }

	// async showCommits() {
	// 	this.commitsDiv = new ViStateUI(this.jumper.addDivision({
	// 		id: 'repo-commits',
	// 		top: '{repo-actions}b + 1',
	// 		left: '0',
	// 		width: '100% - {repo-commits}l'
	// 	}));
	// 	this.currentDiv = this.commitsDiv;

	// 	const url = this.repoData.commits_url.replace('{/sha}', '');
	// 	const commits = await (await fetcher.fetch(url)).json();

	// 	commits.forEach(({ commit }) => {
	// 		const text = [commit.message, commit.author.name, commit.author.date].map(string => {
	// 			return pad(string, this.commitsDiv.div.width());
	// 		}).join('\n');
	// 		this.commitsDiv.addBlock(text + '\n');
	// 	});

	// 	this.jumper.render();
	// 	this.commitsDiv.sync();
	// 	vats.emitEvent('state-change');
	// }

	// onBranchesKeypress({ key }) {
	// 	if (key.formatted === 'escape') {
	// 		this.branchesDiv.destroy();
	// 		this.branchesDiv = null;
	// 		this.currentDiv = this.actionsDiv;
	// 		vats.emitEvent('state-change');
	// 	} else if (key.formatted === 'return') {
	// 		const block = this.currentDiv.getSelectedBlock();
	// 		console.log(`You selected branch "${block.name}".`);
	// 	}
	// }

	// onCommitsKeypress({ key }) {
	// 	if (key.formatted === 'escape') {
	// 		this.commitsDiv.destroy();
	// 		this.commitsDiv = null;
	// 		this.currentDiv = this.actionsDiv;
	// 		vats.emitEvent('state-change');
	// 	}
	// }
};
