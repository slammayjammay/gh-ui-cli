const fetcher = require('../fetcher');
const vats = require('../vats');
const ViStateUI = require('../ViStateUI');

module.exports = class BranchesUI extends ViStateUI {
	constructor(jumper, divOptions, repoData) {
		super(jumper, divOptions);
		this.repoData = repoData;
	}

	async run() {
		const url = this.repoData.branches_url.replace('{/branch}', '');
		const branches = await (await fetcher.fetch(url)).json();

		branches.forEach(({ name }) => this.div.addBlock(name));

		this.sync();
		vats.emitEvent('state-change');

		return super.run();
	}
};
