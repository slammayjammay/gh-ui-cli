const chalk = require('chalk');
const escapes = require('ansi-escapes');
const fetcher = require('../fetcher');
const BaseUI = require('../BaseUI');

module.exports = class ReadmeUI extends BaseUI {
	constructor(jumper, divOptions, repoName) {
		super(jumper);
		this.repoName = repoName;

		this.div = this.jumper.addDivision({
			scrollBarY: { foreground: chalk.bgWhite(' '), background: ' ' },
			...divOptions,
			left: `${divOptions.left} + 1`,
			width: `min(100%, 80) - 1`,
			height: `min({${divOptions.id}}nh, 100% - {${divOptions.id}}t - 1)`
		});

		this.drawBorders();

		this.addVatsListener('keybinding', 'onKeybinding');
	}

	async run() {
		this.data = await (await fetcher.getFile(this.repoName, 'README.md')).json();

		const text = Buffer.from(this.data.content, this.data.encoding).toString();
		this.div.addBlock(text, 'readme');

		return super.run(...arguments);
	}

	drawBorders() {
		const { id } = this.div.options;
		this.jumper.renderInjects.set(`${id}:before:borders`, () => {
			this.drawBorders();
			return this.bordersString();
		});
	}

	bordersString() {
		const { id } = this.div.options;

		const width = this.jumper.evaluate(`{${id}}w + 2`);
		const height = this.jumper.evaluate(`{${id}}h + 2`);
		const borderTop = chalk.bgGray(new Array(width).fill(' ').join(''));
		const borderSide = chalk.bgGray(new Array(height).fill(' ').join(escapes.cursorMove(-1, 1)));

		this.jumper.chain();
		this.jumper.jumpTo(`{${id}}l - 1`, `{${id}}t - 1`);
		this.jumper.appendToChain(borderTop);
		this.jumper.jumpTo(`{${id}}l - 1`, `{${id}}t - 1`);
		this.jumper.appendToChain(borderSide);
		this.jumper.jumpTo(`{${id}}r`, `{${id}}t - 1`);
		this.jumper.appendToChain(borderSide);
		this.jumper.jumpTo(`{${id}}l - 1`, `{${id}}b`);
		this.jumper.appendToChain(borderTop);
		this.jumper.execute();
	}

	onKeybinding({ kb }) {
		if (/cursor-(up|down)/.test(kb.action.name)) {
			const dir = kb.action.name.includes('down') ? 1 : -1;
			this.div.scrollDown(dir * kb.count);
			this.jumper.render();
		} else if (/cursor-(left|right)/.test(kb.action.name)) {
			const dir = kb.action.name.includes('right') ? 1 : -1;
			this.div.scrollRight(dir * kb.count);
			this.jumper.render();
		}
	}

	end() {
		this.jumper.renderInjects.delete(`${this.div.options.id}:before:borders`);
		this.div.erase({
			startLeft: this.div.left() - 1,
			startTop: this.div.top() - 1,
			width: this.div.width() + 2,
			height: this.div.height() + 2
		});

		return super.end(...arguments);
	}

	destroy() {
		this.jumper.removeDivision(this.div);
		this.div.destroy();
		super.destroy();
	}
};
