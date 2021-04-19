import chalk from 'chalk';
import ViStateUI from './ViStateUI.js';

export default class DialogUI extends ViStateUI {
	toggle() {
		this.isFocused ? this.close() : this.open();
	}

	open() {
		this.jumper.addDivision(this.div);
		this.drawBackground();
		this.focus();
	}

	close() {
		this.jumper.removeDivision(this.div);
		this.unfocus();
	}

	drawBackground() {
		const fn = () => {
			const { id } = this.div.options;
			this.jumper.renderInjects.set(`${id}:before:bg`, fn);

			return this.jumper.fillRectString(
				`{${id}}l`, `{${id}}t`, `{${id}}w`, `{${id}}h`, chalk.bgHex('#0d1117')(' ')
			);
		};

		fn();
	}

	onKeybinding({ kb }) {
		super.onKeybinding(...arguments);

		if (kb.action.name === 'return') {
			this.end(this.getSelectedBlock(), false);
		}
	}
};
