const fs = require('fs');
const path = require('path');

module.exports = (filePath = path.join(__dirname, './.env')) => {
	const junk = fs.readFileSync(filePath).toString();
	junk.split('\n').forEach(line => {
		const match = /(.*)=(.*)/.exec(line);
		if (match) {
			const [_, key, value] = match;
			process.env[key] = value;
		}
	});
};
