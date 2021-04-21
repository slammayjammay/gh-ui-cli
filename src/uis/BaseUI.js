import map from '../map.js';

// TODO: import jumper instead of IV
export default class BaseUI {
	constructor() {
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
		map.get('jumper').render();
		return new Promise(resolve => this.resolve = resolve);
	}

	end(data, shouldDestroy = true) {
		this.resolve(data);
		shouldDestroy ? this.destroy() : this.unfocus();
	}

	focus() {
		map.get('vats').searcher.clearCache();

		['getViState', 'getSearchableItems', 'getSearchOptions'].forEach(method => {
			this[method]() && (map.get('vats').options[method] = () => this[method]());
		});

		if (!this.isFocused) {
			this.vatsCbs.forEach(([event, cb]) => map.get('vats').on(event, cb));
		}
		this.isFocused = true;
	}

	unfocus() {
		this.removeFromVats();
		this.isFocused = false;
	}

	removeFromVats() {
		['getViState', 'getSearchableItems', 'getSearchOptions'].forEach(method => {
			map.get('vats').options[method] = null;
		});
		this.vatsCbs.forEach(([event, cb]) => map.get('vats').removeListener(event, cb));
	}

	destroy() {
		this.removeFromVats();
		this.vatsCbs = this.resolve = this.isFocused = null;
	}
};
