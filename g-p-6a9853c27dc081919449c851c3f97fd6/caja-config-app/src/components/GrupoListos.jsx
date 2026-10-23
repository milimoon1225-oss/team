import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
export function enlaceGrupoValido(url) { return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(?:\?[A-Za-z0-9=&_-]+)?$/.test(url || ''); }
export default function GrupoListos() {
  const [url,setUrl]=useState(''); const [estado,setEstado]=useState(''); const [ocupado,setOcupado]=useState(false); const [listo,setListo]=useState(false);
  useEffect(()=>{let activo=true; supabase.rpc('creativa_enlace_listos').then(({data,error})=>{if(activo){if(error)setEstado('Activa la actualización de Diseñadores para configurar este enlace.');else {setUrl(data || '');setListo(true);}}});return()=>{activo=false;};},[]);
  async function guardar(e){e.preventDefault();if(ocupado)return; if(url.trim() && !enlaceGrupoValido(url.trim())){setEstado('Pega un enlace de invitación de chat.whatsapp.com.');return;}setOcupado(true);const {error}=await supabase.rpc('creativa_guardar_enlace_listos',{p_url:url.trim()});setEstado(error ? 'No se pudo guardar el enlace. Intenta nuevamente.' : 'Enlace del grupo guardado.');setOcupado(false);}
  return <div className="admin-card"><h2>WhatsApp · TRABAJOS LISTOS</h2><p>Pega aquí el enlace de invitación del grupo de L. Virginia. El equipo podrá abrirlo desde cada diseño listo.</p><form onSubmit={guardar}><label>Enlace del grupo<input type="url" placeholder="https://chat.whatsapp.com/…" value={url} disabled={!listo || ocupado} onChange={e=>setUrl(e.target.value)} /></label><button className="admin-primary" disabled={!listo || ocupado}>Guardar enlace del grupo</button></form>{estado && <p role="status">{estado}</p>}</div>;
}
