const escapes = require('ansi-escapes');
const pad = require('./pad');
const vats = require('./vats');
const fetcher = require('./fetcher');
const ViStateDiv = require('./ViStateDiv');

const PROMPT = 'Enter a repo name > ';

module.exports = class RepoSearchUI {
	constructor(jumper) {
		this.jumper = jumper;

		this.onKeypress = this.onKeypress.bind(this);
		this.onStateChange = this.onStateChange.bind(this);

		this._resolve = null;

		this.jumper.addDivision({ id: 'input', top: 0, left: 0, width: '100%' });
		this.jumper.getDivision('input').addBlock(PROMPT);

		const resultsDiv = this.jumper.addDivision({
			id: 'results',
			top: 1,
			left: 0,
			width: '100%',
			height: '100%'
		});

		this.resultsDiv = new ViStateDiv(resultsDiv);

		vats.on('keypress', this.onKeypress);
		vats.on('state-change', this.onStateChange);
	}

	getState() {
		return this.resultsDiv.state;
	}

	async run() {
		const query = await this.promptForSearchQuery();
		if (!query) {
			return '';
		}

		const json = await fetcher.searchRepos(query, true);

		json.items.forEach(item => {
			const padded = pad(item.full_name, this.resultsDiv.div.width());
			this.resultsDiv.addBlock(padded);
		});

		this.resultsDiv.sync();

		process.stdout.write(
			this.jumper.renderString() +
			this.jumper.jumpToString(`0`, `{results}t`)
		);

		vats.emitEvent('state-change');

		return new Promise(resolve => this._resolve = resolve);
	}

	async promptForSearchQuery() {
		const eraseString = this.resultsDiv.div.eraseString();

		this.resultsDiv.div.reset();

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
			this.promptForSearchQuery();
		} else if (key.formatted === 'return') {
			const repo = this.resultsDiv.getSelectedBlock().escapedText;
			this.jumper.getDivision('input').reset();
			this.resultsDiv.div.reset();
			this.jumper.chain().render().jumpTo(0, 0).execute();
			this.end(repo.trim());
		}
	}

	onStateChange({ previousState }) {
		this.resultsDiv.onStateChange(previousState);

		const cursorIdx = this.getState().cursorY;
		process.stdout.write(
			this.jumper.renderString() +
			this.jumper.jumpToBlockString(`results.block-${cursorIdx}`, 0, 0)
		);
	}

	end(data) {
		this._resolve(data);
		this.jumper.erase();
		this.destroy();
	}

	destroy() {
		vats.removeListener('keypress', this.onKeypress);
		vats.removeListener('state-change', this.onStateChange);

		this.resultsDiv.destroy();
		this.jumper = this.resultsDiv = this._resolve = null;
	}
};
