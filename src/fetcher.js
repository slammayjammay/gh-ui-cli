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

	getFile(repoName, filePath) {
		return this.fetch(`https://api.github.com/repos/${repoName}/contents/${filePath}`);
	}
};

module.exports = new Fetcher('slammayjammy', process.env.GH_TOKEN);