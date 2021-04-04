const fetch = require('node-fetch');

class Fetcher {
	constructor(username, token) {
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
			return require('./seeds/repo-search');
		}

		return this.fetch(`https://api.github.com/search/repositories?q=${encoded}`);
	}

	getRepo(repoName) {
		return this.fetch(`https://api.github.com/repos/${repoName}`);
	}

	getBranches(repoData) {
		const url = repoData.branches_url.replace('{/branch}', '');
		return this.fetch(url);
	}

	getCommits(repoData) {
		const url = repoData.commits_url.replace('{/sha}', '');
		return this.fetch(url);
	}

	getIssues(repoData) {
		const url = repoData.issues_url.replace('{/number}', '');
		return this.fetch(url);
	}

	getFile(repoData, filePath) {
		const url = repoData.contents_url.replace('{+path}', filePath);
		return this.fetch(url);
	}

	getFiles(repoData, sha = repoData.default_branch) {
		return this.fetch(`https://api.github.com/repos/${repoData.full_name}/git/trees/${sha}?recursive=true`);
	}

	destroy() {
		this.auth = null;
	}
};

module.exports = new Fetcher('slammayjammy', process.env.GH_TOKEN);
