import vats from './vats.js';
import colorscheme from './colorscheme.js';
import BaseUI from './BaseUI.js';

const DEFAULTS = {
	colorDefault: text => colorscheme.color(text, 'default'),
	colorHighlight: text => colorscheme.color(text, 'highlight')
};

export default class ViStateUI extends BaseUI {
	constructor(jumper, divOptions, options = {}) {
		super(jumper);

		this.div = this.jumper.addDivision(divOptions);
		this.options = { ...DEFAULTS, ...options };

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
		this.blocks = [];

		this.addVatsListener('keybinding', 'onKeybinding');
		this.addVatsListener('state-change', 'onStateChange');
		this.addVatsListener('search', 'onSearch');
	}

	getViState() {
		return this.state;
	}

	getSearchableItems() {
		if (!this.blocks) {
			this.blocks = this.div.blockIds.map(id => this.div.getBlock(id));
		}

		return this.blocks;
	}

	getSearchOptions() {
		return {
			useCache: true,
			startItemIndex: this.currentIdx,
			testFn: (block, query) => {
				return block.escapedText.toLowerCase().includes(query.toLowerCase());
			}
		};
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
		this.state.documentWidth = 1;
		this.state.documentHeight = this.div.blockIds.slice(0, -1).reduce((accum, id) => {
			return accum + this.div.getBlock(id).height();
		}, 0);

		vats.viStateHandler.clampState(this.state);
		this.currentIdx = Math.max(0, Math.min(this.currentIdx, this.state.cursorY))

		this.blocks = this.div.blockIds.map(id => this.div.getBlock(id));
	}

	setSelectedBlock(idx) {
		this.currentIdx = idx;

		this.state.cursorY = this.div.blockIds.slice(0, idx).reduce((accum, id) => {
			return accum + this.div.getBlock(id).height();
		}, 0);

		vats.viStateHandler.clampState(this.state);
	}

	onKeybinding({ kb }) {
		if (['cursor-up', 'cursor-down'].includes(kb.action.name)) {
			this.adjustKbForMultiLine(kb);
		}
	}

	onStateChange({ previousState }) {
		if (previousState && previousState.cursorY === this.state.cursorY) {
			return;
		}

		// un-highlight old
		if (previousState && previousState.cursorY !== this.state.cursorY) {
			const block = this.getSelectedBlock();
			block.content(this.options.colorDefault(block.escapedText, block));
			this.currentIdx = this.calculateIdxFromState(this.state);
		}

		// highlight selected
		const block = this.getSelectedBlock();
		block.content(this.options.colorHighlight(block.escapedText, block));

		this.div.scroll(this.state.scrollX, this.state.scrollY);
		if (this.state.cursorY - this.state.scrollY + block.height() > this.state.windowHeight) {
			this.div.scrollY(this.state.scrollY + block.height() - 1);
		}

		this.jumper.render();
	}

	onSearch({ index }) {
		if (index < 0) {
			return;
		}

		const previousState = { ...this.state };

		const cursorY = this.div.blockIds.slice(0, index).reduce((accum, id) => {
			return accum + this.div.getBlock(id).height();
		}, 0);

		const changed = vats.viStateHandler.setState(this.state, { cursorY });
		changed && vats.emitEvent('state-change', { previousState });
	}

	adjustKbForMultiLine(kb) {
		const dir = kb.action.name.includes('down') ? 1 : -1;
		const targetIdx = Math.max(0 , Math.min(this.currentIdx + kb.count * dir, this.div.blockIds.length));
		const fromTo = [this.currentIdx, targetIdx];
		const ids = this.div.blockIds.slice(...(dir > 0 ? fromTo : fromTo.reverse()));
		kb.count = ids.reduce((accum, id) => accum + this.div.getBlock(id).height(), 0);
	}

	calculateIdxFromState(state) {
		let index = 0;
		let accum = 0;
		for (let l = this.div.blockIds.length - 1; index < l; index++) {
			if (accum >= state.cursorY) {
				break;
			}
			accum += this.getBlockAtIdx(index).height();
		}
		return index;
	}

	destroy() {
		this.jumper.removeDivision(this.div);
		this.div.destroy();
		this.div = this.viState = this.currentIdx = null;

		super.destroy();
	}
};
