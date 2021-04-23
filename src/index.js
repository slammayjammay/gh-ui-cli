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
class Program {
	constructor() {
		this.setup();
		this.repoSearch();
	}

	setup() {
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
	}

	async repoSearch() {
		const repoSearchUI = new RepoSearchUI();
		repoSearchUI.focus();
		const data = await repoSearchUI.run();

		if (!data) {
			return this.destroy();
		}

		const repoUI = new RepoUI(data.repoName, data.branch);
		repoUI.focus();
		repoUI.run();
	}

	destroy() {
		jumper.destroy();
		vats.destroy();
		map.get('fetcher').destroy();
		map.clear();
		process.exit();
	}
}

new Program();
