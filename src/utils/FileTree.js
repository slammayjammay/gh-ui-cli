export default class Tree {
	constructor(files) {
		this.map = new Map();
		this.root = this.createHierarchy(files, this.map);
	}

	createHierarchy(files, map = new Map()) {
		const root = { children: new Map() };

		files.forEach(file => {
			const { path } = file;
			const dirs = path.split('/');
			const last = file.type !== 'tree' && dirs.pop();

			let current = root;
			dirs.forEach((name, i) => {
				if (!current.children.has(name)) {
					const path = dirs.slice(0, i + 1).join('/');
					current.children.set(name, { path, children: new Map() });
				}

				current = current.children.get(name);
			});

			last && current.children.set(last, file);

			map.set(path, file);
		});

		const traverse = (node, parent) => {
			if (map.get(node.path)) {
				Object.assign(node, map.get(node.path));
				map.set(node.path, node);
			}

			node.parent = parent;

			if (node.children) {
				node.children = Array.from(node.children.values());
				node.children.forEach(child => traverse(child, node));
			}
		};

		traverse(root, null);

		return root;
	}

	// TODO: idk
	allFiles() {
		return Array.from(this.map.values());
	}

	destroy() {
		this.map = this.root = null;
	}
}
