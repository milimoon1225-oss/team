import { materialize, makeOperation, applyOperation } from '../domain/operations.js';
import { assertWritable } from '../domain/workspace.js';
import { PREVIEW_MODELS, validatePreview, customerProjection, EFFECTS } from '../domain/preview.js';

export function createPreviewService({ files, presenter, now = () => new Date(), newId = () => crypto.randomUUID() }) {
  function orderFor(state, target) {
    const order = materialize(state)[target];
    if (order?.kind !== 'order' || (state.profile.rol !== 'administracion' && order.assignee !== state.profile.id)) throw new Error('Este pedido no está asignado a tu cuenta.');
    return order;
  }
  async function prepareImage(file) { return { ...await files.preparePreview(file), fileId: newId(), fit: 'contain', rotation: 0, demo: false }; }
  async function prepareMask(file, panel, effect) {
    if (!EFFECTS[effect] || !panel?.url) throw new Error('Carga primero el diseño de esta cara.');
    const mask = await files.preparePreview(file), size = await files.dimensions(panel.url);
    if (mask.width !== size.width || mask.height !== size.height) throw new Error(`La máscara debe medir exactamente ${size.width} × ${size.height} píxeles, igual que su diseño.`);
    return { ...mask, fileId: newId() };
  }
  async function demo(model, sampleId) {
    const prepared = await files.demoPreview(model, sampleId);
    return Object.fromEntries(Object.entries(prepared).map(([slot, image]) => [slot, { ...image, fileId: newId(), fit: 'contain', rotation: 0, demo: true }]));
  }
  function save(session, target, draft) {
    validatePreview(draft);
    return session.update(state => {
      assertWritable(state, now());
      const order = orderFor(state, target);
      if (order.cancelled || order.stage === 'Entregado') throw new Error('El pedido está anulado o ya fue entregado.');
      const stored = { ...state.files }, panels = {};
      function store(p) {
        if (!p.url) throw new Error('Vuelve a cargar las imágenes antes de guardar.');
        stored[p.fileId] = { url: p.url, hash: p.hash, name: p.name };
        return { fileId: p.fileId, hash: p.hash, name: p.name };
      }
      for (const slot of PREVIEW_MODELS[draft.model].slots) {
        const p = draft.panels[slot];
        panels[slot] = { ...store(p), fit: p.fit, rotation: p.rotation, demo: p.demo, masks: Object.fromEntries(Object.entries(p.masks || {}).map(([effect,asset]) => [effect,store(asset)])) };
      }
      const payload = { schema: 1, model: draft.model, widthMm: draft.widthMm, heightMm: draft.heightMm, thicknessMm: draft.thicknessMm, sourceDesignId: draft.sourceDesignId || null, ...(draft.appearance ? { appearance: draft.appearance } : {}), panels };
      const op = makeOperation(state, 'preview', target, payload, { id: newId(), at: now().toISOString() });
      return { ...state, schema: 3, files: stored, documents: applyOperation(state.documents, op, state.profile) };
    });
  }
  async function load(session, target, id) {
    const state = session.read(), order = orderFor(state, target), version = (order.previews || []).find(p => p.id === id);
    if (!version) throw new Error('No se encontró esa versión 3D.');
    validatePreview(version);
    const panels = {};
    async function loadAsset(panel) {
      const cached = state.files[panel.fileId] || Object.values(state.files).find(f => f.hash === panel.hash);
      if (!cached) throw new Error('Falta una imagen local. Recupera un respaldo que incluya el diseño.');
      const blob = await files.toBlob(cached.url);
      const inspected = await files.inspect(blob, panel.hash);
      return { ...panel, url: inspected.url };
    }
    for (const [slot, panel] of Object.entries(version.panels)) {
      const masks = {};
      for (const [effect,asset] of Object.entries(panel.masks || {})) masks[effect] = await loadAsset(asset);
      panels[slot] = { ...await loadAsset(panel), masks };
    }
    return { ...version, panels, versionLabel: `Versión 3D ${(order.previews || []).findIndex(p => p.id === id) + 1}` };
  }
  // Solo se entrega una proyección de imágenes y geometría; nunca el estado de la sesión.
  async function present(session, variants) {
    const projection = customerProjection(variants);
    await presenter.open(projection);
    await session.close();
  }
  return { prepareImage, prepareMask, demo, save, load, present };
}
