import { materialize } from '../../domain/operations.js';
import { canReadOrder } from '../../domain/assistant/query-policy.js';
import { printBlockers } from '../../domain/production.js';
import { orderActions } from './navigation.js';

function accessibleOrder(session, id) {
  const state = session.read(), order = materialize(state)[id];
  if (!order || !canReadOrder(state.profile, order)) throw new Error('Este pedido ya no está disponible para tu cuenta.');
  return { state, order };
}

// Orquesta tareas existentes. No depende de React, Ollama ni del repositorio.
export function createAssistantWorkflows({ tools, query, now }) {
  return {
    inspect(session, id) {
      const { state, order } = accessibleOrder(session, id);
      const result = query(state, { tool: 'search', term: order.code, day: 'any' }, now());
      const blockers = printBlockers(order);
      const rows = result.rows.filter(row => row.id === id).map(row => !blockers.length ? { ...row, actions: [{ label: 'Continuar en producción', action: { target: 'order-production', orderId: id } }, ...row.actions.filter(item => item.action.target !== 'order-production')] } : row);
      return { ...result, rows, total: 1, source: 'quick', contextOrderId: id,
        summary: `Lo registrado para ${order.client}`,
        reply: order.cancelled ? 'Este pedido está anulado.' : order.stage === 'Entregado' ? 'La entrega ya está registrada.'
          : blockers.length ? 'Estos son los requisitos registrados que faltan para impresión. Puedes abrir el siguiente paso abajo.'
            : `La versión actual tiene aprobación registrada. El trabajo está en ${order.stage}; verifica materiales y máquina antes de continuar.` };
    },
    async run(session, { task, input, signal }) {
      signal?.throwIfAborted();
      if (task === 'message') {
        const { state, order } = accessibleOrder(session, input.orderId), design = order.designs.at(-1);
        if (!design) return { reply: 'Primero adjunta el diseño que revisará el cliente.', actions: orderActions(order, state.profile), contextOrderId: order.id };
        return { result: { kind: 'message', title: 'Mensaje para revisar con el cliente', model: false,
          summary: `${order.client} · ${order.code} · versión ${order.designs.length}: ${design.name}`,
          message: `Hola, ${order.client}. Te compartimos para revisión ${order.product} (${order.qty} unidades), versión ${order.designs.length}: ${design.name}.\nPor favor, confirma nombres, textos, fecha y dirección que aparecen en el diseño. Indícanos cualquier corrección antes de autorizar la impresión.`,
          note: 'Este texto no se ha enviado. Compártelo junto con la versión indicada. La confirmación se registra por separado.',
          actions: [{ label: 'Registrar confirmación del cliente', action: { target: 'design-approval', orderId: order.id } }] }, contextOrderId: order.id };
      }
      const request = { ...input };
      let contextOrderId = null;
      if (['review','compare'].includes(task) && !request.file) {
        const { state, order } = accessibleOrder(session, request.orderId);
        contextOrderId = order.id;
        if (!order.designs.length || (task === 'compare' && order.designs.length < 2)) return {
          reply: task === 'compare' ? 'Necesito dos versiones guardadas para compararlas. Adjunta la nueva versión en Diseños.' : 'Este pedido no tiene archivo de diseño. Puedes adjuntarlo en Diseños o compartir una copia aquí.',
          actions: orderActions(order, state.profile), contextOrderId };
        if (task === 'compare') {
          const pick = design => ({ orderId: order.id, designId: design.id, page: 1 });
          request.first = pick(order.designs.at(-2)); request.second = pick(order.designs.at(-1));
        } else { request.designId = order.designs.at(-1).id; request.page = 1; }
        if (!/\d|:/.test(request.reference || '')) request.reference = '';
      }
      const result = await tools.run(session, { task, input: request, signal });
      signal?.throwIfAborted();
      return { result, contextOrderId, source: result.model ? 'model' : 'quick' };
    },
  };
}
