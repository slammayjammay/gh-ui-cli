import map from '../map.js';
import jumper from '../jumper.js';
import vats from '../vats.js';
import pad from '../utils/pad.js';
import Loader from '../Loader.js';
import ViStateUI from './ViStateUI.js';

export default class BranchesUI extends ViStateUI {
	constructor(divOptions, repo) {
		super(divOptions);
		this.repo = repo;
		this.hasFetched = false;
	}

	async run() {
		const loader = new Loader('Loading branches...');
		jumper.jumpTo(0, '100%');
		loader.play();
		const branches = await (await this.repo.fetchBranches()).json();
		loader.end();
		this.hasFetched = true;
		branches.forEach(({ name }) => {
			const block = this.div.addBlock(pad(name, this.div.width()));
			block.branch = name;
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

	onKeybinding({ kb }) {
		super.onKeybinding(...arguments);

		if (kb.action.name === 'return') {
			const { branch } = this.getSelectedBlock();
			vats.emitEvent('branch-select', { branch });
		}
	}

	destroy() {
		this.repo = null;
		super.destroy();
	}
};
