const vats = require('./vats');

module.exports = class BaseUI {
	constructor(jumper) {
		this.jumper = jumper;
		this.vatsCbs = [];
		this.resolve = null;
	}

	getState() {}

	addVatsListener(event, methodName) {
		const cb = this[methodName].bind(this);
		this[methodName] = cb;
		this.vatsCbs.push([event, cb]);
	}

	run() {
		this.jumper.render();
		return new Promise(resolve => this.resolve = resolve);
	}

	end(data) {
		this.resolve(data);
		this.destroy();
	}

	focus() {
		if (this.getState()) {
			vats.options.getViState = () => this.getState();
		}
		this.vatsCbs.forEach(([event, cb]) => vats.on(event, cb));
	}

	unfocus() {
		vats.options.getViState = null;
		this.vatsCbs.forEach(([event, cb]) => vats.removeListener(event, cb));
	}

	destroy() {
		this.vatsCbs.forEach(([event, cb]) => vats.removeListener(event, cb));
		this.jumper = this.vatsCbs = this.resolve = null;
	}
};