module.exports = Base => class extends Base {
	constructor() {
		super(...arguments);
		this.addVatsListener('keypress', 'onKeypress');
	}

	onKeypress({ key }) {
		if (key.formatted === 'escape') {
			this.end();
		}
	}
};
