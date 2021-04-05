const escapes = require('ansi-escapes');
const pager = require('node-pager');

module.exports = async (string, options = '-Rc') => {
	process.stdout.write(escapes.cursorSavePosition + escapes.cursorTo(0, 0));
	await pager(string, options);
	process.stdout.write(escapes.cursorRestorePosition);
};
