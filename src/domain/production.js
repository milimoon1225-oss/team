// La aprobación corresponde al último archivo de impresión, no a la vista 3D.
export function hasCurrentApproval(order) {
  return !!order.approval?.designId && order.approval.designId === order.designs?.at(-1)?.id;
}

export function printBlockers(order) {
  const reasons = [];
  if (order.cancelled) reasons.push('El pedido está anulado.');
  if (order.stage === 'Entregado') reasons.push('El pedido ya fue entregado.');
  if (!order.designs?.length) reasons.push('Falta adjuntar el archivo de impresión.');
  if (!hasCurrentApproval(order)) reasons.push('Falta aprobar la versión actual del diseño.');
  if (order.stage === 'Recepción') reasons.push('Primero debe pasar por la etapa de Diseño.');
  return reasons;
}
