import '../dotenv.js';
import escapes from 'ansi-escapes';
import 'readline-refresh-line/hijack.js';
import Jumper from '../../terminal-jumper/src/index.js';
import VatsPKG from '../../vats/src/index.js';
import map from './map.js';
import RepoSearchUI from './uis/RepoSearchUI.js';
import RepoUI from './uis/RepoUI.js';
import Fetcher from './Fetcher.js';

// TODO: global commands: "help", "render"
// TODO: take url as argument
class Program {
	constructor() {
		// jumper
		const jumper = new Jumper({ useAlternateScreen: false });
		jumper.init();

		// vats
		const { Vats, keybindings } = VatsPKG;
		keybindings.set('ctrl+p', { name: 'ctrl+p' });
		const vats = new Vats();
		vats.on('command-mode:enter', () => process.stdout.write(escapes.cursorShow));
		vats.on('command-mode:exit', () => process.stdout.write(escapes.cursorHide));
		vats.on('repo-search-select', () => this.repoSearch());

		// fetcher
		const fetcher = new Fetcher('slammayjammy', process.env.GH_TOKEN);

		map.set('jumper', jumper);
		map.set('vats', vats);
		map.set('fetcher', fetcher);

		this.run();
	}

	run() {
		process.stdout.write(escapes.cursorHide);
		process.on('exit', () => {
			process.stdout.write(escapes.cursorShow);
			// jumper.rmcup();
		});
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
