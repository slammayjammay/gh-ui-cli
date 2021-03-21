const vats = require('./vats');

module.exports = class ViStateDiv {
	constructor(div, state) {
		this.div = div;
		this.state = {
			windowWidth: this.div.width(),
			windowHeight: this.div.height() - 1,
			documentWidth: 1,
			documentHeight: 1,
			cursorX: 0,
			cursorY: 0,
			scrollX: 0,
			scrollY: 0,

			...state
		};
	}

	addBlock(text, id, idx) {
		id = id || `block-${this.div.blockIds.length}`;
		return this.div.addBlock(text, id, idx);
	}

	getBlockAtIdx(idx) {
		return this.div.getBlock(this.div.blockIds[idx]);
	}

	sync() {
		this.state.windowWidth = this.div.width() - 1;
		this.state.windowHeight = this.div.height() - 1;
		// this.state.documentWidth = 'idk';
		this.state.documentHeight = this.div.blockIds.length - 1;
		vats.viStateHandler.clampState(this.state);
	}

	updateState() {
		this.div.scroll(this.state.scrollX, this.state.scrollY);
	}
};
