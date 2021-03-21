const chalk = require('chalk');
const vats = require('./vats');
const fetcher = require('./fetcher');

module.exports = class RepoSearchUI {
	constructor(jumper) {
		this.jumper = jumper;

		this.onStateChange = this.onStateChange.bind(this);

		this.resultsDiv = this.jumper.addDivision({
			id: 'results',
			top: 1,
			left: 0,
			width: '100%',
			height: '100%'
		});

		this.state = {
			windowWidth: this.resultsDiv.width(),
			windowHeight: this.resultsDiv.height() - 1,
			documentWidth: 1,
			documentHeight: 1,
			cursorX: 0,
			cursorY: 0,
			scrollX: 0,
			scrollY: 0,
			lastCursorY: null
		};

		vats.options.getViState = () => this.state;
		vats.on('state-change', this.onStateChange);
	}

	async go() {
		this.resetResultsDiv();
		this.jumper.jumpTo(0, 0);
		const input = await vats.prompt({ prompt: 'Enter a repo name > ' });

		if (input) {
			const query = encodeURIComponent(input);

			// const res = await fetcher.fetch(`https://api.github.com/search/repositories?q=${query}`);
			// const json = await res.json();
			const json = require('./seeds/repo-search');

			this.resetResultsDiv();
			json.items.forEach(item => {
				const padded = this.pad(item.full_name, this.resultsDiv.width());
				this.resultsDiv.addBlock(padded);
			});
			this.state.documentHeight = json.items.length - 1;
			this.resultsDiv.render();
			this.jumper.jumpTo(`0`, `{results}t`);
			vats.emitEvent('state-change');
		} else {
			process.exit();
		}
	}

	resetResultsDiv() {
		this.resultsDiv.reset();
		this.state.documentHeight = 0;
	}

	onStateChange() {
		this.resultsDiv.scroll(0, this.state.scrollY);

		// un-highlight old
		if (typeof this.state.lastCursorY === 'number') {
			const block = this.resultsDiv.getBlock(this.resultsDiv.blockIds[this.state.lastCursorY]);
			block.content(block.escapedText);
		}

		// highlight selected
		const block = this.resultsDiv.getBlock(this.resultsDiv.blockIds[this.state.cursorY]);
		block.content(chalk.bgGreen.black(block.escapedText));
		this.state.lastCursorY = this.state.cursorY;

		process.stdout.write(
			this.resultsDiv.eraseString() +
			this.resultsDiv.renderString() +
			this.jumper.jumpToString(`0`, `{results}t + ${this.state.cursorY - this.state.scrollY}`)
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
