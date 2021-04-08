const escapes = require('ansi-escapes');
const chalk = require('chalk');
const vats = require('./vats');
const pad = require('./pad');
const BaseUI = require('./BaseUI');

module.exports = class CtrlPUI extends BaseUI {
	constructor(jumper, repoData) {
		super(jumper);
		this.repoData = repoData;

		this.currentIdx = 0;
		this.found = [];

		this.div = this.jumper.addDivision({
			id: 'ctrlp',
			left: 0,
			width: '100%',
			top: '100% - {ctrlp}h - 1'
		});

		const header = this.jumper.addDivision({
			id: 'ctrlp-header',
			top: '{ctrlp}t - 1',
			left: 0,
			width: '100%',
		});
		header.addBlock(chalk.bgWhite.bold.hex('000')(pad(this.repoData.full_name, header.width())));

		this.addVatsListener('keypress', 'onKeypress');
	}

	async run() {
		process.stdout.write(escapes.cursorShow + this.jumper.jumpTo(0, '{ctrlp}b'));
		vats.prompt({ enableKeypressEvents: true, prompt: '>>> ' }).then(input => {
			if (!input) {
				return this.end();
			}
			const file = this.found[this.div.blockIds.length - 1 - this.currentIdx];
			this.end(file);
		});
		process.nextTick(() => {
			this.updateResults(this.repoData.tree.allFiles.slice(0, 10));
			this.jumper.chain().appendToChain(this.div.eraseString({})).render().execute();
			this.renderResults();
		});

		return super.run();
	}

	end() {
		process.stdout.write(escapes.cursorHide);
		return super.end(...arguments);
	}

	onKeypress({ key }) {
		if (/up|down/.test(key.formatted)) {
			const idx = this.currentIdx + 1 * (key.formatted === 'up' ? 1 : -1);
			this.currentIdx = Math.max(0, Math.min(idx, this.found.length - 1));
			this.updateResults(this.found);
			this.renderResults();
		} else {
			this.currentIdx = 0;
			process.nextTick(() => this.runQuery());
		}
	}

	runQuery() {
		const query = vats.promptMode.getLine();
		const found = this.filter(this.repoData.tree.allFiles, query);
		this.updateResults(found);
		this.renderResults();
	}

	updateResults(items) {
		this.found = items;
		this.div.reset();

		if (items.length === 0) {
			this.div.addBlock(chalk.bgRed.bold.white(' == NO ENTRIES =='));
		} else {
			items.forEach((file, idx) => {
				let text = '> ' + file.path;
				if (idx === items.length - 1 - this.currentIdx) {
					text = chalk.underline(pad(text, this.div.width()));
				}
				this.div.addBlock(text).file = file;
			});
		}
	}

	renderResults() {
		this.jumper.chain().render();
		this.jumper.appendToChain(this.renderLineString());
		this.jumper.execute();
	}

	getFormattedLine() {
		const cursor = vats.promptMode.rl.cursor;
		const prompt = vats.promptMode.getPrompt();
		const line = vats.promptMode.getLine();

		if (cursor === line.length) {
			return `${prompt}${line}_`;
		}

		const formatted = line.slice(0, cursor) + chalk.underline(line[cursor]) + line.slice(cursor + 1);
		return prompt + formatted;
	}

	renderLineString(line = this.getFormattedLine()) {
		return this.jumper.jumpToString(0, '{ctrlp}b') +
			escapes.eraseLine + line +
			this.jumper.jumpToString(0, `{ctrlp}b - 1 - ${this.currentIdx}`);
	}

	filter(items, query, max = 10) {
		const found = [];
		// TODO: be smarter than this
		for (let i = 0, l = items.length; i < l; i++) {
			if (items[i].path.toLowerCase().includes(query.toLowerCase())) {
				found.push(items[i]);
			}
			if (found.length >= 10) {
				break;
			}
		}
		return found;
	}

	destroy() {
		process.stdout.write(this.renderLineString(''));

		const header = this.jumper.getDivision('ctrlp-header');
		this.jumper.removeDivision(header);
		this.jumper.removeDivision(this.div);
		header.destroy();
		this.div.destroy();
		this.div = this.currentIdx = this.found = null;

		return super.destroy();
	}
};
