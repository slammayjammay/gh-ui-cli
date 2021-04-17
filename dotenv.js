// TODO: not this
import fs from 'fs';
import path from 'path';

const filePath = new URL('./.env', import.meta.url);

const dotenv = fs.readFileSync(filePath).toString();
dotenv.split('\n').forEach(line => {
	const match = /(.*)=(.*)/.exec(line);
	if (match) {
		const [_, key, value] = match;
		process.env[key] = value;
	}
});
