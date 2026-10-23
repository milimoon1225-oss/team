import { useEffect, useRef, useState } from 'react';
import { crearDeposito, desbloquearDeposito, estadoDeposito, guardarDeposito, leerSobre, tomarBloqueo } from './deposito';
import { cargarCopia, mensajeLocal, sincronizarCola } from './servicio';
import { dinero, fechaLima, metodos, movimientosDia, pendientes, prepararOperacion, saldoPedido, totalMovimientos, vigente } from './calculos';
import './CajaLocal.css';

const vacio = { tipo: 'egreso', concepto: '', monto: '', metodo: 'Efectivo', trabajo_id: '' };
export default function CajaLocal({ onClose }) {
  const [existe, setExiste] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [pin, setPin] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [propio, setPropio] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [red, setRed] = useState(navigator.onLine);
  const [form, setForm] = useState(vacio);
  const [busqueda, setBusqueda] = useState('');
  const [fecha, setFecha] = useState(fechaLima);
  const actual = useRef(null);
  const liberacion = useRef(null);
  const trabajando = useRef(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    estadoDeposito().then(d => { if (vivo.current) setExiste(d.existe); }).catch(e => setError(mensajeLocal(e)));
    const conexion = () => setRed(navigator.onLine);
    window.addEventListener('online', conexion); window.addEventListener('offline', conexion);
    return () => { vivo.current = false; window.removeEventListener('online', conexion); window.removeEventListener('offline', conexion); liberacion.current?.(); liberacion.current = null; actual.current = null; };
  }, []);

  function bloquear() {
    if (trabajando.current) return;
    actual.current = null; setAbierto(null); setPin(''); setConfirmacion('');
    liberacion.current?.(); liberacion.current = null;
  }
  useEffect(() => {
    if (!abierto) return;
    let timer;
    const reiniciar = () => { clearTimeout(timer); timer = setTimeout(() => { if (trabajando.current) reiniciar(); else bloquear(); }, 10 * 60 * 1000); };
    reiniciar(); window.addEventListener('pointerdown', reiniciar); window.addEventListener('keydown', reiniciar);
    return () => { clearTimeout(timer); window.removeEventListener('pointerdown', reiniciar); window.removeEventListener('keydown', reiniciar); };
  }, [!!abierto]);

  async function guardar(base, datos) {
    const nuevo = await guardarDeposito(base, datos);
    actual.current = nuevo;
    if (vivo.current) setAbierto(nuevo);
    return nuevo;
  }
  async function ejecutar(tarea) {
    if (trabajando.current) return;
    trabajando.current = true; setOcupado(true); setError(''); setAviso('');
    try { await tarea(); } catch (e) { if (vivo.current) setError(mensajeLocal(e)); }
    finally { trabajando.current = false; if (vivo.current) setOcupado(false); }
  }
  async function entrar(event) {
    event.preventDefault();
    await ejecutar(async () => {
      if (!existe && (!propio || pin !== confirmacion)) throw new Error('Confirma que es tu dispositivo y escribe el mismo PIN en ambos campos.');
      liberacion.current = await tomarBloqueo();
      if (!vivo.current) { liberacion.current(); liberacion.current = null; return; }
      try {
        let nuevo;
        if (existe) nuevo = await desbloquearDeposito(pin);
        else {
          const copia = await cargarCopia();
          nuevo = await crearDeposito(pin, { version: 1, dispositivo: crypto.randomUUID(), ...copia, operaciones: [] });
          let persistente = false;
          try { persistente = await navigator.storage?.persist?.(); } catch { /* Still usable with an explicit storage warning. */ }
          setAviso(persistente ? 'Dispositivo preparado. Tu PIN abre esta copia local.' : 'Dispositivo preparado. Guarda una copia de respaldo; el navegador puede liberar almacenamiento.');
        }
        actual.current = nuevo; setAbierto(nuevo); setExiste(true); setPin(''); setConfirmacion('');
      } catch (e) { liberacion.current?.(); liberacion.current = null; throw e; }
    });
  }
  async function sincronizar() {
    await ejecutar(async () => {
      await sincronizarCola(actual.current, guardar);
      const n = pendientes(actual.current.datos).length;
      setAviso(n ? `Quedan ${n} movimientos que requieren revisión. Se mantienen guardados; no vuelvas a cobrarlos.` : 'Todo está sincronizado. La copia de pedidos y Caja está actualizada.');
    });
  }
  useEffect(() => {
    if (!abierto) return;
    const recuperar = () => { if (actual.current && !trabajando.current) void sincronizar(); };
    window.addEventListener('online', recuperar);
    return () => window.removeEventListener('online', recuperar);
  }, [!!abierto]);

  async function registrar(event) {
    event.preventDefault();
    await ejecutar(async () => {
      const base = actual.current;
      const op = prepararOperacion(base.datos, form);
      await guardar(base, { ...base.datos, operaciones: [...base.datos.operaciones, op] });
      setForm({ ...vacio, tipo: form.tipo });
      setFecha(fechaLima());
      setAviso('Guardado en este dispositivo. Pendiente de sincronizar con el equipo; no lo registres otra vez.');
    });
  }
  async function respaldo() {
    await ejecutar(async () => {
      const sobre = await leerSobre();
      if (!sobre) throw new Error('Todavía no hay una copia preparada.');
      const url = URL.createObjectURL(new Blob([JSON.stringify({ formato: 'creativa-caja-respaldo-v1', sobre })], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `Creativa-Caja-respaldo-${fechaLima()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setAviso('Respaldo cifrado descargado. Conserva también tu PIN: es necesario para recuperar el contenido con ayuda.');
    });
  }

  const datos = abierto?.datos;
  const cola = datos ? pendientes(datos) : [];
  const movimientos = datos ? movimientosDia(datos, fecha) : [];
  const disponible = datos && vigente(datos);
  const total = tipo => totalMovimientos(movimientos, tipo);
  const efectivo = totalMovimientos(movimientos, 'ingreso', 'Efectivo') - totalMovimientos(movimientos, 'egreso', 'Efectivo');
  const listado = datos?.trabajos.filter(t => `${t.codigo} ${t.cliente}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es'))) || [];
  const seleccionado = datos?.trabajos.find(t => t.id === form.trabajo_id);
  return <main className="local-caja">
    <header className="local-header"><div><span className="local-eyebrow">CREATIVA · EN ESTE DISPOSITIVO</span><h1>Caja sin conexión</h1><p>Cobros y salidas guardados contigo, hasta volver a conectar.</p></div><button type="button" disabled={ocupado} onClick={() => { bloquear(); onClose(); }}>Volver a Creativa</button></header>
    {error && <p className="local-error" role="alert">{error}</p>}
    {aviso && <p className="local-success" role="status">{aviso}</p>}
    {!datos ? <section className="local-unlock local-card"><span className="local-lock" aria-hidden="true">S/</span><h2>{existe ? 'Abre tu Caja local' : 'Prepara este dispositivo'}</h2>
      {existe === null ? <p role="status">Comprobando la copia de este dispositivo…</p> : <form onSubmit={entrar}>
        <p>{existe ? 'Introduce el PIN que elegiste aquí. No necesitas internet para abrir la copia guardada.' : 'Hazlo una vez con internet y tu sesión de administración abierta. Se guardarán los saldos de los pedidos y la Caja de hoy.'}</p>
        {!existe && <p>El PIN protege esta copia; es diferente de tu contraseña. Podrás registrar movimientos durante 7 días desde la última actualización con internet. No olvides el PIN: no podemos recuperarlo.</p>}
        <label>{existe ? 'PIN de este dispositivo' : 'Elige un PIN (6 a 12 dígitos)'}<input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6,12}" minLength={6} maxLength={12} required value={pin} onChange={e => setPin(e.target.value)} disabled={ocupado} /></label>
        {!existe && <><label>Repite el PIN<input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6,12}" required value={confirmacion} onChange={e => setConfirmacion(e.target.value)} disabled={ocupado} /></label><label className="local-check"><input type="checkbox" required checked={propio} onChange={e => setPropio(e.target.checked)} disabled={ocupado} />Es un dispositivo propio de confianza y protegeré su acceso.</label></>}
        <button className="local-primary" disabled={ocupado || (!existe && !red)}>{ocupado ? 'Un momento…' : existe ? 'Abrir Caja con mi PIN' : 'Preparar Caja en este dispositivo'}</button>
        {!red && !existe && <p>Necesitas conexión para la primera preparación.</p>}
      </form>}
      {existe && <button type="button" disabled={ocupado} onClick={respaldo}>Descargar respaldo cifrado</button>}
      <p className="local-footnote">El PIN permite consultar la copia local. No sustituye tu cuenta ni concede acceso a los datos del equipo.</p>
    </section> : <>
      <section className="local-status local-card"><div><span className={`local-indicator ${red ? 'online' : ''}`} />{red ? 'Red disponible' : 'Sin internet'}<h2>{datos.nombre}</h2><p>Última copia: {new Date(datos.verificado_en).toLocaleString('es-PE')}.</p></div><div><strong className="local-pending-number">{cola.length}</strong><span>por sincronizar o revisar</span></div><button className="local-primary" type="button" onClick={sincronizar} disabled={ocupado || !red}>{ocupado ? 'Procesando…' : cola.length ? 'Sincronizar pendientes' : 'Actualizar copia'}</button><button type="button" disabled={ocupado} onClick={bloquear}>Bloquear con PIN</button></section>
      {!disponible && <p role="alert" className="local-warning">Tu copia necesita renovarse. Conecta internet y actualízala antes de registrar nuevos movimientos. Tus pendientes siguen guardados.</p>}
      <p className="local-warning">Los saldos son estimados hasta sincronizar. Otro equipo puede haber registrado cobros; no cobres el mismo pedido simultáneamente en el celular y la PC.</p>
      <section className="local-totals" aria-label="Resumen de la copia de Caja">{[['Ingresos',total('ingreso')],['Salidas',total('egreso')],['Efectivo estimado',efectivo]].map(([nombre,valor]) => <article className="local-card" key={nombre}><span>{nombre}</span><strong>{dinero(valor)}</strong><small>{fecha} · incluye pendientes locales</small></article>)}</section>
      <div className="local-columns"><section className="local-card"><h2>Registrar un movimiento</h2><form onSubmit={registrar}><fieldset disabled={ocupado || !disponible}>
        <label>¿Qué vas a registrar?<select value={form.tipo} onChange={e => setForm({ ...vacio, tipo: e.target.value })}><option value="egreso">Salida / gasto</option><option value="ingreso">Otro ingreso / fondo de apertura</option><option value="abono">Cobro de un pedido</option></select></label>
        {form.tipo === 'abono' ? <><label>Buscar pedido<input type="search" placeholder="Código o cliente" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label><label>Pedido guardado<select required value={form.trabajo_id} onChange={e => setForm({ ...form, trabajo_id: e.target.value })}><option value="">Selecciona un pedido</option>{listado.map(t => <option key={t.id} value={t.id}>{t.codigo} · {t.cliente} · {dinero(saldoPedido(datos,t))}</option>)}</select></label>{seleccionado && <p>Saldo estimado disponible: <strong>{dinero(saldoPedido(datos, seleccionado))}</strong></p>}<p>Solo se pueden cobrar pedidos que estaban en la última copia guardada.</p></> : <><label>Concepto<input required minLength={3} maxLength={300} value={form.concepto} placeholder="Ej.: Almuerzos" onChange={e => setForm({ ...form, concepto: e.target.value })} /></label>{form.tipo === 'egreso' && <button type="button" onClick={() => setForm({ ...form, concepto: 'Almuerzos' })}>Almuerzos</button>}</>}
        <div className="local-field-pair"><label>Monto (S/)<input required type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} /></label><label>Método<select value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })}>{metodos.map(m => <option key={m}>{m}</option>)}</select></label></div>
        <button className="local-primary" type="submit">Guardar en este dispositivo</button>
      </fieldset></form></section>
      <section className="local-card"><h2>Por sincronizar <span className="local-count">{cola.length}</span></h2>{!cola.length ? <p>No hay movimientos pendientes de este dispositivo.</p> : <div className="local-queue">{cola.map(op => <article key={op.id}><div><strong>{op.concepto}</strong><b>{dinero(op.monto)}</b></div><small>{new Date(op.ocurrido_en).toLocaleString('es-PE')} · {op.metodo}</small><p className={op.estado === 'revision' ? 'local-review' : 'local-tag'}>{op.estado === 'revision' ? 'Requiere revisión' : 'Guardado aquí · pendiente'}</p>{op.error && <p>{op.error}</p>}<details><summary>Identificador para revisión</summary><code>{op.id}</code></details></article>)}</div>}<p>Si un movimiento requiere revisión, conserva el respaldo y contrástalo con administración. No vuelvas a registrar el dinero para intentar corregirlo.</p><button type="button" onClick={respaldo} disabled={ocupado}>Descargar respaldo cifrado</button></section></div>
      <section className="local-card"><div className="local-list-title"><h2>Movimientos de la copia</h2><label>Fecha de consulta<input type="date" value={fecha} max={fechaLima()} onChange={e => e.target.value && setFecha(e.target.value)} /></label></div>{!datos.dias[fecha] && <p>Esta fecha no tiene copia del servidor. Solo se muestran movimientos pendientes guardados aquí.</p>}{movimientos.length ? movimientos.map(op => <article className="local-movement" key={`${op.origen}-${op.id}`}><div><strong>{op.concepto}</strong><small>{op.metodo} · {op.estado === 'en_linea' ? 'Confirmado en la última copia' : op.estado === 'revision' ? 'Requiere revisión' : 'Pendiente de sincronizar'}</small></div><strong>{op.tipo === 'egreso' ? '−' : '+'}{dinero(op.monto)}</strong></article>) : <p>No hay movimientos guardados para esta fecha.</p>}</section>
      <section className="local-card local-closing"><h2>Al terminar el día</h2><p>Sincroniza los movimientos de la PC y del celular antes del cierre diario. Desde aquí solo se comprueban los pendientes de este dispositivo. El cierre y los recibos se realizan desde la Caja habitual con internet.</p><p>No borres los datos del navegador ni desinstales la aplicación mientras tengas movimientos pendientes. Un respaldo cifrado permite solicitar ayuda para recuperarlos con tu PIN.</p><button type="button" disabled={ocupado || cola.length > 0} onClick={() => { bloquear(); onClose(); }}>Volver al sistema para cerrar Caja</button></section>
    </>}
  </main>;
}
