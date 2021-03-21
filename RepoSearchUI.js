const chalk = require('chalk');
const vats = require('./vats');
const fetcher = require('./fetcher');
const ViStateDiv = require('./ViStateDiv');

module.exports = class RepoSearchUI {
	constructor(jumper) {
		this.jumper = jumper;

		this.onStateChange = this.onStateChange.bind(this);

		const resultsDiv = this.jumper.addDivision({
			id: 'results',
			top: 1,
			left: 0,
			width: '100%',
			height: '100%'
		});

		this.resultsDiv = new ViStateDiv(resultsDiv);
		vats.options.getViState = () => this.resultsDiv.state;
		vats.on('state-change', this.onStateChange);
	}

	async go() {
		this.jumper.jumpTo(0, 0);
		const input = await vats.prompt({ prompt: 'Enter a repo name > ' });

		if (input) {
			const json = await fetcher.searchRepos(input, true);

			json.items.forEach(item => {
				const padded = this.pad(item.full_name, this.resultsDiv.div.width());
				this.resultsDiv.addBlock(padded);
			});

			this.resultsDiv.sync();

			process.stdout.write(
				this.resultsDiv.div.renderString() +
				this.jumper.jumpToString(`0`, `{results}t`)
			);

			vats.emitEvent('state-change');
		} else {
			process.exit();
		}
	}

	onStateChange({ previousState }) {
		this.resultsDiv.updateState();

		// un-highlight old
		if (previousState && previousState.cursorY !== this.resultsDiv.state.cursorY) {
			const block = this.resultsDiv.getBlockAtIdx(previousState.cursorY);
			block.content(block.escapedText);
		}

		// highlight selected
		const block = this.resultsDiv.getBlockAtIdx(this.resultsDiv.state.cursorY);
		block.content(chalk.bgGreen.black(block.escapedText));

		const cursorIdx = this.resultsDiv.state.cursorY - this.resultsDiv.state.scrollY;
		process.stdout.write(
			this.resultsDiv.div.eraseString() +
			this.resultsDiv.div.renderString() +
			this.jumper.jumpToString(`0`, `{results}t + ${cursorIdx}`)
		);
	}

	pad(string, maxWidth) {
		const diff = maxWidth - string.length;
		if (diff <= 0) {
			return string;
		}

		return `${string}${new Array(diff).fill(' ').join('')}`;
	}
};
