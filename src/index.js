import '../dotenv.js';
import escapes from 'ansi-escapes';
import 'readline-refresh-line/hijack.js';
import Jumper from '../../terminal-jumper/src/index.js';
import fetcher from './fetcher.js';
import vats from './vats.js';
import RepoSearchUI from './RepoSearchUI.js';
import RepoUI from './RepoUI/index.js';

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
