import vats from './vats.js';

// TODO: import jumper instead of IV
export default class BaseUI {
	constructor(jumper) {
		this.jumper = jumper;
		this.isFocused = false;
		this.vatsCbs = [];
		this.resolve = null;
	}

	getViState() {}
	getSearchableItems() {}
	getSearchOptions() {}

	addVatsListener(event, methodName) {
		const cb = this[methodName].bind(this);
		this[methodName] = cb;
		this.vatsCbs.push([event, cb]);
	}

	run() {
		this.jumper.render();
		return new Promise(resolve => this.resolve = resolve);
	}

	end(data, shouldDestroy = true) {
		this.resolve(data);
		shouldDestroy ? this.destroy() : this.unfocus();
	}

	focus() {
		vats.searcher.clearCache();

		['getViState', 'getSearchableItems', 'getSearchOptions'].forEach(method => {
			this[method]() && (vats.options[method] = () => this[method]());
		});

		if (!this.isFocused) {
			this.vatsCbs.forEach(([event, cb]) => vats.on(event, cb));
		}
		this.isFocused = true;
	}

	unfocus() {
		this.removeFromVats();
		this.isFocused = false;
	}

	removeFromVats() {
		['getViState', 'getSearchableItems', 'getSearchOptions'].forEach(method => {
			vats.options[method] = null;
		});
		this.vatsCbs.forEach(([event, cb]) => vats.removeListener(event, cb));
	}

	destroy() {
		this.removeFromVats();
		this.jumper = this.vatsCbs = this.resolve = this.isFocused = null;
	}
};
