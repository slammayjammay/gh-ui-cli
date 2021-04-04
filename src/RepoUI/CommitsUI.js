const fetcher = require('../fetcher');
const vats = require('../vats');
const pad = require('../pad');
const ViStateUI = require('../ViStateUI');

module.exports = class CommitsUI extends ViStateUI {
	constructor(jumper, divOptions, repoData) {
		super(jumper, divOptions);
		this.repoData = repoData;
	}

	async run() {
		const commits = await (await fetcher.getCommits(this.repoData)).json();

		commits.forEach(({ commit }) => {
			const width = this.div.width();
			const lines = [commit.message, commit.author.name, commit.author.date].join('\n');
			const text = lines.split('\n').map(line => pad(line, width)).join('\n');
			this.div.addBlock(text + '\n');
		});

		this.sync();
		vats.emitEvent('state-change');

		return super.run();
	}
};
