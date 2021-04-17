import pkg from '../../vats/src/index.js';
const { Vats, keybindings } = pkg;

keybindings.set('ctrl+p', { name: 'ctrl+p' });
export default new Vats();
