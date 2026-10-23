export const metodos = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Otro'];
export const fechaLima = valor => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date(valor || Date.now()));
export const dinero = valor => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(valor || 0));
export const centimos = valor => Math.round(Number(valor || 0) * 100);
export const pendientes = datos => datos.operaciones.filter(op => op.estado !== 'sincronizado');
export const vigente = datos => Date.now() - Date.parse(datos.verificado_en) < 7 * 24 * 60 * 60 * 1000 && Date.now() >= Date.parse(datos.verificado_en) - 300000;
export function saldoPedido(datos, trabajo) {
  const local = pendientes(datos).filter(op => op.tipo === 'abono' && op.trabajo_id === trabajo.id).reduce((total, op) => total + centimos(op.monto), 0);
  return Math.max(0, centimos(trabajo.precio_total) - centimos(trabajo.pagado) - local) / 100;
}
export function movimientosDia(datos, fecha) {
  const remoto = (datos.dias[fecha]?.movimientos || []).map(op => ({ ...op, estado: 'en_linea' }));
  const locales = pendientes(datos).filter(op => fechaLima(op.ocurrido_en) === fecha).map(op => ({ ...op, hora: op.ocurrido_en, origen: 'Este dispositivo', tipo: op.tipo === 'abono' ? 'ingreso' : op.tipo }));
  return [...locales, ...remoto];
}
export function totalMovimientos(movimientos, tipo, metodo) {
  return movimientos.filter(op => op.tipo === tipo && (!metodo || op.metodo === metodo)).reduce((total, op) => total + centimos(op.monto), 0) / 100;
}
export function prepararOperacion(datos, form) {
  if (!vigente(datos)) throw new Error('Actualiza la copia con internet para volver a registrar movimientos. Han pasado 7 días desde la última verificación.');
  const fecha = fechaLima();
  if (datos.dias[fecha]?.cierre) throw new Error('La copia indica que la caja de hoy ya está cerrada. Revisa el cierre con conexión.');
  if (!['ingreso', 'egreso', 'abono'].includes(form.tipo) || !metodos.includes(form.metodo)) throw new Error('Selecciona el tipo y método del movimiento.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(String(form.monto)) || !Number.isFinite(Number(form.monto)) || Number(form.monto) <= 0 || Number(form.monto) > 99999999.99) throw new Error('Ingresa un monto mayor que cero con hasta dos decimales.');
  const trabajo = form.tipo === 'abono' ? datos.trabajos.find(item => item.id === form.trabajo_id) : null;
  if (form.tipo === 'abono' && !trabajo) throw new Error('Selecciona un pedido guardado en este dispositivo.');
  if (trabajo && centimos(form.monto) > centimos(saldoPedido(datos, trabajo))) throw new Error('El monto supera el saldo disponible en esta copia, considerando los cobros pendientes.');
  const concepto = trabajo ? `Cobro de pedido ${trabajo.codigo}` : form.concepto.trim();
  if (concepto.length < 3 || concepto.length > 300) throw new Error('El concepto debe tener entre 3 y 300 caracteres.');
  return { id: crypto.randomUUID(), dispositivo: datos.dispositivo, tipo: form.tipo, ocurrido_en: new Date().toISOString(), concepto, monto: Number(form.monto), metodo: form.metodo, trabajo_id: trabajo?.id || null, estado: 'pendiente', error: '' };
}
export function paraServidor(op) {
  return Object.fromEntries(['id', 'dispositivo', 'tipo', 'ocurrido_en', 'concepto', 'monto', 'metodo', 'trabajo_id'].map(key => [key, op[key]]));
}
export function conservarTrabajo(trabajo) {
  return { id: trabajo.id, codigo: trabajo.codigo, cliente: trabajo.cliente, precio_total: trabajo.precio_total, pagado: trabajo.pagado };
}
