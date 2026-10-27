import { applyOperation, makeOperation, materialize, today } from '../domain/operations.js';
import { assertWritable, emptyDraft, initialState, requireAdmin } from '../domain/workspace.js';
import { createSession } from './session.js';
import { createDemonstration } from './demonstration.js';

/** Casos de uso. Las implementaciones de los puertos se suministran desde bootstrap. */
export function createWorkspace({ repository, files, now = () => new Date(), newId = () => crypto.randomUUID() }) {
  const operation = (state, type, target, payload) => makeOperation(state, type, target, payload, { id: newId(), at: now().toISOString() });
  const record = (state, op) => ({ ...state, documents: applyOperation(state.documents, op, state.profile) });

  async function open({ exists, pin, confirm, mode = 'standalone', name = 'Administrador' }) {
    const release = await repository.exclusive();
    try {
      let opened;
      if (exists) opened = await repository.decrypt(await repository.readEnvelope(), pin);
      else {
        if (pin !== confirm) throw new Error('Los PIN no coinciden.');
        let state = initialState({ mode, name, device: newId(), userId: newId(), now: now() });
        opened = await repository.create(pin, state);
      }
      return createSession({ opened, repository, release });
    } catch (error) { release(); throw error; }
  }
  async function restore({ file, pin }) {
    const envelope = await files.readBackup(file);
    const release = await repository.exclusive();
    try { return createSession({ opened: await repository.restore(envelope, pin), repository, release }); }
    catch (error) { release(); throw error; }
  }
  function execute(session, { type, target = newId(), payload, draft }) {
    return session.update(state => {
      assertWritable(state, now());
      const next = record(state, operation(state, type, target, payload));
      return draft ? { ...next, draft: { ...draft } } : next;
    });
  }
  function saveDraft(session, draft) {
    // El borrador se guarda por la misma cola de escritura que los pedidos.
    return session.update(state => ({ ...state, draft: { ...draft } }));
  }
  async function attachDesign(session, target, file) {
    const prepared = await files.prepareDesign(file), fileId = newId();
    return session.update(state => {
      assertWritable(state, now());
      const op = operation(state, 'design', target, { fileId, name: prepared.name, hash: prepared.hash });
      // Archivo y operación se guardan juntos: no queda un archivo huérfano si falla el pedido.
      return { ...record(state, op), files: { ...state.files, [fileId]: prepared } };
    });
  }
  async function getDesign(session, target, designId) {
    const state = session.read(), order = materialize(state)[target];
    if (!order || (state.profile.rol !== 'administracion' && order.assignee && order.assignee !== state.profile.id)) throw new Error('No tienes acceso a este pedido.');
    const design = [...order.designs, ...(order.references || [])].find(d => d.id === designId);
    if (!design) throw new Error('No se encontró esa versión del diseño.');
    const cached = state.files[design.fileId] || Object.values(state.files).find(f => f.hash === design.hash);
    if (!cached) throw new Error('El archivo no está en esta copia. Recupera un respaldo que incluya el diseño.');
    const blob = await files.toBlob(cached.url);
    await files.inspect(blob, design.hash);
    return { name: design.name, blob };
  }
  function rename(session, name) {
    return session.update(state => {
      requireAdmin(state);
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw new Error('Indica un nombre de hasta 100 caracteres.');
      return { ...state, profile: { ...state.profile, nombre: name.trim() } };
    });
  }
  async function backup(session) {
    return { name: `Creativa-respaldo-${today(now())}.json`, text: await session.backup() };
  }
  async function demo() {
    return createDemonstration({ files, now: now(), newId });
  }
  return { exists: async () => !!(await repository.readEnvelope()), open, restore, execute, saveDraft,
    demo,
    attachDesign, getDesign, rename, backup,
    lock: session => session.close(), emptyDraft: () => emptyDraft(now()) };
}
