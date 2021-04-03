const stringWidth = require('string-width');
const TextBlock = require('../../terminal-jumper/src/TextBlock');
const vats = require('./vats');
const colorscheme = require('./colorscheme');
const ViStateUI = require('./ViStateUI');

// hack because TerminalJumper doesn't allow horizontal blocks
module.exports = class HorizontalBlock extends ViStateUI {
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
		this.currentIdx = Math.max(0, Math.min(this.currentIdx, this.state.cursorX))
	}

	onKeybinding({ kb }) {
		if (['cursor-left', 'cursor-right'].includes(kb.action.name)) {
			this.adjustKbForHorizontal(kb);
		}
	}

	onStateChange({ previousState }) {
		// un-highlight old
		if (previousState && previousState.cursorX !== this.state.cursorX) {
			const block = this.getSelectedBlock();
			block.content(colorscheme.colorBlock(block, 'default'));
			this.currentIdx = this.calculateIdxFromState(this.state, previousState);
		}

		// highlight selected
		const block = this.getSelectedBlock();
		block.content(colorscheme.colorBlock(block, 'highlight'));
		this.setContent();

		this.jumper.render();
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

		return targetIdx;
	}
};
