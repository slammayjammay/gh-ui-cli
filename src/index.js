require('../dotenv')();
const escapes = require('ansi-escapes');
require('readline-refresh-line/hijack');
const Jumper = require('../../terminal-jumper/src');
const fetcher = require('./fetcher');
const vats = require('./vats');
const RepoSearchUI = require('./RepoSearchUI');
const RepoUI = require('./RepoUI');

class Program {
	constructor() {
		this.jumper = new Jumper({ useAlternateScreen: false });
		this.jumper.init();
		process.stdout.write(escapes.cursorHide);

		process.on('exit', () => {
			process.stdout.write(escapes.cursorShow);
			// this.jumper.rmcup();
		});

		this.run();
	}

	async run() {
		const repoSearchUI = new RepoSearchUI(this.jumper);
		vats.options.getViState = () => repoSearchUI.getState();
		const repoName = await repoSearchUI.run();

		const repoUI = new RepoUI(this.jumper, repoName);
		vats.options.getViState = () => repoUI.getState();
		repoUI.run();
	}
}

new Program();
