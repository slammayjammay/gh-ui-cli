const escapes = require('ansi-escapes');
const chalk = require('chalk');
const pad = require('./pad');
const vats = require('./vats');
const fetcher = require('./fetcher');
const BaseUI = require('./BaseUI');
const ViStateUI = require('./ViStateUI');

const PROMPT = 'Enter a repo name > ';

module.exports = class RepoSearchUI extends BaseUI {
	constructor() {
		super(...arguments);

		this.resolve = null;

		this.jumper.addDivision({ id: 'input', top: 0, left: 1, width: '100% - {input}l' });
		this.jumper.getDivision('input').addBlock(PROMPT, 'prompt');

		this.addVatsListener('keypress', 'onKeypress');

		this.resultsUI = new ViStateUI(this.jumper, {
			id: 'results',
			top: '{input}b + 1',
			left: '{input}l',
			width: '{input}w',
			height: '100%'
		});

		this.resultsUI.focus();
	}

	getViState() { return this.resultsUI.getViState(); }
	getSearchableItems() { return this.resultsUI.getSearchableItems(); }
	getSearchOptions() { return this.resultsUI.getSearchOptions(); }

	async run() {
		this.promptForSearchQuery().then(query => this.fetchRepos(query));
		return super.run();
	}

	async fetchRepos(query) {
		if (!query) {
			return this.end(false);
		}

		this.jumper.getBlock('input.prompt').content(`Searching for ${chalk.bold.blue(query)}...`);
		this.jumper.chain().appendToChain(this.jumper.getDivision('input').eraseString({
			startLeft: 0,
			startTop: 0
		})).render().execute();

		// const json = await fetcher.searchRepos(query, true);
		const json = await (await fetcher.searchRepos(query)).json();

		this.jumper.getBlock('input.prompt').content(`Showing results for ${chalk.bold.blue(query)}:`);

		const width = this.resultsUI.div.width();
		json.items.forEach(item => {
			const lines = [item.full_name];
			item.description && lines.push(`"${item.description.slice(0, 50)}"`);
			lines.push(`⭐${item.stargazers_count}`);
			lines.push(`⑂ ${item.forks_count}`);
			item.language && lines.push(`(${item.language})`);
			const text = lines.map(s => pad(s, width)).join('\n');
			this.resultsUI.addBlock(text + '\n').name = item.full_name;
		});
		this.resultsUI.sync();
		vats.emitEvent('state-change');
	}

	async promptForSearchQuery() {
		const eraseString = this.resultsUI.div.eraseString();

		this.resultsUI.div.reset();

		process.stdout.write(
			this.jumper.renderString() +
			this.jumper.jumpToString(0, 0)
		);

		process.stdout.write(escapes.cursorShow);
		const query = await vats.prompt({ prompt: PROMPT });
		process.stdout.write(escapes.cursorHide);

		return query;
	}

	onKeypress({ key }) {
		if (key.formatted === 'escape') {
			this.promptForSearchQuery().then(query => this.fetchRepos(query));
		} else if (key.formatted === 'return') {
			const repo = this.resultsUI.getSelectedBlock().name;
			this.jumper.getDivision('input').reset();
			this.resultsUI.div.reset();
			this.jumper.chain().render().jumpTo(0, 0).execute();
			this.end(repo.trim());
		}
	}

	destroy() {
		this.resultsUI.destroy();
		this.resultsUI = this.resolve = null;

		super.destroy();
	}
};
