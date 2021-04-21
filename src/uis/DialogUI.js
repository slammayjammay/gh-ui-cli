import chalk from 'chalk';
import map from '../map.js';
import jumper from '../jumper.js';
import center from '../utils/center.js';
import ViStateUI from './ViStateUI.js';

const DEFAULTS = {
	colorDefault: text => chalk.bgHex('#0d1117').blue.bold(text),
	colorHighlight: text => chalk.white.bold.bgHex('#21262d')(text),
	colorHeader: text => chalk.bgBlue.bold.hex('#000')(text)
};

export default class DialogUI extends ViStateUI {
	constructor(divOptions, options = {}) {
		options = { ...DEFAULTS, ...options };
		super(divOptions, options);
		this.headerDiv = null;
		this.addVatsListener('keypress', 'onKeypress');
	}

	addHeader(text, options = { id: 'dialog-header' }) {
		this.headerDiv = jumper.addDivision({
			id: 'dialog-header',
			top: `{${this.div.options.id}}t - {${options.id}}h`,
			left: `{${this.div.options.id}}l`,
			width: `{${this.div.options.id}}w`,
			...options
		});
		text = center(text, this.headerDiv.width());
		this.headerDiv.addBlock(this.options.colorHeader(text));
	}

	toggle() {
		this.isFocused ? this.close() : this.open();
	}

	open() {
		jumper.addDivision(this.div);
		this.headerDiv && jumper.addDivision(this.headerDiv);
		this.drawBackground();
		this.focus();
	}

	close() {
		jumper.removeDivision(this.div);
		this.headerDiv && jumper.removeDivision(this.headerDiv);
	}

	drawBackground() {
		const fn = () => {
			const { id } = this.div.options;
			jumper.renderInjects.set(`${id}:before:bg`, fn);

			return jumper.fillRectString(
				`{${id}}l`, `{${id}}t`, `{${id}}w`, `{${id}}h`, chalk.bgHex('#0d1117')(' ')
			);
		};

		fn();
	}

	onKeypress({ key }) {
		if (key.formatted === 'escape') {
			this.end();
		} else if (key.formatted === 'return') {
			this.end(this.getSelectedBlock());
		}
	}

	end() {
		this.close();
		return super.end(...arguments);
	}

	destroy() {
		if (this.headerDiv) {
			jumper.removeDivision(this.headerDiv);
			this.headerDiv.destroy();
			this.headerDiv = null;
		}
		super.destroy();
	}
};
