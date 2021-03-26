const pad = require('./pad');
const vats = require('./vats');
const fetcher = require('./fetcher');
const ViStateDiv = require('./ViStateDiv');

module.exports = class RepoUI {
	constructor(jumper, repoName) {
		this.jumper = jumper;
		this.repoName = repoName;

		this.onKeypress = this.onKeypress.bind(this);
		this.onKeybinding = this.onKeybinding.bind(this);
		this.onStateChange = this.onStateChange.bind(this);

		this.jumper.addDivision({ id: 'repo-name', top: 0, left: 0, width: '100%' });
		this.jumper.getDivision('repo-name').addBlock(this.repoName + '\n');

		const actionsDiv = this.jumper.addDivision({
			id: 'repo-actions',
			top: '{repo-name}b',
			left: 0,
			width: 'min(30, 30%)'
		});

		this.actionsDiv = new ViStateDiv(actionsDiv);
		this.currentDiv = this.actionsDiv;

		const actions = ['readme', 'files', 'branches', 'commits', 'issues', 'releases'];
		actions.forEach(action => {
			const width = this.actionsDiv.div.width();
			const block = this.actionsDiv.addBlock(pad(action, width));
			block.name = action;
		});

		vats.on('keypress', this.onKeypress);
		vats.on('keybinding', this.onKeybinding);
		vats.on('state-change', this.onStateChange);
	}

	getState() {
		return this.currentDiv.state;
	}

	async run() {
		const [res1, res2] = await Promise.all([
			fetcher.getRepo(this.repoName),
			fetcher.getFile(this.repoName, 'README.md')
		]);

		[this.repoData, this.readmeData] = await Promise.all([
			res1.json(),
			res2.json()
		]);

		this.jumper.render();
		this.actionsDiv.sync();
		vats.emitEvent('state-change');
	}

	onKeypress() {
		const view = this.currentDiv.div.options.id;

		if (view === 'repo-actions') {
			this.onActionsKeypress(...arguments);
		} else if (view === 'repo-branches') {
			this.onBranchesKeypress(...arguments);
		} else if (view === 'repo-commits') {
			this.onCommitsKeypress(...arguments);
		}
	}

	onKeybinding({ kb }) {
		const isVertical = ['cursor-up', 'cursor-down'].includes(kb.action.name);
		if (this.currentDiv === this.commitsDiv && isVertical) {
			this.currentDiv.adjustKbForMultiLine(kb);
		}
	}

	onActionsKeypress({ key }) {
		if (key.formatted === 'return') {
			const block = this.currentDiv.getSelectedBlock();
			if (block.name === 'branches') {
				this.showBranches();
			} else if (block.name === 'commits') {
				this.showCommits();
			}
		}
	}

	onStateChange({ previousState }) {
		this.currentDiv.onStateChange(previousState);

		const cursorIdx = this.currentDiv.currentIdx;
		const id = this.currentDiv.div.options.id;
		process.stdout.write(this.jumper.renderString());
	}

	async showBranches() {
		this.branchesDiv = new ViStateDiv(this.jumper.addDivision({
			id: 'repo-branches',
			top: '{repo-name}b',
			left: '{repo-actions}r + 1',
			width: '100% - {repo-branches}l'
		}));
		this.currentDiv = this.branchesDiv;

		const url = this.repoData.branches_url.replace('{/branch}', '');
		const branches = await (await fetcher.fetch(url)).json();

		branches.forEach(({ name }) => this.branchesDiv.addBlock(name));

		this.jumper.render();
		this.branchesDiv.sync();
		vats.emitEvent('state-change');
	}

	async showCommits() {
		this.commitsDiv = new ViStateDiv(this.jumper.addDivision({
			id: 'repo-commits',
			top: '{repo-name}b',
			left: '{repo-actions}r + 1',
			width: '100% - {repo-commits}l'
		}));
		this.currentDiv = this.commitsDiv;

		const url = this.repoData.commits_url.replace('{/sha}', '');
		const commits = await (await fetcher.fetch(url)).json();

		commits.forEach(({ commit }) => {
			const text = [commit.message, commit.author.name, commit.author.date].map(string => {
				return pad(string, this.commitsDiv.div.width());
			}).join('\n');
			this.commitsDiv.addBlock(text + '\n');
		});

		this.jumper.render();
		this.commitsDiv.sync();
		vats.emitEvent('state-change');
	}

	onBranchesKeypress({ key }) {
		if (key.formatted === 'escape') {
			this.branchesDiv.destroy();
			this.branchesDiv = null;
			this.currentDiv = this.actionsDiv;
			vats.emitEvent('state-change');
		} else if (key.formatted === 'return') {
			const block = this.currentDiv.getSelectedBlock();
			console.log(`You selected branch "${block.name}".`);
		}
	}

	onCommitsKeypress({ key }) {
		if (key.formatted === 'escape') {
			this.commitsDiv.destroy();
			this.commitsDiv = null;
			this.currentDiv = this.actionsDiv;
			vats.emitEvent('state-change');
		}
	}
};
