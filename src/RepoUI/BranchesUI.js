import fetcher from '../fetcher.js';
import vats from '../vats.js';
import pad from '../pad.js';
import ViStateUI from '../ViStateUI.js';

export default class BranchesUI extends ViStateUI {
	constructor(jumper, divOptions, repoData) {
		super(jumper, divOptions);
		this.repoData = repoData;
		this.hasFetched = false;
	}

	async run() {
		const branches = await (await fetcher.getBranches(this.repoData)).json();
		this.hasFetched = true;
		branches.forEach(({ name }) => this.div.addBlock(pad(name, this.div.width())));

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
