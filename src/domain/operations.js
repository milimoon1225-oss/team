import { validatePreview } from './preview.js';
import { hasCurrentApproval } from './production.js';
import { validateAssistantData } from './assistant/tools.js';
export const STAGES = ['Recepción', 'Diseño', 'Impresión', 'Acabado', 'Control de calidad', 'Listo', 'Entregado'];
export const METHODS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Otro'];
export const today = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date(date));
export const money = cents => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format((cents || 0) / 100);
export function cents(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) throw new Error('Usa un importe positivo con hasta dos decimales.');
  const n = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(n) || n > 9999999999) throw new Error('Importe fuera de rango.');
  return n;
}
export const paid = doc => (doc.payments || []).reduce((n, p) => n + p.amount, 0);
export const costs = doc => (doc.costs || []).reduce((n, p) => n + p.amount, 0);
const text = (v, max = 500) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const positive = n => Number.isSafeInteger(n) && n > 0 && n <= 9999999999;
const assert = (test, message) => { if (!test) throw new Error(message); };
export function validateDocument(doc) {
  assert(doc && typeof doc.id === 'string' && Number.isInteger(doc.rev) && doc.rev >= 0, 'Documento no válido.');
  if (doc.kind === 'order') {
    assert(text(doc.client, 150) && text(doc.product, 150), 'Completa cliente y trabajo.');
    assert(typeof doc.phone === 'string' && doc.phone.length <= 20, 'Teléfono demasiado largo.');
    assert(Number.isSafeInteger(doc.total) && doc.total >= 0 && doc.total <= 9999999999, 'Precio no válido.');
    assert(Number.isInteger(doc.qty) && doc.qty > 0 && doc.qty <= 2147483647, 'Cantidad no válida.');
    assert(STAGES.includes(doc.stage), 'Etapa desconocida.');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(doc.received) && Number.isFinite(Date.parse(doc.received)) && Number.isFinite(Date.parse(doc.delivery)) && doc.delivery.slice(0, 10) >= doc.received, 'Revisa las fechas.');
    assert(Array.isArray(doc.payments) && Array.isArray(doc.costs) && Array.isArray(doc.designs), 'Historial incompleto.');
    if(doc.previews!==undefined){assert(Array.isArray(doc.previews),'Historial 3D no válido.');for(const p of doc.previews)validatePreview(p);}
    assert(doc.payments.every(p => Number.isSafeInteger(p.amount) && p.amount !== 0 && METHODS.includes(p.method)), 'Pago no válido.');
    assert(paid(doc) >= 0 && paid(doc) <= doc.total, 'El saldo del pedido no cuadra.');
    assert(doc.costs.every(c => positive(c.amount) && ['Material', 'Mano de obra', 'Tercerización', 'Desperdicio', 'Otro'].includes(c.category) && text(c.concept)), 'Costo no válido.');
  } else if (doc.kind === 'movement') {
    assert(positive(doc.amount) && ['ingreso', 'egreso'].includes(doc.type) && METHODS.includes(doc.method) && text(doc.concept, 300), 'Movimiento no válido.');
  } else if (doc.kind === 'closing') assert(Number.isSafeInteger(doc.counted) && doc.counted >= 0 && Number.isSafeInteger(doc.expected), 'Cierre no válido.');
  else throw new Error('Tipo de documento desconocido.');
  assert(Array.isArray(doc.audit), 'Falta el historial de cambios.');
  return doc;
}
export function cashEntries(docs, date) {
  return Object.values(docs).flatMap(d => d.kind === 'movement' && today(d.at) === date ? [{ ...d, amount: d.type === 'egreso' ? -d.amount : d.amount }]
    : d.kind === 'order' ? d.payments.filter(p => today(p.at) === date).map(p => ({ ...p, concept: `${p.amount < 0 ? 'Devolución' : 'Cobro'} ${d.code}` })) : []);
}
export function applyOperation(documents, op, profile) {
  const docs = structuredClone(documents);
  const p = op.payload;
  let d = docs[op.target];
  const admin = profile.rol === 'administracion';
  assert(admin || ['assign', 'design', 'approve', 'stage', 'preview'].includes(op.type), 'Solo administración puede realizar esta operación.');
  if (!admin) assert(d && (d.assignee === profile.id || (op.type === 'assign' && !d.assignee)), 'El trabajo no está asignado a tu cuenta.');
  if (op.type === 'create') {
    assert(!d, 'Este pedido ya existe.');
    d = { id: op.target, kind: 'order', rev: 0, code: `PC-${op.target.replaceAll('-', '').slice(0, 16).toUpperCase()}`, client: p.client, phone: p.phone || '', product: p.product, qty: p.qty, received: p.received, delivery: p.delivery, description: p.description || '', total: p.total, stage: 'Recepción', assignee: null, cancelled: false, designs: [], approval: null, payments: [], costs: [], audit: [] };
    // Nunca aceptar campos de historial enviados en el formulario.
    d.id = op.target; d.kind = 'order'; d.rev = 0;
  } else if (op.type === 'movement') {
    assert(!d, 'Este movimiento ya existe.');
    d = { id: op.target, kind: 'movement', rev: 0, ...p, at: op.at, audit: [] };
  } else if (op.type === 'close') {
    assert(!Object.values(docs).some(x => x.kind === 'closing' && x.date === p.date), 'La Caja de esa fecha ya está cerrada.');
    assert(p.date === today(op.at), 'Solo puedes cerrar la Caja de hoy.');
    const entries = cashEntries(docs, p.date);
    d = { id: op.target, kind: 'closing', rev: 0, date: p.date, counted: p.counted, expected: entries.filter(x => x.method === 'Efectivo').reduce((n, x) => n + x.amount, 0), entries, audit: [] };
  } else {
    assert(d?.kind === 'order', 'No se encontró el pedido.');
    assert(!d.cancelled || ['refund', 'cost'].includes(op.type), 'El pedido está anulado.');
    if (op.type === 'payment') {
      assert(positive(p.amount) && p.amount <= d.total - paid(d) && METHODS.includes(p.method), 'El cobro supera el saldo o el importe no es válido.');
      d.payments.push({ id: op.id, ...p, at: op.at, by: profile.nombre });
    } else if (op.type === 'refund') {
      const original = d.payments.find(x => x.id === p.paymentId && x.amount > 0);
      const refunded = d.payments.filter(x => x.paymentId === p.paymentId).reduce((n, x) => n - x.amount, 0);
      assert(original && positive(p.amount) && p.amount <= original.amount - refunded && text(p.reason), 'Selecciona el cobro y un importe disponible; explica la devolución.');
      d.payments.push({ id: op.id, paymentId: p.paymentId, amount: -p.amount, method: original.method, reason: p.reason, at: op.at, by: profile.nombre });
    } else if (op.type === 'cost') {
      d.costs.push({ id: op.id, ...p, at: op.at, by: profile.nombre });
    } else if (op.type === 'design') {
      assert(text(p.name, 255) && text(p.hash, 64) && /^[a-f0-9]{64}$/.test(p.hash), 'Adjunta un archivo de diseño válido.');
      d.designs.push({ id: op.id, ...p, at: op.at, by: profile.nombre }); d.approval = null;
    } else if (op.type === 'preview') {
      validatePreview(p);
      assert(d.stage!=='Entregado', 'El pedido ya fue entregado.');
      assert(!p.sourceDesignId || d.designs.some(x=>x.id===p.sourceDesignId),'No se encontró el archivo de impresión vinculado.');
      d.previews=[...(d.previews||[]),{...p,id:op.id,at:op.at,by:profile.nombre}];
    } else if (op.type === 'approve') {
      assert(d.designs.at(-1)?.id === p.designId && text(p.customer, 150), 'Aprueba la última versión e indica quién confirmó.');
      d.approval = { ...p, by: profile.nombre, at: op.at };
    } else if (op.type === 'stage') {
      const previous = STAGES.indexOf(d.stage), next = STAGES.indexOf(p.stage);
      assert(next >= 0 && (next === previous + 1 || (next < previous && text(p.reason))), 'Avanza una etapa o explica el retroceso.');
      if (!admin) assert(next <= STAGES.indexOf('Listo'), 'La entrega corresponde a administración.');
      if (next >= STAGES.indexOf('Impresión')) assert(hasCurrentApproval(d), 'Falta aprobar la versión actual del diseño.');
      if (p.stage === 'Entregado' && paid(d) < d.total) assert(text(p.reason), 'Explica por qué se entrega con saldo pendiente.');
      d.stage = p.stage;
    } else if (op.type === 'cancel') {
      assert(text(p.reason), 'Indica el motivo de anulación.'); d.cancelled = true; d.cancelReason = p.reason;
    } else if (op.type === 'assign') {
      assert(admin || p.assignee === profile.id, 'Solo puedes tomar el trabajo para tu cuenta.');
      assert(d.stage !== 'Entregado', 'El pedido ya fue entregado.'); d.assignee = p.assignee || null;
    } else throw new Error('Operación desconocida.');
  }
  if (['payment', 'refund', 'movement'].includes(op.type)) assert(!Object.values(docs).some(x => x.kind === 'closing' && x.date === today(op.at)), 'Caja cerrada: registra la corrección en una jornada abierta.');
  d.audit.push({ id: op.id, type: op.type, at: op.at, by: profile.nombre, reason: p.reason || op.reviewReason || '' });
  d.rev += 1;
  validateDocument(d); docs[d.id] = d;
  return docs;
}
export function materialize(state) {
  let docs = structuredClone(state.documents);
  for (const op of state.queue) {
    if (op.status === 'excluded' || docs[op.target]?.audit.some(a => a.id === op.id)) continue;
    try { docs = applyOperation(docs, op, op.actor); } catch { /* Un conflicto se conserva para revisión. */ }
  }
  return docs;
}
export function makeOperation(state, type, target, payload, { id = crypto.randomUUID(), at = new Date().toISOString() } = {}) {
  const previous = state.queue.findLast(o => o.target === target && o.status !== 'excluded');
  const op = { id, type, target, payload, at, actor: state.profile, expected: state.documents[target]?.rev || 0, dependsOn: previous?.id || null, status: 'pending' };
  applyOperation(materialize(state), op, state.profile);
  return op;
}
export function validateState(state) {
  validateAssistantData(state?.assistantData);
  assert([2,3].includes(state?.schema) && state.mode === 'standalone' && text(state.device) && text(state.profile?.id) && text(state.profile?.nombre) && ['administracion','disenador'].includes(state.profile.rol), 'Respaldo incompatible.');
  assert(state.documents && typeof state.documents === 'object' && !Array.isArray(state.documents) && Array.isArray(state.queue) && state.queue.length <= 100000 && Number.isSafeInteger(state.cursor) && state.cursor >= 0, 'Respaldo incompleto.');
  for (const [key, doc] of Object.entries(state.documents)) { assert(key === doc.id, 'Identificador inconsistente.'); validateDocument(doc); }
  for (const op of state.queue) assert(text(op.id) && text(op.target) && text(op.type) && op.actor?.id === state.profile.id && op.payload && ['pending','review','excluded'].includes(op.status), 'Cola incompatible.');
  return state;
}
