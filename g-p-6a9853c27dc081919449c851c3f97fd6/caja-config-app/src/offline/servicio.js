import { supabase } from '../lib/supabase';
import { conservarTrabajo, fechaLima, paraServidor } from './calculos';

export async function rpc(nombre, parametros) {
  const { data, error } = await supabase.rpc(nombre, parametros).abortSignal(AbortSignal.timeout(15000));
  if (error) throw error;
  return data;
}

export async function verificarCuenta(usuario) {
  if (!navigator.onLine) throw new Error('Conecta este dispositivo a internet para preparar o sincronizar Caja.');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Inicia sesión en Creativa con tu cuenta de administración y vuelve a abrir Caja de este dispositivo.');
  if (usuario && session.user.id !== usuario) throw new Error('Esta Caja pertenece a otra cuenta. Inicia sesión con la misma cuenta que la preparó para sincronizar sus movimientos.');
  const estado = await rpc('creativa_caja_offline_estado');
  if (estado?.version !== 1) throw new Error('Todavía falta activar Caja sin conexión en la base de datos.');
  return session.user.id;
}

export async function cargarCopia(usuario) {
  const cuenta = await verificarCuenta(usuario);
  const pedidos = await rpc('creativa_cargar_pedidos');
  if (pedidos?.perfil?.rol !== 'administracion') throw new Error('Solo administración puede preparar Caja sin conexión.');
  const fecha = fechaLima();
  const caja = await rpc('creativa_caja', { p_fecha: fecha });
  return { usuario: cuenta, nombre: pedidos.perfil.nombre, trabajos: pedidos.trabajos.map(conservarTrabajo), dias: { [fecha]: caja }, verificado_en: new Date().toISOString() };
}

export function mensajeLocal(error) {
  if (error?.code === 'PGRST202') return 'Falta activar Caja sin conexión en Supabase. La Caja habitual sigue disponible con internet. Solicita la activación antes de preparar este dispositivo.';
  if (error?.code === '42501' || error?.code === 'PGRST301') return 'La cuenta no tiene acceso vigente a Caja. Vuelve a iniciar sesión con administración. Los movimientos locales se conservan.';
  return error?.message || 'No se pudo completar la operación. La copia local se conserva.';
}

// A received operation is never deleted. Its acknowledgement is saved durably
// before moving to the next one, so a lost reply is safe to retry with the same ID.
export async function sincronizarCola(inicial, guardar) {
  await verificarCuenta(inicial.datos.usuario);
  let actual = inicial;
  for (const op of inicial.datos.operaciones.filter(item => item.estado !== 'sincronizado')) {
    let resultado;
    try {
      resultado = await rpc('creativa_sincronizar_caja', { p_operacion: paraServidor(op) });
      if (resultado?.id !== op.id || resultado.estado !== 'sincronizado' || !resultado.caja) throw new Error('No llegó una confirmación completa. Vuelve a sincronizar sin registrar el cobro otra vez.');
    } catch (error) {
      const revision = /^(P0001|42501|22|23)/.test(error?.code || '');
      actual = await guardar(actual, { ...actual.datos, operaciones: actual.datos.operaciones.map(item => item.id === op.id ? { ...item, estado: revision ? 'revision' : 'pendiente', error: mensajeLocal(error) } : item) });
      if (!revision || error?.code === '42501') throw error;
      continue;
    }
    const datos = actual.datos;
    actual = await guardar(actual, { ...datos,
      dias: { ...datos.dias, [resultado.fecha]: resultado.caja },
      trabajos: resultado.pedido ? datos.trabajos.map(item => item.id === resultado.pedido.id ? conservarTrabajo(resultado.pedido) : item) : datos.trabajos,
      operaciones: datos.operaciones.map(item => item.id === op.id ? { ...item, estado: 'sincronizado', error: '', sincronizado_en: new Date().toISOString() } : item),
    });
  }
  // Refresh balances only after all ambiguous responses have been reconciled.
  if (actual.datos.operaciones.every(op => op.estado === 'sincronizado')) {
    const copia = await cargarCopia(actual.datos.usuario);
    actual = await guardar(actual, { ...actual.datos, ...copia, dias: { ...actual.datos.dias, ...copia.dias } });
  }
  return actual;
}
