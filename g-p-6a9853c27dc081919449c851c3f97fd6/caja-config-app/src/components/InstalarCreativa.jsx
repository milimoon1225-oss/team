import { useEffect, useState } from 'react';
import { estadoInstalacion, instalar } from '../services/instalacion';

export default function InstalarCreativa() {
  const [datos, setDatos] = useState(estadoInstalacion);
  useEffect(() => {
    const actualizar = () => setDatos(estadoInstalacion());
    window.addEventListener('creativa-instalacion', actualizar);
    return () => window.removeEventListener('creativa-instalacion', actualizar);
  }, []);
  return <article className="admin-card form-card">
    <h2>Creativa en tu dispositivo</h2>
    <p>{datos.escritorio ? 'Estás usando Creativa para escritorio. Tus pedidos se comparten con el celular y el equipo cuando hay conexión.' : datos.instalada ? 'Creativa ya se está usando como aplicación en este dispositivo.' : 'Abre Creativa desde un icono, sin buscar el enlace cada vez.'}</p>
    {!datos.instalada && (datos.disponible ? <button type="button" className="admin-primary" onClick={instalar}>Instalar Creativa</button> : <p>En Android: menú del navegador → Instalar aplicación o Añadir a pantalla de inicio. En iPhone: Safari → Compartir → Añadir a pantalla de inicio.</p>)}
    {!datos.escritorio && <p role="status">{datos.estado === 'lista' ? 'La pantalla de la aplicación está guardada para abrirla sin internet.' : datos.estado === 'actualizacion' ? 'Hay una actualización lista. Termina de guardar y cierra todas las ventanas de Creativa; aparecerá al abrirla otra vez.' : datos.estado === 'error' || datos.estado === 'no-disponible' ? 'Todavía no se confirmó la descarga para abrir sin internet. Abre el enlace publicado con conexión e inténtalo nuevamente.' : 'Preparando la apertura sin internet…'}</p>}
    <p>Los pedidos compartidos requieren conexión. Administración puede preparar por separado Caja sin conexión en este dispositivo.</p>
  </article>;
}
