const stringWidth = require('string-width');
const TextBlock = require('../../terminal-jumper/src/TextBlock');
const ViStateDiv = require('./ViStateDiv');
const chalk = require('chalk');
const vats = require('./vats');

// hack because TerminalJumper doesn't allow horizontal blocks
module.exports = class HorizontalBlock extends ViStateDiv {
	constructor() {
		super(...arguments);
		this.blocks = [];
		this.block = this.div.addBlock('', 'block');
	}

	addBlock(text, id, idx = this.blocks.length) {
		const block = new TextBlock(text);
		this.blocks.splice(idx, 0, block);
		this.setContent();
		return block;
	}

	getSelectedBlock() {
		return this.blocks[this.currentIdx];
	}

	setContent() {
		this.block.content(this.blocks.map(block => block.text).join(''));
	}

	sync() {
		this.state.windowWidth = this.div.width() - 1;
		this.state.windowHeight = 1;
		this.state.documentWidth = this.blocks.slice(0, -1).reduce((accum, block) => {
			return accum + block.escapedText.length;
		}, 0);
		this.state.documentHeight = 1;

		vats.viStateHandler.clampState(this.state);
	}

	onStateChange(previousState) {
		// un-highlight old
		if (previousState && previousState.cursorX !== this.state.cursorX) {
			this.getSelectedBlock().content(this.getSelectedBlock().escapedText);
			this.calculateIdxFromState(this.state, previousState);
		}

		// highlight selected
		const block = this.getSelectedBlock();
		block.content(chalk.bgGreen.bold.hex('000')(block.escapedText));
		this.setContent();

		// this.div.scroll(this.state.scrollX, this.state.scrollY);
		// if (this.state.cursorY - this.state.scrollY + block.height() > this.state.windowHeight) {
		// 	this.div.scrollY(this.state.scrollY + block.height() - 1);
		// }
	}

	adjustKbForHorizontal(kb) {
		const dir = kb.action.name.includes('right') ? 1 : -1;
		const targetIdx = Math.max(0 , Math.min(this.currentIdx + kb.count * dir, this.blocks.length));
		const fromTo = [this.currentIdx, targetIdx];
		const blocks = this.blocks.slice(...(dir > 0 ? fromTo : fromTo.reverse()));
		kb.count = blocks.reduce((accum, block) => accum + block.escapedText.length, 0);
	}

	calculateIdxFromState(state, previousState) {
		const diffX = state.cursorX - previousState.cursorX;
		const isBackward = diffX < 0;

		let i = 0;
		let accum = 0;
		for (let l = this.blocks.length - 1; i < l; i++) {
			if (accum >= state.cursorX) {
				break;
			}
			accum += this.blocks[i].escapedText.length;
		}
		const targetIdx = i;

		const fromTo = [this.currentIdx, targetIdx];
		const blocks = this.blocks.slice(...(isBackward ? fromTo.reverse() : fromTo));

		const height = blocks.reduce((accum, block) => {
			return accum + this.blocks[i].escapedText.length;
		}, 0);

		this.currentIdx = targetIdx;
	}
};
