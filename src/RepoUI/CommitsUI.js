import fetcher from '../fetcher.js';
import vats from '../vats.js';
import pad from '../pad.js';
import Loader from '../Loader.js';
import ViStateUI from '../ViStateUI.js';

export default class CommitsUI extends ViStateUI {
	constructor(jumper, divOptions, repoData) {
		super(jumper, divOptions);
		this.repoData = repoData;
		this.hasFetched = false;
	}

	async run() {
		const loader = new Loader('Loading commits...');
		this.jumper.jumpTo(0, '100%');
		loader.play();
		const commits = await (await fetcher.getCommits(this.repoData)).json();
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
