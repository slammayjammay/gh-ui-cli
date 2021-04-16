require('../dotenv')();
const escapes = require('ansi-escapes');
require('readline-refresh-line/hijack');
const Jumper = require('../../terminal-jumper/src');
const fetcher = require('./fetcher');
const vats = require('./vats');
const RepoSearchUI = require('./RepoSearchUI');
const RepoUI = require('./RepoUI');

// global commands: "help", "render"
class Program {
	constructor() {
		this.jumper = new Jumper({ useAlternateScreen: false });
		this.jumper.init();
		process.stdout.write(escapes.cursorHide);

		process.on('exit', () => {
			process.stdout.write(escapes.cursorShow);
			// this.jumper.rmcup();
		});

		vats.on('command-mode:enter', () => process.stdout.write(escapes.cursorShow));
		vats.on('command-mode:exit', () => process.stdout.write(escapes.cursorHide));

		this.run();
	}

	async run() {
		const repoSearchUI = new RepoSearchUI(this.jumper);
		repoSearchUI.focus();
		const repoName = await repoSearchUI.run();

		if (!repoName) {
			return this.destroy();
		}

		const repoUI = new RepoUI(this.jumper, repoName);
		repoUI.focus();
		repoUI.run();
	}

	destroy() {
		this.jumper.destroy();
		vats.destroy();
		fetcher.destroy();
		process.exit();
	}
}

new Program();
