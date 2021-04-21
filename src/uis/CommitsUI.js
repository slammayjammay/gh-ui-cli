import map from '../map.js';
import jumper from '../jumper.js';
import vats from '../vats.js';
import pad from '../utils/pad.js';
import Loader from '../Loader.js';
import ViStateUI from './ViStateUI.js';

export default class CommitsUI extends ViStateUI {
	constructor(divOptions, repoData) {
		super(divOptions);
		this.repoData = repoData;
		this.hasFetched = false;
	}

	async run() {
		const loader = new Loader('Loading commits...');
		jumper.jumpTo(0, '100%');
		loader.play();
		const commits = await (await map.get('fetcher').getCommits(this.repoData)).json();
		loader.end();
		this.hasFetched = true;

		commits.forEach(({ commit }) => {
			const width = this.div.width();
			const lines = [commit.message, commit.author.name, commit.author.date].join('\n');
			const text = lines.split('\n').map(line => pad(line, width)).join('\n');
			this.addBlock(text + '\n');
		});

		this.sync();
		vats.emitEvent('state-change');

		return super.run();
	}

	onStateChange() {
		if (!this.hasFetched) {
			return;
		}

		return super.onStateChange(...arguments);
	}
};
