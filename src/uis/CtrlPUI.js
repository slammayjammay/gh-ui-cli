import escapes from 'ansi-escapes';
import chalk from 'chalk';
import map from '../map.js';
import pad from '../utils/pad.js';
import fuzzyFind from '../utils/fuzzy-find.js';
import BaseUI from './BaseUI.js';

export default class CtrlPUI extends BaseUI {
	constructor(repoData) {
		super();
		this.repoData = repoData;

		this.currentIdx = 0;
		this.found = [];
		this.files = this.repoData.tree.allFiles.filter(o => o.type !== 'tree');

		this.div = map.get('jumper').addDivision({
			id: 'ctrlp',
			left: 0,
			width: '100%',
			top: '100% - {ctrlp}h - 1'
		});

		const header = map.get('jumper').addDivision({
			id: 'ctrlp-header',
			top: '{ctrlp}t - 1',
			left: 0,
			width: '100%',
		});
		header.addBlock(chalk.bgWhite.bold.hex('000')(pad(this.repoData.full_name, header.width())));

		this.addVatsListener('keypress', 'onKeypress');
	}

	async run() {
		process.stdout.write(escapes.cursorShow + map.get('jumper').jumpTo(0, '{ctrlp}b'));
		map.get('vats').prompt({ enableKeypressEvents: true, prompt: '>>> ' }).then(input => {
			if (!input) {
				return this.end();
			}
			this.end(this.found[this.div.blockIds.length - 1 - this.currentIdx].item);
		});

		process.nextTick(() => {
			this.runQuery();
			map.get('jumper').chain()
				.appendToChain(this.div.eraseString({}))
				.appendToChain(this.div.renderString())
				.appendToChain(this.renderLineString())
				.execute();
		});

		return super.run();
	}

	end() {
		process.stdout.write(escapes.cursorHide);
		return super.end(...arguments);
	}

	onKeypress({ key }) {
		if (/up|down/.test(key.formatted)) {
			const idx = this.currentIdx + 1 * (key.formatted === 'up' ? 1 : -1);
			this.currentIdx = Math.max(0, Math.min(idx, this.found.length - 1));
			this.updateResults(this.found);
			this.renderResults();
		} else {
			this.currentIdx = 0;
			process.nextTick(() => {
				this.renderLineString();
				this.runQuery();
			});
		}
	}

	runQuery(query = map.get('vats').promptMode.getLine()) {
		const found = fuzzyFind(this.files, query, {
			map: item => item.path
		});
		this.updateResults(found.slice(0, 10).reverse());
		this.renderResults();
	}

	updateResults(items) {
		this.found = items;
		this.div.reset();

		if (items.length === 0) {
			this.div.addBlock(chalk.bgRed.bold.white(' == NO ENTRIES =='));
		} else {
			items.forEach(({ indices, item }, idx) => {
				let text = this.formatItem(item.path, indices);
				if (idx === items.length - 1 - this.currentIdx) {
					text = chalk.underline(pad(text, this.div.width()));
				}
				this.div.addBlock(text).file = item;
			});
		}
	}

	formatItem(path, indices = []) {
		const chars = [];
		let j = 0;

		for (let i = 0, l = path.length; i < l; i++) {
			const isMatch = i === indices[j];
			chars.push(isMatch ? chalk.bold.blue(path[i]) : path[i]);
			isMatch && j++;
		}

		return `> ${chars.join('')}`;
	}

	renderResults() {
		map.get('jumper').chain().render();
		map.get('jumper').appendToChain(this.renderLineString());
		map.get('jumper').execute();
	}

	formatPrompt() {
		const cursor = map.get('vats').promptMode.rl.cursor;
		const prompt = map.get('vats').promptMode.getPrompt();
		const line = map.get('vats').promptMode.getLine();

		if (cursor === line.length) {
			return `${prompt}${line}${chalk.underline(' ')}`;
		}

		const formatted = line.slice(0, cursor) + chalk.underline(line[cursor]) + line.slice(cursor + 1);
		return prompt + formatted;
	}

	renderLineString(line = this.formatPrompt()) {
		return map.get('jumper').jumpToString(0, '{ctrlp}b') +
			escapes.eraseLine + line +
			map.get('jumper').jumpToString(0, `{ctrlp}b - 1 - ${this.currentIdx}`);
	}

	destroy() {
		process.stdout.write(this.renderLineString(''));

		const header = map.get('jumper').getDivision('ctrlp-header');
		map.get('jumper').removeDivision(header);
		map.get('jumper').removeDivision(this.div);
		header.destroy();
		this.div.destroy();
		this.div = this.currentIdx = this.found = null;

		return super.destroy();
	}
};
