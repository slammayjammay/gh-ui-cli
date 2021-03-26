const chalk = require('chalk');
const vats = require('./vats');

module.exports = class ViStateDiv {
	constructor(div) {
		this.div = div;

		this.state = {
			windowWidth: 1,
			windowHeight: 1,
			documentWidth: 1,
			documentHeight: 1,
			cursorX: 0,
			cursorY: 0,
			scrollX: 0,
			scrollY: 0
		};

		this.currentIdx = 0;
	}

	addBlock(text, id, idx) {
		id = id || `block-${this.div.blockIds.length}`;
		return this.div.addBlock(text, id, idx);
	}

	getSelectedBlock() {
		return this.getBlockAtIdx(this.currentIdx);
	}

	getBlockAtIdx(idx) {
		return this.div.getBlock(this.div.blockIds[idx]);
	}

	sync() {
		this.state.windowWidth = this.div.width() - 1;
		this.state.windowHeight = this.div.height() - 1;
		// this.state.documentWidth = 'todo';
		this.state.documentHeight = this.div.blockIds.slice(0, -1).reduce((accum, id) => {
			return accum + this.div.getBlock(id).height();
		}, 0);

		vats.viStateHandler.clampState(this.state);
	}

	// TODO: rename onStateChange
	onStateChange(previousState) {
		// un-highlight old
		if (previousState && previousState.cursorY !== this.state.cursorY) {
			const block = this.getSelectedBlock();
			block.content(block.escapedText);
			this.calculateIdxFromState(this.state, previousState);
		}

		// highlight selected
		const block = this.getSelectedBlock();
		block.content(chalk.bgGreen.bold.hex('000')(block.escapedText));

		this.div.scroll(this.state.scrollX, this.state.scrollY);
		if (this.state.cursorY - this.state.scrollY + block.height() > this.state.windowHeight) {
			this.div.scrollY(this.state.scrollY + block.height() - 1);
		}
	}

	adjustKbForMultiLine(kb) {
		const dir = kb.action.name.includes('down') ? 1 : -1;
		const targetIdx = Math.max(0 , Math.min(this.currentIdx + kb.count * dir, this.div.blockIds.length));
		const fromTo = [this.currentIdx, targetIdx];
		const ids = this.div.blockIds.slice(...(dir > 0 ? fromTo : fromTo.reverse()));
		kb.count = ids.reduce((accum, id) => accum + this.div.getBlock(id).height(), 0);
	}

	calculateIdxFromState(state, previousState) {
		const diffY = this.state.cursorY - previousState.cursorY;
		const isBackward = diffY < 0;

		let i = 0;
		let accum = 0;
		for (let l = this.div.blockIds.length - 1; i < l; i++) {
			if (accum >= state.cursorY) {
				break;
			}
			accum += this.getBlockAtIdx(i).height();
		}
		const targetIdx = i;

		const fromTo = [this.currentIdx, targetIdx];
		const ids = this.div.blockIds.slice(...(isBackward ? fromTo.reverse() : fromTo));

		const height = ids.reduce((accum, id) => {
			return this.div.getBlock(id).height() + accum;
		}, 0);

		this.currentIdx = targetIdx;
	}

	destroy() {
		this.div.jumper.removeDivision(this.div);
		this.div.destroy();
		this.div = this.viState = this.currentIdx = null;
	}
};
