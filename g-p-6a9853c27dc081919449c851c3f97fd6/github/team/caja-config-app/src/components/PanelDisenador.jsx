import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { mensajePedido } from "../services/pedidoService";
import SelectorTema from "./SelectorTema";
import InstalarCreativa from "./InstalarCreativa";
import ArchivosPedido from "./ArchivosPedido";
import "./PanelDisenador.css";
import { enlaceGrupoValido } from "./GrupoListos";

function telefonoWhatsApp(valor) {
  let n = String(valor || '').replace(/[^0-9]/g, '');
  if (/^9\d{8}$/.test(n)) n = '51' + n;
  return /^[1-9]\d{9,14}$/.test(n) ? n : '';
}

export default function PanelDisenador({ perfil, trabajos: todos, recargar, cargando, errorCarga, salir, tema, cambiarTema }) {
  const trabajos = todos.filter(t => !t.disponible);
  const disponibles = todos.filter(t => t.disponible);
  const [grupo,setGrupo] = useState('');
  const [confirmados,setConfirmados] = useState({});
  useEffect(() => { let vivo=true; supabase.rpc('creativa_enlace_listos').then(({data,error})=>{if(vivo && !error && enlaceGrupoValido(data))setGrupo(data);});return()=>{vivo=false;}; }, []);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [vista, setVista] = useState('inicio');
  const [filtro, actualizarFiltro] = useState("Activos");
  function setFiltro(valor) { actualizarFiltro(valor); setVista('trabajos'); window.scrollTo({top:0,behavior:'instant'}); }
  function navegar(destino) { setBusqueda(''); if(destino === 'inicio' || destino === 'configuracion') { setVista(destino); window.scrollTo({top:0,behavior:'instant'}); } else setFiltro(destino); }
  const menu = [['inicio','⌂','Inicio'],['Disponibles','＋','Disponibles'],['Activos','▣','Mis trabajos'],['Listo','✓','Listos'],['configuracion','⚙','Configuración']];
  const seleccionado = vista === 'trabajos' ? (filtro === 'Disponibles' || filtro === 'Listo' ? filtro : 'Activos') : vista;
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("fecha");
  const bloqueo = useRef(false);
  const activo = t => t.estado === "Pendiente" || t.estado === "En diseño";
  const normalizar = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Lima" }).format(new Date());
  const fechaDia = t => t.entrega?.slice(0, 10);
  const prioridad = t => !activo(t) || !fechaDia(t) ? "" : fechaDia(t) < hoy ? "Entrega vencida" : fechaDia(t) === hoy ? "Entrega hoy" : "";
  const fechaTexto = t => t.entrega && !Number.isNaN(new Date(t.entrega).getTime()) ? new Date(t.entrega).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Sin fecha asignada";
  const visibles = (filtro === 'Disponibles' ? disponibles : trabajos).filter(t => (filtro === 'Disponibles' || filtro === "Todos" || (filtro === "Activos" ? activo(t) : t.estado === filtro)) && normalizar(`${t.codigo} ${t.cliente} ${t.tipo}`).includes(normalizar(busqueda.trim()))).sort((a,b) => orden === "cliente" ? String(a.cliente || "").localeCompare(String(b.cliente || ""), "es") : (a.entrega || "9999").localeCompare(b.entrega || "9999"));
  async function tomar(id) {
    if(bloqueo.current)return; bloqueo.current=true;setOcupado(id);setError('');setAviso('');
    try {const {error:fallo}=await supabase.rpc('creativa_tomar_trabajo',{p_trabajo:id});if(fallo)throw fallo;setFiltro('En diseño');setAviso('El pedido ya es tuyo y está en diseño. Ahora puedes contactar al cliente.');recargar();}
    catch(e){setError(mensajePedido(e));recargar();}finally{bloqueo.current=false;setOcupado(false);}
  }
  async function copiarResumen(t) {
    try {await navigator.clipboard.writeText(`TRABAJO LISTO\nPedido: ${t.codigo}\nCliente: ${t.cliente}\nTrabajo: ${t.tipo}\nCantidad: ${t.cantidad ?? 'Sin especificar'}\nDiseñador: ${perfil.nombre}\nDiseño listo para recepción.`);setAviso('Resumen copiado. Pégalo en TRABAJOS LISTOS y adjunta el diseño en WhatsApp.');}
    catch {setError('No se pudo copiar. Copia el código y los datos del pedido manualmente.');}
  }
  async function cambiarEstado(id, estado) {
    if (estado === 'Listo' && !confirmados[id]) { setError('Confirma primero que el cliente aprobó el diseño.'); return; }
    if (bloqueo.current) return;
    bloqueo.current = true; setOcupado(id); setError(""); setAviso("");
    try {
      const { error: fallo } = await supabase.rpc("creativa_cambiar_estado", { p_trabajo: id, p_estado: estado });
      if (fallo) throw fallo;
      setAviso(estado === "Listo" ? "Diseño marcado como listo. Recepción ya puede ver el nuevo estado." : "Diseño iniciado. ¡Manos a la obra!");
      await recargar();
    } catch (fallo) { setError(mensajePedido(fallo)); }
    finally { bloqueo.current = false; setOcupado(false); }
  }
  return <div className="design-layout"><aside className="design-sidebar">
    <img src="/brand/creativa-logo.png" alt="Creativa Impresos" width="2172" height="724" />
    <span className="design-sidebar-label">ESPACIO DE DISEÑO</span>
    <nav aria-label="Navegación de diseñador">{menu.map(([id,icono,label])=><button type="button" key={id} aria-current={seleccionado === id ? 'page' : undefined} onClick={()=>navegar(id)}><span aria-hidden="true">{icono}</span>{label}{id === 'Disponibles' && <small>{disponibles.length}</small>}</button>)}</nav>
    <div className="design-sidebar-bottom"><button type="button" disabled={!!ocupado} onClick={salir}>Cerrar sesión</button><div><strong>{perfil.nombre}</strong><small>Diseñador</small></div></div>
  </aside><main className="designer-page">
    {vista === 'configuracion' ? <section className="design-settings"><span className="date">TU ESPACIO</span><h1>Configuración</h1><p>Personaliza tu pantalla y administra tu sesión.</p><article className="form-card"><h2>Mi cuenta</h2><strong>{perfil.nombre}</strong><p>Diseñador · Creativa Impresos</p></article><article className="form-card"><h2>Apariencia</h2><p>Elige cómo prefieres ver tu panel. Se guarda en este navegador.</p><SelectorTema tema={tema} cambiarTema={cambiarTema} /></article><InstalarCreativa /><article className="form-card"><h2>Sesión</h2><p>Cierra tu sesión cuando termines de usar este equipo.</p><button type="button" className="design-signout" onClick={salir} disabled={!!ocupado}>Cerrar sesión</button></article></section> : <>
    {vista === 'inicio' && <>
    <header className="header"><div><span className="date">HECHO CON IDEAS. HECHO EN EQUIPO.</span><h1>Hola, {perfil.nombre} <span className="brand-spark" aria-hidden="true">✦</span></h1><p>Elige un pedido disponible o continúa con tus diseños.</p></div>
      <button type="button" onClick={salir} disabled={ocupado}>Cerrar sesión</button>
    </header>
    <div className="design-overview" aria-label="Resumen de mis pedidos">{[["Pendiente","Por empezar","◷"],["En diseño","En diseño","✎"],["Listo","Listos","✓"],["Entregado","Entregados","▣"]].map(([estado,label,icono]) => <button type="button" key={estado} aria-pressed={filtro === estado} onClick={() => setFiltro(estado)}><span className="design-summary-icon" aria-hidden="true">{icono}</span><span><small>{label}</small><strong>{trabajos.filter(t => t.estado === estado).length}</strong></span></button>)}</div>
    {trabajos.some(t => prioridad(t)) && <div className="design-priority-note"><span aria-hidden="true">◷</span><div><strong>{trabajos.filter(t => prioridad(t)).length} pedidos requieren atención por su fecha</strong><p>Revisa primero las entregas de hoy y las vencidas.</p></div><button type="button" onClick={() => { setFiltro("Activos"); setBusqueda(""); setOrden("fecha"); }}>Ver pendientes</button></div>}
    <div className="design-pool"><div><h2>Trabajos disponibles <span>{disponibles.length}</span></h2><p>Pedidos sin diseñador. Toma uno para comenzar y contactar al cliente.</p></div><button type="button" aria-pressed={filtro === 'Disponibles'} onClick={()=>{setFiltro('Disponibles');setBusqueda('');}}>Ver disponibles</button></div>
    </>}
    <section className="design-workspace" aria-label="Mis trabajos"><div className="design-section-title"><div><h2>{filtro === 'Disponibles' ? 'Trabajos sin asignar' : 'Mis trabajos'}</h2><p>{filtro === 'Disponibles' ? 'Cada pedido solo puede ser tomado por un diseñador.' : 'Tus pedidos asignados, organizados para avanzar.'}</p></div><button type="button" onClick={recargar} disabled={cargando || ocupado}>Actualizar pedidos</button></div>
    <div className="design-filters"><label>Buscar pedido<input type="search" placeholder="Código, cliente o tipo de trabajo" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label><label>Ordenar por<select value={orden} onChange={e => setOrden(e.target.value)}><option value="fecha">Próxima entrega</option><option value="cliente">Nombre del cliente</option></select></label></div>
    <div className="design-tabs" role="group" aria-label="Filtrar trabajos">{["Activos","Pendiente","En diseño","Listo","Entregado","Todos"].map(e => <button type="button" key={e} aria-pressed={filtro === e} onClick={() => setFiltro(e)}>{e === "Pendiente" ? "Por empezar" : e === "Listo" ? "Listos" : e === "Entregado" ? "Entregados" : e}</button>)}</div>
    {cargando && <p role="status">Actualizando…</p>}
    {aviso && <p role="status" className="design-success">{aviso}</p>}
    {(error || errorCarga) && <p role="alert" className="pedido-error">{error || errorCarga}</p>}
    {!cargando && !errorCarga && visibles.length === 0 && <div className="brand-empty"><span aria-hidden="true">✦</span><h2>{filtro === 'Disponibles' ? 'No hay pedidos disponibles' : 'No hay pedidos en esta vista'}</h2><p>{filtro === 'Disponibles' ? 'Actualiza más tarde para ver nuevos trabajos sin asignar.' : 'Puedes revisar los trabajos disponibles o cambiar la búsqueda.'}</p><button type="button" onClick={() => { setBusqueda(""); setFiltro(filtro === 'Disponibles' ? 'Todos' : 'Disponibles'); }}>{filtro === 'Disponibles' ? 'Ver mis trabajos' : 'Buscar trabajos disponibles'}</button></div>}
    <div className="design-result-count" aria-live="polite">{!cargando && !errorCarga && `${visibles.length} pedidos en esta vista`}</div>
    <div className="designer-jobs">{visibles.map((trabajo) => <article key={trabajo.id} className={`form-card design-job ${prioridad(trabajo) ? "design-job-priority" : ""}`}>
      <div className="design-card-top"><span className="designer-job-code">{trabajo.codigo}</span><span className={`badge ${{ "Pendiente": "pending", "En diseño": "designing", "Listo": "ready", "Entregado": "delivered" }[trabajo.estado] || "pending"}`}>{trabajo.estado}</span></div><h2>{trabajo.tipo}</h2>
      <p><strong>Cliente:</strong> {trabajo.cliente}</p>
      {!trabajo.disponible && <div className="design-contact"><p><strong>Teléfono:</strong> {trabajo.telefono || 'Sin teléfono registrado'}</p>{telefonoWhatsApp(trabajo.telefono) ? <a href={`https://wa.me/${telefonoWhatsApp(trabajo.telefono)}?text=${encodeURIComponent(`Hola ${trabajo.cliente}, soy ${perfil.nombre} de Creativa Impresos. Te contacto por el diseño de tu pedido ${trabajo.codigo} (${trabajo.tipo}).`)}`} target="_blank" rel="noopener noreferrer">Contactar al cliente por WhatsApp ↗</a> : <small>Pide a recepción un número válido con código de país.</small>}</div>}
      <p><strong>Cantidad:</strong> {trabajo.cantidad ?? "Sin especificar"}</p>
      <div className={`design-deadline ${prioridad(trabajo) ? "urgent" : ""}`}><span>Fecha de entrega</span><strong>{fechaTexto(trabajo)}</strong>{prioridad(trabajo) && <small>{prioridad(trabajo)}</small>}</div>
      <div className="design-instructions"><span>Indicaciones del pedido</span><p className="pedido-description">{trabajo.descripcion || "Sin indicaciones adicionales."}</p></div>
      {!trabajo.disponible && <ArchivosPedido archivos={trabajo.archivos} />}
      {!trabajo.disponible && trabajo.estado === 'En diseño' && <label className="design-approval"><input type="checkbox" checked={!!confirmados[trabajo.id]} onChange={e=>setConfirmados(s=>({...s,[trabajo.id]:e.target.checked}))} />El cliente confirmó el diseño por WhatsApp</label>}
      <div className="designer-actions">
        {trabajo.disponible && <button type="button" className="save-button" disabled={!!ocupado || cargando} onClick={()=>tomar(trabajo.id)}>{ocupado === trabajo.id ? 'Tomando pedido…' : 'Tomar trabajo'}</button>}
        {!trabajo.disponible && trabajo.estado === "Pendiente" && <button type="button" className="save-button" disabled={!!ocupado || cargando} onClick={() => cambiarEstado(trabajo.id, "En diseño")}>{ocupado === trabajo.id ? "Guardando…" : "Iniciar diseño"}</button>}
        {trabajo.estado === "En diseño" && <button type="button" className="save-button" disabled={!!ocupado || cargando || !confirmados[trabajo.id]} onClick={() => cambiarEstado(trabajo.id, "Listo")}>{ocupado === trabajo.id ? "Guardando…" : "Marcar listo"}</button>}
        {trabajo.estado === "Listo" && <p className="design-finished">✓ Diseño listo · Entrega a cargo de recepción</p>}
        {trabajo.estado === "Entregado" && <p className="design-finished">✓ Pedido entregado</p>}
      </div>
      {trabajo.estado === 'Listo' && <div className="design-handoff"><strong>Enviar a TRABAJOS LISTOS</strong><p>Copia el resumen, abre el grupo y adjunta el diseño aprobado. El envío se realiza en WhatsApp.</p><button type="button" onClick={()=>copiarResumen(trabajo)}>Copiar resumen del pedido</button>{grupo ? <a href={grupo} target="_blank" rel="noopener noreferrer">Abrir grupo TRABAJOS LISTOS ↗</a> : <small>Enlace pendiente. L. Virginia puede agregarlo en Configuración.</small>}</div>}
    </article>)}</div></section>
    </>}
  </main><nav className="design-mobile-nav" aria-label="Navegación móvil de diseñador">{menu.map(([id,icono,label])=><button type="button" key={id} aria-current={seleccionado === id ? 'page' : undefined} onClick={()=>navegar(id)}><span aria-hidden="true">{icono}</span>{label === 'Configuración' ? 'Ajustes' : label}</button>)}</nav></div>;
}
