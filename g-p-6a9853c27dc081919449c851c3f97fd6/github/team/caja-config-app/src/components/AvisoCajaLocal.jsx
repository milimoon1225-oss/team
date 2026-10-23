export default function AvisoCajaLocal({ estado }) {
  if (!estado.pendientes && !estado.error) return null;
  return <div className="pedido-error" role="status"><p>{estado.error || `Hay ${estado.pendientes} movimiento(s) de Caja por sincronizar o revisar en este dispositivo. Hazlo antes de registrar nuevos cobros aquí o cerrar Caja.`}</p><a href="#caja-local">Abrir Caja de este dispositivo</a></div>;
}
