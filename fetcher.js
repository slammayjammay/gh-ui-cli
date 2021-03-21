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
			options.Authorization = this.auth;
		}

		return fetch(url, options);
	}
};

module.exports = new Fetcher('slammayjammy', process.env.GH_TOKEN);
