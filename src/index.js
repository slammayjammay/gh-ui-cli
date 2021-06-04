#!/usr/bin/env node

import os from 'os';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import escapes from 'ansi-escapes';
import 'readline-refresh-line/hijack.js';
import helpScreen from './screens/help.js';
import map from './map.js';
import vats from './vats.js';
import jumper from './jumper.js';
import RepoSearchUI from './uis/RepoSearchUI.js';
import RepoUI from './uis/RepoUI.js';
import Fetcher from './Fetcher.js';

// TODO: global commands: "help", "render"
class Program {
	constructor() {
		const args = minimist(process.argv.slice(2), {
			alias: {
				h: 'help',
				c: 'config',
				u: 'username',
				t: 'token',
				a: 'api-url'
			}
		});

		this.run(args);
	}

	async run(args) {
		if (args.help) {
			console.log(helpScreen);
			// TODO: not this
			return process.exit();
		}

		const config = this.getConfig(args);
		(!config.username || !config.token) && await this.promptForConfig(config);

		const fetcher = new Fetcher(config.apiUrl, config.username, config.token);
		map.set('fetcher', fetcher);

		vats.on('command-mode:enter', () => process.stdout.write(escapes.cursorShow));
		vats.on('command-mode:exit', () => process.stdout.write(escapes.cursorHide));
		vats.on('repo-search-select', () => this.repoSearch());

		jumper.init();
		process.stdout.write(escapes.cursorHide);
		process.on('exit', () => {
			process.stdout.write(escapes.cursorShow);
			// jumper.rmcup();
		});

		this.repoSearch();
	}

	getConfig(args) {
		let config = {};

		if (args.config) {
			const configPath = args.config === true ? path.join(os.homedir(), '.config/gh-ui-cli/config.json') : args.config;
			config = this.readConfig(configPath);
		}

		if (config.tokenEnvVar) {
			config.token = process.env[config.tokenEnvVar];
		}

		args.username && (config.username = args.username);
		args.token && (config.token = args.token);
		args['api-url'] && (config.apiUrl = args['api-url']);

		return config;
	}

	readConfig(path) {
		const config = fs.readFileSync(path).toString();
		let json;
		try {
			json = JSON.parse(config);
		} catch(e) {
			console.log(e);
			console.log(`Config file must be JSON format (${path}).`);
		}
		return json || {};
	}

	async promptForConfig(config) {
		const s = `${config.username ? 1 : 0}${config.token ? 1 : 0}`;
		const warning = s === '01' ? 'username' : s === '10' ? 'token' : 'username and token';
		console.log(`You have not specified a ${warning}. Accessing the GitHub API without authentication will limit the number of requests you can make. Do you want to provide these value(s) now? (Y/n)`);

		const answer = await vats.prompt({ prompt: '> ' });
		if (!answer || answer[0].toLowerCase() !== 'y') {
			process.exit();
			return;
		}

		if (!config.username) {
			console.log();
			config.username = await vats.prompt({ prompt: 'You have not provided a username -- please enter below or leave blank to skip.\n> ' });
		}
		if (!config.token) {
			console.log();
			config.token = await vats.prompt({ prompt: 'You have not provided a token -- please enter below or leave blank to skip.\n> ' });
		}
	}

	async repoSearch() {
		const repoSearchUI = new RepoSearchUI();
		repoSearchUI.focus();
		const data = await repoSearchUI.run();

		if (!data) {
			return this.destroy();
		}

		const repoUI = new RepoUI(data.repoName, data.branch);
		repoUI.focus();
		repoUI.run();
	}

	destroy() {
		jumper.destroy();
		vats.destroy();
		map.get('fetcher').destroy();
		map.clear();
		process.exit();
	}
}

new Program();
