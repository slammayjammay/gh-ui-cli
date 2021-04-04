const fetcher = require('../fetcher');
const vats = require('../vats');
const pad = require('../pad');
const ViStateUI = require('../ViStateUI');

module.exports = class BranchesUI extends ViStateUI {
	constructor(jumper, divOptions, repoData) {
		super(jumper, divOptions);
		this.repoData = repoData;
	}

	async run() {
		const branches = await (await fetcher.getBranches(this.repoData)).json();
		branches.forEach(({ name }) => this.div.addBlock(pad(name, this.div.width())));

		this.sync();
		vats.emitEvent('state-change');

		return super.run();
	}
};
