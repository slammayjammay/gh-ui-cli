import escapes from 'ansi-escapes';
import figlet from 'figlet';
import pad from '../utils/pad.js';
import map from '../map.js';
import Loader from '../Loader.js';
import BaseUI from './BaseUI.js';
import ViStateUI from './ViStateUI.js';

const PROMPT = ' Enter a repo name > ';

// TODO: no results error?
// TODO: cancel requests
export default class RepoSearchUI extends BaseUI {
	constructor() {
		super(...arguments);

		this.resolve = null;

		map.get('jumper').addDivision({
			id: 'header',
			top: 0,
			left: 1,
			width: '100% - {header}l'
		});
		const text = figlet.textSync('Repo Search', { font: 'Calvin S' });
		map.get('jumper').getDivision('header').addBlock(text, 'header');

		map.get('jumper').addDivision({
			id: 'input',
			top: '100% - 1',
			left: 1,
			width: '100% - {input}l'
		});
		map.get('jumper').getDivision('input').addBlock(PROMPT, 'prompt');

		this.resultsUI = new ViStateUI({
			id: 'results',
			top: '{header}b + 1',
			left: '{header}l',
			width: '{header}w',
			height: '100%'
		});

		this.addVatsListener('keypress', 'onKeypress');
		this.resultsUI.focus();
	}

	getViState() { return this.resultsUI.getViState(); }
	getSearchableItems() { return this.resultsUI.getSearchableItems(); }
	getSearchOptions() { return this.resultsUI.getSearchOptions(); }

	async run() {
		this.promptForSearchQuery().then(query => this.fetchRepos(query));
		return super.run();
	}

	async promptForSearchQuery() {
		const eraseString = this.resultsUI.div.eraseString();

		this.resultsUI.div.reset();

		process.stdout.write(map.get('jumper').renderString() + escapes.cursorShow);
		const query = await map.get('vats').prompt({ prompt: PROMPT });
		process.stdout.write(escapes.cursorHide);

		return query;
	}

	async fetchRepos(query) {
		if (!query) {
			return this.end(false);
		}

		map.get('jumper').getBlock('input.prompt').content('');
		map.get('jumper').chain().render().jumpTo('{input}l', '{input}t').execute();
		const loader = new Loader(`Searching for "${query}"...`);
		loader.play();

		// const json = await map.get('fetcher').searchRepos(query, true);
		const json = await (await map.get('fetcher').searchRepos(query)).json();

		loader.end();

		const width = this.resultsUI.div.width();
		json.items.forEach(item => {
			const lines = [item.full_name];
			item.description && lines.push(`"${item.description.slice(0, 50)}"`);
			lines.push(`⭐${item.stargazers_count}`);
			lines.push(`⑂ ${item.forks_count}`);
			item.language && lines.push(`(${item.language})`);
			const text = lines.map(s => pad(s, width)).join('\n');
			this.resultsUI.addBlock(text + '\n').name = item.full_name;
		});
		this.resultsUI.sync();
		map.get('vats').emitEvent('state-change');
	}

	onKeypress({ key }) {
		if (key.formatted === 'escape') {
			this.promptForSearchQuery().then(query => this.fetchRepos(query));
		} else if (key.formatted === 'return') {
			const repo = this.resultsUI.getSelectedBlock().name;
			map.get('jumper').getDivision('input').reset();
			this.resultsUI.div.reset();
			map.get('jumper').chain().render().jumpTo(0, 0).execute();
			this.end(repo.trim());
		}
	}

	destroy() {
		['header', 'input'].forEach(id => {
			const div = map.get('jumper').getDivision(id);
			map.get('jumper').removeDivision(div);
			div.destroy();
		});

		this.resultsUI.destroy();
		this.resultsUI = this.resolve = null;

		super.destroy();
	}
};
