import VatsPKG from '../../vats/src/index.js';
const { Vats, keybindings } = VatsPKG;
keybindings.set('ctrl+p', { name: 'ctrl+p' });
export default new Vats();
