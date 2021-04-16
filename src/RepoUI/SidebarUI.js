const chalk = require('chalk');
const pad = require('../pad');
const ViStateUI = require('../ViStateUI');

module.exports = class SidebarUI extends ViStateUI {
	constructor() {
		super(...arguments);

		const actions = ['Files', 'Branches', 'Commits', 'Issues', 'Code search', 'Repo search'];

		const width = this.div.width();
		actions.forEach(string => {
			const block = this.addBlock(this.options.colorDefault(pad(` ${string} `, width)));
			block.name = string.toLowerCase();
		});
		this.sync();

		this.addVatsListener('keypress', 'onKeypress');
	}

	isOpen() {
		return this.jumper.hasDivision(this.div.options.id);
	}

	toggle() {
		this.isOpen() ? this.close() : this.open();
	}

	open() {
		this.jumper.addDivision(this.div);
		this.drawBackground();
	}

	close() {
		this.jumper.removeDivision(this.div);
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

	onKeypress({ key }) {
		if (key.formatted === 'enter') {
			this.end(this.getSelectedBlock.name);
		}
	}
};
