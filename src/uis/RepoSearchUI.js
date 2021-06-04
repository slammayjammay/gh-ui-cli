import { parse } from 'url';
import escapes from 'ansi-escapes';
import figlet from 'figlet';
import pad from '../utils/pad.js';
import map from '../map.js';
import jumper from '../jumper.js';
import vats from '../vats.js';
import Loader from '../Loader.js';
import BaseUI from './BaseUI.js';
import ViStateUI from './ViStateUI.js';

const PROMPT = ' Enter a repo name or URL > ';

// TODO: cancel requests
export default class RepoSearchUI extends BaseUI {
	constructor() {
		super(...arguments);

		this.resolve = null;

		jumper.addDivision({
			id: 'header',
			top: 0,
			left: 1,
			width: '100% - {header}l'
		});
		const text = figlet.textSync('Repo Search', { font: 'Calvin S' });
		jumper.getDivision('header').addBlock(text, 'header');

		jumper.addDivision({
			id: 'input',
			top: '100% - 1',
			left: 1,
			width: '100% - {input}l'
		});
		jumper.getDivision('input').addBlock(PROMPT, 'prompt');

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

	run() {
		const promise = super.run();
		this.promptForSearchQuery().then(query => this.fetchRepos(query));
		return promise;
	}

	async promptForSearchQuery() {
		this.resultsUI.div.reset();

		jumper.chain().jumpTo('{input}l', '{input}t').appendToChain(escapes.cursorShow).execute();
		const query = await vats.prompt({ prompt: PROMPT });
		process.stdout.write(escapes.cursorHide);

		return query;
	}

	async fetchRepos(query) {
		if (!query) {
			return this.end(false);
		}

		const isUrl = /^https:\/\//.test(query);
		if (isUrl) {
			return this.end(this.parseUrl(query));
		}

		jumper.getBlock('input.prompt').content('');
		jumper.chain().render().jumpTo('{input}l', '{input}t').execute();
		const loader = new Loader(`Searching for "${query}"...`);
		loader.play();

		// const json = await map.get('fetcher').searchRepos(query, true);
		const json = await (await map.get('fetcher').searchRepos(query)).json();

		loader.end();

		if (!json.items || json.items.length === 0) {
			jumper.chain().jumpTo('{results}l', '{results}t').appendToChain('No results found.').execute();
			return this.promptForSearchQuery().then(query => this.fetchRepos(query));
		}

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
		vats.emitEvent('state-change');
	}

	onKeypress({ key }) {
		if (key.formatted === 'escape') {
			this.resultsUI.div.erase();
			this.promptForSearchQuery().then(query => this.fetchRepos(query));
		} else if (key.formatted === 'return') {
			const repo = this.resultsUI.getSelectedBlock().name;
			jumper.getDivision('input').reset();
			this.resultsUI.div.reset();
			jumper.chain().render().jumpTo(0, 0).execute();
			this.end({ repoName: repo.trim() });
		}
	}

	parseUrl(url) {
		const { pathname } = parse(url);
		const match = /\/([^\/]+\/[^\/]+)(?:\/tree\/([^\/]+))?/.exec(pathname);
		if (!match) {
			throw new Error(`Unable to parse url "${url}".`);
		}

		const [_, repoName, branch] = match;
		return { repoName, branch };
	}

	destroy() {
		['header', 'input'].forEach(id => {
			const div = jumper.getDivision(id);
			jumper.removeDivision(div);
			div.destroy();
		});

		this.resultsUI.destroy();
		this.resultsUI = null;

		super.destroy();
	}
};
