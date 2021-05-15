import fetch from 'node-fetch';

export default class Fetcher {
	constructor(apiUrl, username, token) {
		this.apiUrl = apiUrl || `https://api.github.com`;
		if (this.apiUrl.slice(-1) === '/') {
			this.apiUrl = this.apiUrl.slice(-1);
		}

		if (username && token) {
			this.auth = this.createAuth(username, token);
		}
	}

	createAuth(username, token) {
		const auth = Buffer.from(`${username}:${token}`).toString('base64');
		return `Basic ${auth}`;
	}

	fetch(url, options = {}, useAuth = true) {
		if (useAuth) {
			options.headers = { Authorization: this.auth };
		}

		return fetch(url, options);
	}

	async searchRepos(query, debug = false) {
		const encoded = encodeURIComponent(query);
		if (debug) {
			return (await import('./seeds/repo-search.js')).default;
		}

		return this.fetch(`${this.apiUrl}/search/repositories?q=${encoded}`);
	}

	getRepo(repoName) {
		return this.fetch(`${this.apiUrl}/repos/${repoName}`);
	}

	getBranches(repoData) {
		return this.fetch(repoData.branches_url.replace('{/branch}', ''));
	}

	getCommits(repoData) {
		return this.fetch(repoData.commits_url.replace('{/sha}', ''));
	}

	getIssues(repoData) {
		return this.fetch(repoData.issues_url.replace('{/number}', ''));
	}

	getFile(repoData, filePath, ref = repoData.default_branch) {
		const url = repoData.contents_url.replace('{+path}', filePath);
		return this.fetch(`${url}?ref=${ref}`);
	}

	getFiles(repoData, sha = repoData.default_branch) {
		return this.fetch(`${this.apiUrl}/repos/${repoData.full_name}/git/trees/${sha}?recursive=true`);
	}

	destroy() {
		this.auth = null;
	}
};
