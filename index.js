require('./dotenv')();
require('readline-refresh-line/hijack');
const Jumper = require('terminal-jumper');
const fetcher = require('./fetcher');
const vats = require('./vats');
const RepoSearchUI = require('./RepoSearchUI');

class Program {
	constructor() {
		this.jumper = new Jumper();
		this.jumper.init();

		process.on('exit', () => this.jumper.rmcup());

		this.repoSearchUI = new RepoSearchUI(this.jumper);
		this.repoSearchUI.go();
	}
}

new Program();
