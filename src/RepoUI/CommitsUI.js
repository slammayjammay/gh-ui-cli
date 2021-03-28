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
		const url = this.repoData.commits_url.replace('{/sha}', '');
		const commits = await (await fetcher.fetch(url)).json();

		commits.forEach(({ commit }) => {
			const width = this.div.width();
			let text = [commit.message, commit.author.name, commit.author.date].join('\n');
			text = text.split('\n').map(line => pad(line, width)).join('\n');
			this.div.addBlock(text + '\n');
		});

		this.sync();
		vats.emitEvent('state-change');

		return super.run();
	}
};
