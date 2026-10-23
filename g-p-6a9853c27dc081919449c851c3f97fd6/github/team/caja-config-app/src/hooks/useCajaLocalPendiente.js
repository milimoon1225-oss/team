import { useEffect, useState } from 'react';
import { estadoDeposito } from '../offline/deposito';

export async function comprobarCajaLocal() {
  const estado = await estadoDeposito();
  if (estado.pendientes > 0) throw new Error('Primero sincroniza o revisa los movimientos de Caja guardados en este dispositivo. No vuelvas a registrar esos cobros.');
}

export function useCajaLocalPendiente() {
  const [estado, setEstado] = useState({ comprobando: true, pendientes: 0, error: '' });
  useEffect(() => {
    let activo = true;
    const actualizar = () => estadoDeposito().then(dato => {
      if (activo) setEstado({ comprobando: false, pendientes: dato.pendientes, error: '' });
    }).catch(() => {
      if (activo) setEstado({ comprobando: false, pendientes: 0, error: 'No se pudo comprobar si hay movimientos locales. Vuelve a abrir Creativa antes de registrar otro cobro.' });
    });
    actualizar();
    window.addEventListener('creativa-caja-local-change', actualizar);
    window.addEventListener('focus', actualizar);
    return () => { activo = false; window.removeEventListener('creativa-caja-local-change', actualizar); window.removeEventListener('focus', actualizar); };
  }, []);
  return { ...estado, bloqueado: estado.comprobando || !!estado.error || estado.pendientes > 0 };
}
