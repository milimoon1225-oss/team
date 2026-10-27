import { materialize, today } from '../../domain/operations.js';
import { hasCurrentApproval, printBlockers } from '../../domain/production.js';
import { canReadOrder, validateQuery } from '../../domain/assistant/query-policy.js';
import { orderActions } from './navigation.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export function queryWorkspace(state, request, now = new Date()) {
  const query = validateQuery(request);
  if (!['administracion', 'disenador'].includes(state.profile?.rol)) throw new Error('La cuenta no tiene acceso al asistente.');
  const scope = {
    mode: state.mode, lastSync: state.lastSync, stale: false,
    consultedAt: now.toISOString(), localOnly: true,
  };
  if (query.tool === 'unsupported') return { query, scope, rows: [], total: 0,
    summary: 'Puedo consultar pedidos pendientes, bloqueos de impresión y buscar trabajos por cliente, código o descripción. Para otra consulta, indica cuál de esas opciones necesitas.' };
  const date = today(now), tomorrow = today(new Date(now.getTime() + 86400000));
  const words = normalize(query.term).split(/\s+/).filter(Boolean);
  const visible = Object.values(materialize(state)).filter(order => canReadOrder(state.profile, order));
  const matched = visible.filter(order => {
    const active = !order.cancelled && order.stage !== 'Entregado';
    if (query.tool === 'pending' && !active) return false;
    if (query.tool === 'blocked' && (!active || !printBlockers(order).length)) return false;
    const delivery = order.delivery.slice(0, 10);
    if (query.day === 'today' && delivery !== date) return false;
    if (query.day === 'tomorrow' && delivery !== tomorrow) return false;
    if (query.day === 'overdue' && (!active || delivery >= date)) return false;
    const searchable = normalize(`${order.code} ${order.client} ${order.product} ${order.description || ''}`);
    return words.every(word => searchable.includes(word));
  }).sort((a, b) => query.tool === 'search'
    ? b.received.localeCompare(a.received) || a.id.localeCompare(b.id)
    : a.delivery.localeCompare(b.delivery) || a.id.localeCompare(b.id));
  const pending = state.queue.filter(op => op.status !== 'excluded');
  // Proyección explícita: nunca exponer finanzas, archivos, teléfonos, auditorías o claves.
  const rows = matched.slice(0, 30).map(order => ({
    id: order.id, code: order.code, client: order.client, product: order.product, qty: order.qty,
    stage: order.stage, delivery: order.delivery, cancelled: order.cancelled,
    designVersion: order.designs.length, approved: hasCurrentApproval(order),
    blockers: printBlockers(order),
    actions: orderActions(order, state.profile),
    pending: pending.some(op => op.target === order.id),
    review: pending.some(op => op.target === order.id && op.status === 'review'),
  }));
  const labels = matched.length === 1
    ? { pending: 'pedido pendiente', blocked: 'pedido con bloqueos registrados para impresión', search: 'trabajo coincidente' }
    : { pending: 'pedidos pendientes', blocked: 'pedidos con bloqueos registrados para impresión', search: 'trabajos coincidentes' };
  const label = labels[query.tool];
  return { query, scope, rows, total: matched.length,
    summary: `${matched.length} ${label} en los datos disponibles para tu cuenta en esta computadora.` };
}
