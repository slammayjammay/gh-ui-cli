const chalk = require('chalk');

class Colorscheme {
	constructor() {
		this.map = new Map([
			['default', chalk.white],
			['highlight', chalk.bgWhite.bold.hex('000')],
			['folder', chalk.bold.green],
			['folder-highlight', chalk.bgGreen.bold.hex('000')],
			['inactive', chalk.bgGray.bold.hex('000')]
		]);
	}

	color(text, type) {
		return this.map.get(type)(text);
	}

	colorBlock(block, type) {
		if (block.file && block.file.type === 'tree') {
			return this.color(block.escapedText, type === 'default' ? 'folder' : 'folder-highlight');
		} else {
			return this.color(block.escapedText, type);
		}
	}
}

module.exports = new Colorscheme();
