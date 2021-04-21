class FuzzyFinder {
	find(items, query, options = {}) {
		const found = [];

		for (let i = 0, l = items.length; i < l; i++) {
			const string = options.map ? options.map(items[i]) : items[i];
			const [isMatch, indices] = this.test(string, query);
			isMatch && found.push({ indices, item: items[i] });
		}

		return found;
	}

	test(string, query) {
		if (!query) {
			return [true, []];
		}

		let firstIndex = -1;
		let queryIdx = 0;

		const indices = [];

		for (let i = 0, l = string.length; i < l; i++) {
			if (string[i].toLowerCase() === query[queryIdx].toLowerCase()) {
				queryIdx++;
				indices.push(i);
			}

			if (queryIdx >= query.length) {
				return [true, indices];
			}
		}

		return [false, []];
	}

	sort(items) {
		return items.sort((item1, item2) => {
			return this.weigh(item1.indices) - this.weigh(item2.indices);
		});
	}

	weigh(indices) {
		return indices[0] + indices[indices.length - 1] - indices[0];
	}
}

export default (string, query, options) => {
	const finder = new FuzzyFinder();
	const found = finder.find(string, query, options);
	return finder.sort(found);
};
