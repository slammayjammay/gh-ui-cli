import FileTree from './utils/FileTree.js';
import map from './map.js';

export default class Repo {
	constructor(data) {
		this.data = data;
		this.currentBranch = this.data.default_branch;
		this.tree = null;
	}

	async fetchFiles(sha) {
		return map.get('fetcher').fetch(`/repos/${this.data.full_name}/git/trees/${sha}?recursive=true`);
	}

	async loadFiles(sha = this.data.default_branch) {
		const json = await (await this.fetchFiles(sha)).json();
		this.currentBranch = sha;
		this.tree = new FileTree(json.tree);
	}

	fetchFileData(file, ref = this.currentBranch) {
		const url = this.data.contents_url.replace('{+path}', file.path);
		return map.get('fetcher').fetchUrl(`${url}?ref=${ref}`);
	}

	async loadFileData(file, ...rest) {
		file.data = await (await this.fetchFileData(file, ...rest)).json();
		if (file.type !== 'tree') {
			file.text = Buffer.from(file.data.content, file.data.encoding).toString();
		}
	}

	fetchBranches() {
		return map.get('fetcher').fetchUrl(this.data.branches_url.replace('{/branch}', ''));
	}

	fetchCommits() {
		return map.get('fetcher').fetchUrl(this.data.commits_url.replace('{/sha}', ''));
	}

	fetchIssues() {
		return map.get('fetcher').fetchUrl(this.data.issues_url.replace('{/number}', ''));
	}

	searchCode(query) {
		const url = `/search/code?q=${encodeURIComponent(query)}+repo:${this.data.full_name}`;
		const options = { headers: { Accept: 'application/vnd.github.v3.text-match+json' } };
		return map.get('fetcher').fetch(url, options);
	}

	destroy() {
		// TODO
	}
}
