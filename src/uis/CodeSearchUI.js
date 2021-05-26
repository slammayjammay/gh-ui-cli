import escapes from 'ansi-escapes';
import BaseUI from './BaseUI.js';
import jumper from '../jumper.js';
import vats from '../vats.js';

export default class CodeSearchUI extends BaseUI {
	constructor(divOptions = {}, repo) {
		super();
		this.repo = repo;

		this.input = jumper.addDivision({
			id: 'input',
			top: '100% - 1',
			left: divOptions.left || '1',
			width: divOptions.width || '100%'
		});

		this.results = jumper.addDivision({
			id: 'results',
			top: divOptions.top || '0',
			left: divOptions.left || '1',
			width: divOptions.width || '50%'
		});
	}

	run() {
		const promise = super.run();
		this.promptForSearchQuery().then(query => this.fetchRepos(query));
		return promise;
	}

	async promptForSearchQuery() {
		process.stdout.write(escapes.cursorShow + jumper.jumpToString('{input}l', '{input}t'));
		const prompt = `Enter a search term > `;
		const query = await vats.prompt({ prompt });
		process.stdout.write(escapes.cursorHide);
		return query;
	}

	async fetchRepos(query) {
		const json = await (await this.repo.searchCode(query)).json();
		console.log(json);
	}
}
