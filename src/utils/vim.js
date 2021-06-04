import { spawnSync } from 'child_process';
import fs from 'fs';
import tmp from 'tmp';
import escapes from 'ansi-escapes';

export default (text, path) => {
	path = path.replace(/\//g, '_');

	return new Promise(resolve => {
		process.stdout.write(
			escapes.cursorSavePosition +
			escapes.cursorTo(0, 0) +
			escapes.cursorShow
		);

		const name = `${Date.now()}__${path}`;

		tmp.file({ name }, (err, path, fd, done) => {
			if (err) {
				throw err;
			}

			fs.writeSync(fd, text);
			spawnSync(`vim "${path}"`, { shell: process.env.SHELL, stdio: 'inherit' });

			process.stdout.write(escapes.cursorRestorePosition + escapes.cursorHide);
			done();
			resolve();
		});
	});
};
