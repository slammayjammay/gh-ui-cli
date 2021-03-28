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
		repoSearchUI.focus();
		const repoName = await repoSearchUI.run();
		// repoSearchUI.destroy();

		const repoUI = new RepoUI(this.jumper, repoName);
		repoUI.focus();
		repoUI.run();
	}
}

new Program();
