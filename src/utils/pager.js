import escapes from 'ansi-escapes';
import pager from 'node-pager';

export default async (string, options = '-Rc') => {
	process.stdout.write(escapes.cursorSavePosition + escapes.cursorTo(0, 0));
	await pager(string, options);
	process.stdout.write(escapes.cursorRestorePosition);
};
