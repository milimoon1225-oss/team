import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import SelectorTema from './SelectorTema';
import GrupoListos from './GrupoListos';
import InstalarCreativa from './InstalarCreativa';
import { comprobarCajaLocal, useCajaLocalPendiente } from '../hooks/useCajaLocalPendiente';
import AvisoCajaLocal from './AvisoCajaLocal';
import './Administracion.css';
const dinero = n => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(n || 0));
const hoy = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date());
const metodos = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Otro'];
async function llamar(nombre, parametros) {
  const { data, error } = await supabase.rpc(nombre, parametros);
  if (error) throw error;
  return data;
}
const mensaje = e => e.code === 'PGRST202' ? 'Esta sección necesita activar su actualización en la base de datos. Los datos existentes se conservan.' : e.message || 'No se pudo completar la operación. Intenta nuevamente.';
const clave = 'creativa-movimiento-pendiente';
function leerPendiente() { try { return JSON.parse(sessionStorage.getItem(clave) || 'null'); } catch { return null; } }
export function Caja({ trabajos, abrirPago, abrirCajaLocal }) {
  const local = useCajaLocalPendiente();
  const [fecha, setFecha] = useState(hoy);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [revision, setRevision] = useState(0);
  const [pendiente, setPendiente] = useState(leerPendiente);
  const [form, setForm] = useState({ tipo: 'egreso', concepto: '', monto: '', metodo: 'Efectivo' });
  const [contado, setContado] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const bloqueo = useRef(false);
  useEffect(() => {
    let activo = true; setCargando(true); setDatos(null); setError('');
    llamar('creativa_caja', { p_fecha: fecha }).then(d => { if (activo) setDatos(d); })
      .catch(e => { if (activo) setError(mensaje(e)); }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [fecha, revision]);
  const movimientos = datos?.movimientos || [];
  const suma = (tipo, metodo) => movimientos.filter(m => m.tipo === tipo && (!metodo || m.metodo === metodo)).reduce((s, m) => s + Math.round(Number(m.monto) * 100), 0) / 100;
  const efectivo = suma('ingreso', 'Efectivo') - suma('egreso', 'Efectivo');
  const cambiar = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  async function registrar(e) {
    e.preventDefault(); if (bloqueo.current) return;
    bloqueo.current = true; setOcupado(true); setError(''); setAviso('');
    let intento = pendiente;
    try {
      await comprobarCajaLocal();
      if (!intento) {
        intento = { p_id: crypto.randomUUID(), p_tipo: form.tipo, p_concepto: form.concepto.trim(), p_monto: Number(form.monto), p_metodo: form.metodo };
        sessionStorage.setItem(clave, JSON.stringify(intento)); setPendiente(intento);
      }
      await llamar('creativa_movimiento', intento);
      sessionStorage.removeItem(clave); setPendiente(null);
      setForm({ tipo: 'egreso', concepto: '', monto: '', metodo: 'Efectivo' });
      setFecha(hoy()); setRevision(r => r + 1); setAviso('Movimiento registrado.');
    } catch (e) {
      if (/^(P0001|42501|22|23|PGRST202)/.test(e.code || '')) { sessionStorage.removeItem(clave); setPendiente(null); }
      setError(mensaje(e));
    } finally { bloqueo.current = false; setOcupado(false); }
  }
  async function cerrar(e) {
    e.preventDefault(); if (bloqueo.current) return;
    bloqueo.current = true; setOcupado(true); setError('');
    try { await comprobarCajaLocal(); await llamar('creativa_cerrar_caja', { p_contado: Number(contado) }); setCerrando(false); setRevision(r => r + 1); setAviso('Cierre guardado.'); }
    catch (e) { setError(mensaje(e)); } finally { bloqueo.current = false; setOcupado(false); }
  }
  return <section className="administracion caja-panel">
    <AvisoCajaLocal estado={local} />
    <div className="admin-card caja-local-access"><div><strong>Caja en este dispositivo</strong><p>Prepara el guardado de cobros y salidas para los cortes de internet. Cada dispositivo conserva sus propios pendientes.</p></div><button type="button" onClick={abrirCajaLocal}>Abrir Caja sin conexión</button></div>
    <header className="caja-hero"><div><span className="admin-eyebrow">TU NEGOCIO, EN ORDEN</span><h1>Control de caja</h1><p>Todo lo que entra y sale, en un solo lugar.</p></div><div className="caja-status"><span aria-hidden="true">{datos?.cierre ? '✓' : 'S/'}</span><div><strong>{cargando ? 'Consultando caja' : !datos ? 'Sin conexión a caja' : datos.cierre ? 'Día cerrado' : fecha === hoy() ? 'Caja abierta' : 'Consulta del día'}</strong><small>Control diario · Soles</small></div></div></header>
    <div className="admin-toolbar"><label>Fecha<input type="date" value={fecha} max={hoy()} disabled={ocupado} onChange={e => { if (e.target.value) { setFecha(e.target.value); setCerrando(false); } }} /></label><button disabled={ocupado || cargando} onClick={() => setRevision(r => r + 1)}>Actualizar</button></div>
    {error && <p role="alert" className="pedido-error">{error}</p>}{aviso && <p role="status" className="admin-success">{aviso}</p>}
    {cargando && <p role="status">Cargando caja…</p>}
    {datos && <>
      <div className="admin-stats">{[['Ingresos', suma('ingreso'), '↙', 'Dinero recibido', 'ingresos'], ['Salidas', suma('egreso'), '↗', 'Gastos registrados', 'salidas'], ['Movimiento neto', suma('ingreso') - suma('egreso'), '⇄', 'Ingresos menos salidas', 'neto'], ['Efectivo esperado', efectivo, 'S/', 'Disponible para el arqueo', 'efectivo']].map(([titulo, valor, icono, ayuda, tono]) => <article className={`caja-stat ${tono}`} key={titulo}><div className="caja-stat-top"><span>{titulo}</span><span className="caja-stat-icon" aria-hidden="true">{icono}</span></div><strong>{dinero(valor)}</strong><small>{ayuda}</small></article>)}</div>
      <div className="admin-card"><h2>Por método de pago</h2><div className="admin-methods">{metodos.map(m => <div key={m}><span>{m}</span><strong>{dinero(suma('ingreso', m) - suma('egreso', m))}</strong></div>)}</div><p>Registra el fondo de apertura como ingreso en efectivo. Los pagos de pedidos aparecen automáticamente: no los registres otra vez aquí.</p></div>
      {fecha === hoy() && (!datos.cierre || pendiente) && <form className="admin-card caja-registro" onSubmit={registrar}><div className="caja-section-heading"><div><span className="admin-eyebrow">NUEVO MOVIMIENTO</span><h2>¿Qué necesitas registrar?</h2><p>Elige una opción y completa los datos.</p></div></div>
        <div className="caja-actions" role="group" aria-label="Tipo de movimiento">{[['ingreso','+','Registrar ingreso','Fondo de apertura u otro ingreso'],['egreso','−','Registrar salida','Materiales, servicios y otros gastos']].map(([tipo,icono,titulo,ayuda]) => <button key={tipo} type="button" aria-pressed={form.tipo === tipo} disabled={ocupado || !!pendiente} onClick={() => setForm(f => ({ ...f, tipo }))}><span aria-hidden="true">{icono}</span><div><strong>{titulo}</strong><small>{ayuda}</small></div><span aria-hidden="true">{form.tipo === tipo ? '●' : '○'}</span></button>)}</div>
        <fieldset disabled={ocupado || !!pendiente}><div className="admin-fields">
          <label>Tipo<select name="tipo" value={form.tipo} onChange={cambiar}><option value="egreso">Salida / gasto</option><option value="ingreso">Otro ingreso / fondo de apertura</option></select></label>
          <label>Monto (S/)<input name="monto" type="number" min="0.01" max="99999999.99" step="0.01" required value={form.monto} onChange={cambiar} /></label>
          <label>Método<select name="metodo" value={form.metodo} onChange={cambiar}>{metodos.map(m => <option key={m}>{m}</option>)}</select></label>
          <label>Concepto<input name="concepto" required minLength={3} maxLength={300} placeholder="Ej.: Almuerzos o compra de papel" value={form.concepto} onChange={cambiar} /></label>
        </div></fieldset>
        {form.tipo === 'egreso' && <div className="admin-quick-filters" role="group" aria-label="Salidas frecuentes"><button type="button" disabled={ocupado || !!pendiente} onClick={()=>setForm(f=>({...f,concepto:'Almuerzos'}))}>Almuerzos</button><span>Completa el monto total y el método de pago.</span></div>}
        {pendiente && <p>Hay un intento pendiente por {dinero(pendiente.p_monto)}: {pendiente.p_concepto}. Confírmalo para evitar duplicarlo.</p>}
        <button className="admin-primary" disabled={ocupado || local.bloqueado}>{ocupado ? 'Guardando…' : pendiente ? 'Confirmar movimiento pendiente' : 'Guardar movimiento'}</button>
      </form>}
      <div className="admin-card caja-movimientos"><div className="caja-section-heading"><h2>Movimientos del día</h2><span className="caja-count">{movimientos.length} registros</span></div>{movimientos.length === 0 ? <div className="caja-empty"><span aria-hidden="true">⇄</span><strong>Tu caja está lista para empezar</strong><p>Los cobros y movimientos de esta fecha aparecerán aquí.</p></div> : movimientos.map(m => <article className="admin-row" key={`${m.origen}-${m.id}`}><span className={`caja-row-icon ${m.tipo}`} aria-hidden="true">{m.tipo === 'egreso' ? '↗' : '↙'}</span><div><strong>{m.concepto}</strong><small><span className="caja-method-tag">{m.metodo}</span> {m.origen} · {m.responsable}</small></div><strong className={m.tipo === 'egreso' ? 'admin-out' : 'admin-in'}>{m.tipo === 'egreso' ? '−' : '+'}{dinero(m.monto)}</strong></article>)}</div>
      <div className="admin-card caja-cierre"><span className="admin-eyebrow">AL TERMINAR TU DÍA</span><h2>Cierre diario</h2>{datos.cierre ? <><p className="admin-success">Cierre guardado</p><p>Efectivo esperado al cierre: <b>{dinero(datos.cierre.esperado)}</b></p><p>Efectivo contado: <b>{dinero(datos.cierre.contado)}</b></p><p>Diferencia: <b>{dinero(Number(datos.cierre.contado) - Number(datos.cierre.esperado))}</b></p>{JSON.stringify(datos.cierre.resumen) !== JSON.stringify(movimientos) && <p role="alert">Hay movimientos de pedidos posteriores al cierre. El cierre conserva su resumen original; revisa los nuevos cobros antes del siguiente arqueo.</p>}</> : fecha === hoy() ? <>
        <p>Confirma primero que la PC y el celular sincronizaron todos sus movimientos. Cuenta solo el efectivo físico. Yape, Plin y transferencias se muestran por separado. El cierre guarda una fotografía del día; los cobros posteriores de pedidos se señalarán al actualizar.</p>
        {!cerrando ? <button disabled={!!pendiente || ocupado || local.bloqueado} onClick={() => setCerrando(true)}>Preparar cierre</button> : <form onSubmit={cerrar}><label>Efectivo contado (S/)<input required type="number" min="0" max="99999999.99" step="0.01" value={contado} onChange={e => setContado(e.target.value)} disabled={ocupado} /></label><p>Diferencia: {dinero(Number(contado || 0) - efectivo)}</p><button className="admin-primary" disabled={ocupado || local.bloqueado}>Confirmar cierre del día</button> <button type="button" disabled={ocupado} onClick={() => setCerrando(false)}>Volver</button></form>}
      </> : <p>No se registró un cierre para esta fecha.</p>}</div>
    </>}
    <div className="admin-card"><h2>Pedidos por cobrar</h2><p>Registra cada cobro en su pedido para actualizar también el saldo del cliente.</p>{trabajos.filter(t => Number(t.precio_total) > Number(t.pagado)).map(t => <article className="admin-row" key={t.id}><div><strong>{t.codigo} · {t.cliente}</strong><small>Pendiente: {dinero(Number(t.precio_total) - Number(t.pagado))}</small></div><button onClick={() => abrirPago(t)}>Registrar pago</button></article>)}{!trabajos.some(t => Number(t.precio_total) > Number(t.pagado)) && <p>No hay saldos pendientes.</p>}</div>
  </section>;
}
export function Configuracion({ perfil, tema, cambiarTema, abrirCajaLocal }) {
  const [form, setForm] = useState(null); const [error, setError] = useState(''); const [aviso, setAviso] = useState(''); const [ocupado, setOcupado] = useState(false); const [revision, setRevision] = useState(0);
  useEffect(() => { let activo = true; setError(''); llamar('creativa_configuracion').then(d => { if (activo) setForm(d); }).catch(e => { if (activo) setError(mensaje(e)); }); return () => { activo = false; }; }, [revision]);
  async function guardar(e) { e.preventDefault(); if (ocupado) return; setOcupado(true); setError(''); setAviso(''); try { const d = await llamar('creativa_guardar_configuracion', { p_nombre: form.nombre, p_telefono: form.telefono, p_direccion: form.direccion }); setForm(d); setAviso('Datos del negocio guardados.'); } catch (e) { setError(mensaje(e)); } finally { setOcupado(false); } }
  return <section className="administracion"><header><span className="admin-eyebrow">A TU MANERA</span><h1>Configuración</h1><p>Datos del negocio y preferencias de tu pantalla.</p></header>
    {error && <div role="alert" className="pedido-error">{error}<button onClick={() => setRevision(r => r + 1)}>Reintentar</button></div>}{aviso && <p className="admin-success" role="status">{aviso}</p>}
    <div className="admin-card"><h2>Datos del negocio</h2>{!form ? <p>{error ? 'Datos no disponibles.' : 'Cargando datos…'}</p> : <form onSubmit={guardar}><fieldset disabled={ocupado}><div className="admin-fields">{[['nombre','Nombre del negocio',100],['telefono','Teléfono / WhatsApp',30],['direccion','Dirección',250]].map(([key,label,max]) => <label key={key}>{label}<input type={key === 'telefono' ? 'tel' : 'text'} required={key === 'nombre'} minLength={key === 'nombre' ? 2 : undefined} maxLength={max} value={form[key]} onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setAviso(''); }} /></label>)}</div></fieldset><button className="admin-primary" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar datos'}</button></form>}</div>
    <div className="admin-card"><h2>Apariencia</h2><p>Esta preferencia se guarda en este navegador.</p><SelectorTema tema={tema} cambiarTema={cambiarTema} /></div>
    <GrupoListos />
    <div className="admin-card"><h2>Caja sin conexión</h2><p>Prepara este dispositivo con conexión y un PIN propio. Los cobros y salidas se guardan aquí y se envían al sistema cuando regresa internet. El cierre diario requiere sincronizar primero.</p><button type="button" className="admin-primary" onClick={abrirCajaLocal}>Preparar / abrir Caja de este dispositivo</button></div>
    <InstalarCreativa />
    <div className="admin-card"><h2>Mi cuenta</h2><p><strong>{perfil.nombre}</strong> · Administración</p><p>Moneda: soles (S/). Zona horaria de Caja: Lima, Perú.</p></div>
  </section>;
}
