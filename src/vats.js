const { Vats, keybindings } = require('../../vats/src');

keybindings.set('ctrl+p', { name: 'ctrl+p' });

module.exports = new Vats();
