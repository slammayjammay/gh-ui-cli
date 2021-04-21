import '../dotenv.js';
import escapes from 'ansi-escapes';
import 'readline-refresh-line/hijack.js';
import map from './map.js';
import vats from './vats.js';
import jumper from './jumper.js';
import RepoSearchUI from './uis/RepoSearchUI.js';
import RepoUI from './uis/RepoUI.js';
import Fetcher from './Fetcher.js';

// TODO: global commands: "help", "render"
// TODO: take url as argument
class Program {
	constructor() {
		this.run();
	}

	run() {
		vats.on('command-mode:enter', () => process.stdout.write(escapes.cursorShow));
		vats.on('command-mode:exit', () => process.stdout.write(escapes.cursorHide));
		vats.on('repo-search-select', () => this.repoSearch());

		jumper.init();
		process.stdout.write(escapes.cursorHide);
		process.on('exit', () => {
			process.stdout.write(escapes.cursorShow);
			// jumper.rmcup();
		});

		// TODO: not this
		const fetcher = new Fetcher('slammayjammy', process.env.GH_TOKEN);
		map.set('fetcher', fetcher);

		return this.repoSearch();
	}

	async repoSearch() {
		const repoSearchUI = new RepoSearchUI();
		repoSearchUI.focus();
		const repoName = await repoSearchUI.run();

		if (!repoName) {
			return this.destroy();
		}

		const repoUI = new RepoUI(repoName);
		repoUI.focus();
		repoUI.run();
	}

	destroy() {
		['jumper', 'vats', 'fetcher'].forEach(key => map.get(key).destroy());
		map.clear();
		process.exit();
	}
}

new Program();
