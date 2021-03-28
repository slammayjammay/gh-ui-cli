const escapes = require('ansi-escapes');
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

		this.jumper.addDivision({ id: 'input', top: 0, left: 0, width: '100%' });
		this.jumper.getDivision('input').addBlock(PROMPT);

		this.addVatsListener('keypress', 'onKeypress');

		this.resultsUI = new ViStateUI(this.jumper, {
			id: 'results',
			top: 1,
			left: 0,
			width: '100%',
			height: '100%'
		});

		this.resultsUI.focus();
	}

	getState() {
		return this.resultsUI.state;
	}

	async run() {
		const query = await this.promptForSearchQuery();
		if (!query) {
			return '';
		}

		const json = await fetcher.searchRepos(query, true);

		json.items.forEach(item => {
			const padded = pad(item.full_name, this.resultsUI.div.width());
			this.resultsUI.addBlock(padded);
		});

		this.resultsUI.sync();

		process.stdout.write(
			this.jumper.renderString() +
			this.jumper.jumpToString(`0`, `{results}t`)
		);

		vats.emitEvent('state-change');

		return super.run();
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
			// TODO
			// this.promptForSearchQuery();
		} else if (key.formatted === 'return') {
			const repo = this.resultsUI.getSelectedBlock().escapedText;
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
