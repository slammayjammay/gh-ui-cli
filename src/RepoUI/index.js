const chalk = require('chalk');
const pad = require('../pad');
const vats = require('../vats');
const fetcher = require('../fetcher');
const uiEndOnEscape = require('../uiEndOnEscape');
const BaseUI = require('../BaseUI');
const ReadmeUI = require('./ReadmeUI');
const BranchesUI = require('./BranchesUI');
const CommitsUI = require('./CommitsUI');
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
				branches: BranchesUI,
				commits: CommitsUI,
				// issues: IssuesUI,
				// releases: ReleasesUI
			}[block.name]);

			const view = new View(this.jumper, {
				id: `repo-${block.name}`,
				top: '{repo-actions}b + 1',
				left: '{repo-actions}l',
				width: '100% - {repo-actions}l'
			}, this.repoData);

			block.content(chalk.bgGray.bold.hex('000')(block.escapedText));
			this.currentDiv.setContent();

			this.unfocus();
			view.focus();
			view.run().then(() => {
				this.focus();
				vats.emitEvent('state-change');
			});
		}
	}
};
