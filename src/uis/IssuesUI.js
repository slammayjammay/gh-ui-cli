import fetcher from '../fetcher.js';
import vats from '../vats.js';
import pad from '../utils/pad.js';
import Loader from '../Loader.js';
import ViStateUI from './ViStateUI.js';

export default class IssuesUI extends ViStateUI {
	constructor(jumper, divOptions, repoData) {
		super(jumper, divOptions);
		this.repoData = repoData;
		this.hasFetched = false;
	}

	async run() {
		const loader = new Loader('Loading issues...');
		this.jumper.jumpTo(0, '100%');
		loader.play();
		const issues = await (await fetcher.getIssues(this.repoData)).json();
		loader.end();
		this.hasFetched = true;

		// TODO: dates
		issues.forEach(issue => {
			const width = this.div.width();
			const lines = [issue.title];
			lines.push(`#${issue.number}, (${issue.state})`);
			const text = lines.join('\n').split('\n').map(line => pad(line, width)).join('\n');
			this.div.addBlock(text + '\n');
		});

		this.sync();
		vats.emitEvent('state-change');

		return super.run();
	}

	onStateChange() {
		if (!this.hasFetched) {
			return;
		}

		super.onStateChange(...arguments);
	}
};
