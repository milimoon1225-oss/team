import { materialize } from '../../domain/operations.js';
import { canReadOrder } from '../../domain/assistant/query-policy.js';
import { hasCurrentApproval } from '../../domain/production.js';

const orderTargets = ['order-detail', 'design-upload', 'design-approval', 'order-production', 'order-preview'];
const commonTargets = ['orders', 'production', 'settings'];
const adminTargets = ['new-order', 'clients', 'cash', 'reports'];

export function orderActions(order, profile) {
  const action = (label, target) => ({ label, action: { target, orderId: order.id } });
  const actions = [];
  if (!order.cancelled && order.stage !== 'Entregado') {
    if (!order.designs.length) actions.push(action('Adjuntar diseño', 'design-upload'));
    else if (!hasCurrentApproval(order)) actions.push(action('Revisar aprobación', 'design-approval'));
    if (order.stage === 'Recepción') actions.push(action('Abrir producción', 'order-production'));
    if (profile.rol === 'administracion' || order.assignee === profile.id) actions.push(action(order.previews?.length ? 'Ver presentación 3D' : 'Preparar vista 3D', 'order-preview'));
  }
  actions.push(action('Ver pedido', 'order-detail'));
  return actions;
}

// Devuelve destinos semánticos. React decide cómo mostrar cada destino.
export function resolveAssistantAction(state, action) {
  if (!action || typeof action !== 'object' || Array.isArray(action) || typeof action.target !== 'string') throw new Error('Destino no válido.');
  if (!['administracion', 'disenador'].includes(state.profile.rol)) throw new Error('La cuenta no tiene acceso.');
  if (orderTargets.includes(action.target)) {
    if (Object.keys(action).sort().join(',') !== 'orderId,target' || typeof action.orderId !== 'string') throw new Error('Destino no válido.');
    const order = materialize(state)[action.orderId];
    if (!order || !canReadOrder(state.profile, order)) throw new Error('Este pedido ya no está disponible para tu cuenta. Actualiza la consulta.');
    if (action.target === 'order-preview' && state.profile.rol !== 'administracion' && order.assignee !== state.profile.id) throw new Error('Primero toma el trabajo desde Producción para preparar su vista 3D.');
    return { target: action.target, orderId: order.id };
  }
  if (Object.keys(action).join(',') !== 'target' || !(commonTargets.includes(action.target) || (state.profile.rol === 'administracion' && adminTargets.includes(action.target)))) throw new Error('Tu cuenta no tiene acceso a ese destino.');
  return { target: action.target };
}
