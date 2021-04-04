const chalk = require('chalk');
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
		const issues = await (await fetcher.getIssues(this.repoData)).json();

		// TODO: dates
		issues.forEach(issue => {
			const width = this.div.width();
			const lines = [issue.title];
			lines.push(`#${issue.number}, (${issue.state})`);
			const text = lines.join('\n').split('\n').map(line => pad(line, width)).join('\n');
			this.div.addBlock(text + '\n');
		});

		this.sync();
		vats.emitEvent('state-change');

		return super.run();
	}
};
