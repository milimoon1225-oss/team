import { today } from './operations.js';

export function emptyDraft(now = new Date()) {
  const date = today(now);
  return { client: '', phone: '', product: '', qty: '1', received: date, delivery: `${date}T18:00`, description: '', price: '' };
}
export function initialState({ mode = 'standalone', name, device, userId, now }) {
  if (mode !== 'standalone') throw new Error('Forma de trabajo no válida.');
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw new Error('Indica el nombre del responsable.');
  return { schema: 2, mode, device, profile: { id: userId, nombre: name.trim(), rol: 'administracion' }, documents: {}, queue: [], cursor: 0, team: [], files: {}, draft: emptyDraft(now), lastSync: null };
}
export function assertWritable(state) {
  if (state.mode !== 'standalone') throw new Error('Este respaldo no pertenece a la edición local. Conserva el original.');
}
export function requireAdmin(state) {
  if (state.profile.rol !== 'administracion') throw new Error('Solo administración puede realizar esta operación.');
}
