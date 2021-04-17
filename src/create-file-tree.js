class Tree {
	constructor(files) {
		this.root = { children: new Map() };
		this.cache = new Map();

		files.forEach(obj => this.set(obj.path, obj));

		this.convert();
		this.cache = null;
	}

	set(path, file) {
		const dirs = path.split('/');
		const last = file.type !== 'tree' && dirs.pop();

		let current = this.root;
		dirs.forEach((name, i) => {
			if (!current.children.has(name)) {
				const path = dirs.slice(0, i + 1).join('/');
				current.children.set(name, { path, children: new Map() });
			}

			current = current.children.get(name);
		});

		last && current.children.set(last, file);

		this.cache.set(path, file);
	}

	convert() {
		const traverse = (node, parent) => {
			if (this.cache.get(node.path)) {
				Object.assign(node, this.cache.get(node.path));
				this.cache.set(node.path, node);
			}

			node.parent = parent;

			if (node.children) {
				node.children = Array.from(node.children.values());
				node.children.forEach(child => traverse(child, node));
			}
		};

		traverse(this.root, null);
	}
}

export default (files) => {
	return new Tree(files);
};
