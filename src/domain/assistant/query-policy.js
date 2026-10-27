export const QUERY_TOOLS = ['pending', 'blocked', 'search', 'unsupported'];
export const QUERY_DAYS = ['any', 'today', 'tomorrow', 'overdue'];

export function validateQuery(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'day,term,tool' ||
      !QUERY_TOOLS.includes(value.tool) || !QUERY_DAYS.includes(value.day) ||
      typeof value.term !== 'string' || value.term.length > 150) {
    throw new Error('La consulta no es válida. Usa una de las consultas rápidas o reformula tu pregunta.');
  }
  if (value.tool === 'search' && !value.term.trim()) throw new Error('Indica un cliente, código o descripción para buscar trabajos.');
  return { tool: value.tool, term: value.term.trim(), day: value.day };
}

export function validateQuestion(question) {
  if (typeof question !== 'string' || !question.trim() || question.length > 1000) {
    throw new Error('Escribe una pregunta de hasta 1000 caracteres.');
  }
  return question.trim();
}

export function canReadOrder(profile, order) {
  return order.kind === 'order' && (profile.rol === 'administracion' ||
    (profile.rol === 'disenador' && (!order.assignee || order.assignee === profile.id)));
}

// Revisiones, no imágenes ni archivos: una actualización de lastSync sin cambios
// de negocio no debe interrumpir al modelo cada 30 segundos.
const revisions = new WeakMap();
export function queryRevision(state) {
  if (revisions.has(state)) return revisions.get(state);
  const value = JSON.stringify([state.mode, state.profile.id, state.profile.rol, state.assistantData?.revision || 0,
    Object.values(state.documents).map(d => [d.id, d.rev, d.assignee || null]).sort((a, b) => a[0].localeCompare(b[0])),
    state.queue.map(op => [op.id, op.target, op.status, op.expected, op.dependsOn, op.actor?.id, op.actor?.rol]),
  ]);
  revisions.set(state, value);
  return value;
}

// Una reasignación o cambio de cuenta borra la conversación, no solo el resultado.
export function conversationAccess(state) {
  return JSON.stringify([state.mode, !!state.demonstration, state.profile.id, state.profile.rol]);
}
