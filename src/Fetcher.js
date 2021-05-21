import fetch from 'node-fetch';

export default class Fetcher {
	constructor(apiUrl = 'https://api.github.com', username, token) {
		this.apiUrl = apiUrl;
		this.apiUrl.slice(-1) === '/' && (this.apiUrl = apiUrl.slice(-1));

		if (username && token) {
			this.auth = this.createAuth(username, token);
		}
	}

	createAuth(username, token) {
		const auth = Buffer.from(`${username}:${token}`).toString('base64');
		return `Basic ${auth}`;
	}

	fetchUrl(url, options = {}, useAuth = true) {
		if (useAuth) {
			options.headers = options.headers || {};
			options.headers.Authorization = this.auth;
		}

		return fetch(url, options);
	}

	fetch(pathname, ...rest) {
		return this.fetchUrl(`${this.apiUrl}${pathname}`, ...rest);
	}

	async searchRepos(query, debug = false) {
		const encoded = encodeURIComponent(query);
		if (debug) {
			return (await import('./seeds/repo-search.js')).default;
		}

		return this.fetch(`/search/repositories?q=${encoded}`);
	}

	getRepo(repoName) {
		return this.fetch(`/repos/${repoName}`);
	}

	destroy() {
		this.apiUrl = this.auth = null;
	}
};
