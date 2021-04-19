import escapes from 'ansi-escapes';
import chalk from 'chalk';
import stringWidth from 'string-width';
import sliceAnsi from 'slice-ansi';

const DEFAULTS = {
	interval: 40,
	highlight: chalk.bold
};

export default class Loader {
	constructor(text, options = {}) {
		this.reset(text, options);
	}

	reset(text, options = {}) {
		this.text = text;
		this.options = { ...DEFAULTS, ...options };
		this.length = stringWidth(this.text);
		this.id = null;
		this.idx = 0;
	}

	play() {
		process.stdout.write(escapes.cursorSavePosition);
		this.id = setInterval(() => this.render(), this.options.interval);
	}

	render() {
		const string = this.getString(this.text, this.idx, this.length);
		this.idx = (this.idx + 1) % this.length;

		process.stdout.write(escapes.cursorRestorePosition + string);
	}

	getString(text, idx, length) {
		return [
			sliceAnsi(text, 0, idx),
			this.options.highlight(sliceAnsi(text, idx, idx + 1)),
			sliceAnsi(text, idx + 1)
		].join('');
	}

	end(shouldDestroy = true) {
		clearInterval(this.id);
		const erase = new Array(this.length).fill(' ').join('');
		process.stdout.write(escapes.cursorRestorePosition + erase);
		shouldDestroy && this.destroy();
	}

	destroy() {
		this.text = this.options = this.length = this.id = this.idx = null;
	}
}
