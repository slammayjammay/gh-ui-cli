import map from '../map.js';
import pad from '../utils/pad.js';
import Loader from '../Loader.js';
import ViStateUI from './ViStateUI.js';

export default class BranchesUI extends ViStateUI {
	constructor(divOptions, repoData) {
		super(divOptions);
		this.repoData = repoData;
		this.hasFetched = false;
	}

	async run() {
		const loader = new Loader('Loading branches...');
		map.get('jumper').jumpTo(0, '100%');
		loader.play();
		const branches = await (await map.get('fetcher').getBranches(this.repoData)).json();
		loader.end();
		this.hasFetched = true;
		branches.forEach(({ name }) => {
			const block = this.div.addBlock(pad(name, this.div.width()));
			block.branch = name;
		});

		this.sync();
		map.get('vats').emitEvent('state-change');

		return super.run();
	}

	onStateChange() {
		if (!this.hasFetched) {
			return;
		}

		super.onStateChange(...arguments);
	}

	onKeybinding({ kb }) {
		super.onKeybinding(...arguments);

		if (kb.action.name === 'return') {
			const { branch } = this.getSelectedBlock();
			map.get('vats').emitEvent('branch-select', { branch });
		}
	}
};
