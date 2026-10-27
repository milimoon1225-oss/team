import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STAGES, METHODS, today, money, cents, paid, costs, cashEntries, materialize } from '../../domain/operations.js';
import { emptyDraft } from '../../domain/workspace.js';
import { message } from '../../application/errors.js';
import PreviewEditor from '../preview/PreviewEditor.jsx';
import AssistantPanel from '../assistant/AssistantPanel.jsx';
import OrderChecklist from './OrderChecklist.jsx';
import { SAMPLE_DESIGNS } from '../../domain/samples.js';
import { SCREEN_HELP } from '../../application/assistant/conversation.js';
import { canReadOrder } from '../../domain/assistant/query-policy.js';
import './workspace.css';

function download(name, body, type='application/json') {
  const url=URL.createObjectURL(new Blob([body],{type})); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function Field({label,children,...props}) { return <label className="w-field"><span>{label}</span>{children || <input {...props}/>}</label>; }
function Select({label,values,...props}) { return <Field label={label}><select {...props}>{values.map(v=><option key={typeof v==='string'?v:v.value} value={typeof v==='string'?v:v.value}>{typeof v==='string'?v:v.label}</option>)}</select></Field>; }
function Gate({workspace,exists,run,onOpen,notice}) {
  const [name,setName]=useState('Administrador'), [pin,setPin]=useState(''), [confirm,setConfirm]=useState('');
  const restoreFile=useRef(null);
  async function submit(e) {
    e.preventDefault();
    await run(async()=>{
      const session=await workspace.open({exists,pin,confirm,name});
      setPin('');onOpen(session);
    });
  }
  async function restoreFileSelected(e) {
    const file=e.target.files?.[0]; e.target.value=''; if(!file) return;
    await run(async()=>{
      onOpen(await workspace.restore({file,pin}));
    });
  }
  return <main className="w-gate"><section className="w-welcome"><img src="/brand/creativa-logo.png" alt="Creativa Impresos"/><p className="w-eyebrow">TU IMPRENTA, CONTIGO</p><h1>Trabaja desde tu computadora.<br/>Con o sin internet.</h1><p>Pedidos, producción, cobros y costos guardados en este dispositivo, protegidos con tu PIN.</p></section><section className="w-login"><h2>{exists?'Abrir mi espacio de trabajo':'Preparar esta computadora'}</h2>{notice}<form onSubmit={submit}>
    {!exists && <Field label="Nombre del responsable" value={name} onChange={e=>setName(e.target.value)} required maxLength={100}/>}
    <Field label={exists?'PIN local':'Elige un PIN local (6 a 12 dígitos)'} type="password" inputMode="numeric" pattern="[0-9]{6,12}" autoComplete="off" value={pin} onChange={e=>setPin(e.target.value)} required/>
    {!exists && <Field label="Repite el PIN" type="password" inputMode="numeric" pattern="[0-9]{6,12}" autoComplete="off" value={confirm} onChange={e=>setConfirm(e.target.value)} required/>}
    <button className="w-primary">{exists?'Abrir espacio de trabajo':'Preparar y comenzar'}</button>
    </form>{!exists && <><p>¿Vienes de otra computadora? Introduce el PIN del respaldo y selecciónalo para restaurar.</p><button type="button" onClick={()=>restoreFile.current.click()}>Restaurar respaldo cifrado</button><input ref={restoreFile} type="file" accept=".json" hidden onChange={restoreFileSelected}/></>}<button type="button" className="w-demo-launch" onClick={()=>run(async()=>onOpen(await workspace.demo()))}>Explorar demostración</button><p className="w-demo-intro">Recorre las pantallas con pedidos y diseños ficticios. La demostración es temporal.</p><p className="w-muted">El PIN protege los datos de esta computadora. Consérvalo: sin él no podrás descifrar tus respaldos.</p></section></main>;
}

export default function Workspace({workspace,previews,assistant}) {
  const [opened,setOpened]=useState(null), [exists,setExists]=useState(null), [error,setError]=useState(''), [notice,setNotice]=useState(''), [busy,setBusy]=useState(false), [page,setPage]=useState('Pedidos'), [selected,setSelected]=useState(null), [search,setSearch]=useState(''), [stage,setStage]=useState('Todos'), [number,setNumber]=useState(1), [draft,setDraft]=useState(emptyDraft), [receipt,setReceipt]=useState(null);
  const [sampleOnly,setSampleOnly]=useState(false), [chatOpen,setChatOpen]=useState(false), [orderDestination,setOrderDestination]=useState({tab:'Detalle',focus:null,version:0});
  const current=useRef(null), unsubscribe=useRef(null), working=useRef(false), draftRef=useRef(draft), alive=useRef(true), assistantLauncher=useRef(null), returnToLauncher=useRef(false);
  function closeAssistant(){returnToLauncher.current=true;setChatOpen(false);}
  useEffect(()=>{if(!chatOpen&&returnToLauncher.current){returnToLauncher.current=false;assistantLauncher.current?.focus();}},[chatOpen]);
  useEffect(()=>{
    alive.current=true;
    workspace.exists().then(value=>{if(alive.current)setExists(value);}).catch(e=>{if(alive.current)setError(message(e));});
    return()=>{
      alive.current=false;
      const session=current.current;current.current=null;unsubscribe.current?.();unsubscribe.current=null;
      if(session)void workspace.lock(session);
    };
  },[workspace]);
  const run=useCallback(async fn=>{
    if(working.current) return;
    working.current=true;setBusy(true);setError('');
    try { await fn(); } catch(e) {setError(message(e));}
    finally {working.current=false;setBusy(false);}
  },[]);
  function onOpen(session) {
    if(!alive.current){void workspace.lock(session);return;}
    current.current=session;
    unsubscribe.current=session.subscribe(state=>{if(alive.current)setOpened({state});});
    const state=session.read();setOpened({state});if(!state.demonstration)setExists(true);setChatOpen(false);setSelected(null);
    draftRef.current=state.draft || emptyDraft();setDraft(draftRef.current);
    setPage('Pedidos');setSampleOnly(false);setSearch('');setStage('Todos');setNumber(1);setError('');setNotice(state.demonstration?'Demostración preparada. Puedes probar los flujos con estos datos ficticios.':'Espacio abierto. Los cambios se guardan en este dispositivo.');
  }
  async function lock() {
    const session=current.current;if(!session)return;
    await workspace.lock(session);unsubscribe.current?.();unsubscribe.current=null;current.current=null;
    if(alive.current){setOpened(null);setSelected(null);setReceipt(null);setChatOpen(false);setNotice('Espacio bloqueado.');}
  }
  useEffect(()=>{
    if(!opened)return;
    let timer;
    const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!working.current)void lock();else reset();},10*60*1000);};
    const leave=e=>{if(working.current||current.current?.hasWrites()){e.preventDefault();e.returnValue='Hay una operación en curso.';}};
    reset();['pointerdown','keydown'].forEach(n=>addEventListener(n,reset));addEventListener('beforeunload',leave);
    return()=>{clearTimeout(timer);['pointerdown','keydown'].forEach(n=>removeEventListener(n,reset));removeEventListener('beforeunload',leave);};
    // El temporizador se mantiene entre guardados; nunca conserva datos fuera de la referencia activa.
  },[!!opened]);
  const state=opened?.state;
  const documents=useMemo(()=>state?materialize(state):{},[state]);
  const admin=state?.profile.rol==='administracion';
  const allOrders=Object.values(documents).filter(d=>canReadOrder(state.profile,d));
  const matchingOrders=allOrders.filter(d=>(`${d.code} ${d.client} ${d.product}`).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))&&(stage==='Todos'||stage==='Anulados'?stage==='Todos'||d.cancelled:d.stage===stage&&!d.cancelled)).sort((a,b)=>a.delivery.localeCompare(b.delivery));
  const samples=matchingOrders.filter(d=>!d.cancelled&&d.stage!=='Entregado'&&d.previews?.length).filter((d,i,list)=>list.findIndex(other=>other.designs.at(-1)?.hash===d.designs.at(-1)?.hash)===i);
  const orders=sampleOnly&&state?.demonstration?samples:matchingOrders;
  const pages=Math.max(1,Math.ceil(orders.length/25)), activePage=Math.min(number,pages);
  const expired=false;
  async function command(type,target,payload,extra={}) {
    await workspace.execute(current.current,{type,target,payload,draft:extra.draft});
    if(alive.current)setNotice('Guardado en este dispositivo.');
  }
  function changeDraft(field,value) {
    const next={...draftRef.current,[field]:value};draftRef.current=next;setDraft(next);
    void workspace.saveDraft(current.current,next).catch(e=>setError(`Borrador no guardado: ${e.message}`));
  }
  async function createOrder(e) {
    e.preventDefault();await run(async()=>{
      const d=draftRef.current;
      await command('create',undefined,{client:d.client.trim(),phone:d.phone.trim(),product:d.product.trim(),qty:Number(d.qty),received:d.received,delivery:d.delivery,description:d.description.trim(),total:cents(d.price)},{draft:emptyDraft()});
      draftRef.current=emptyDraft();setDraft(draftRef.current);setPage('Pedidos');
    });
  }
  async function backup() {
    const result=await workspace.backup(current.current);download(result.name,result.text);
    setNotice('Respaldo cifrado descargado. Incluye pedidos, diseños, historial y pendientes.');
  }
  function navigateAssistant(destination) {
    if(destination.target==='new-order'){const saved=current.current.read().draft||emptyDraft();draftRef.current=saved;setDraft(saved);}
    const tabs={'order-detail':['Detalle',null],'design-upload':['Diseños','design-upload'],'design-approval':['Diseños','design-approval'],'order-production':['Producción','production-stage'],'order-preview':['Presentación 3D',null]};
    if(destination.orderId){const [tab,focus]=tabs[destination.target];setOrderDestination(previous=>({tab,focus,version:previous.version+1}));setSelected(destination.orderId);}
    else {const pages={orders:'Pedidos',production:'Producción','new-order':'Nuevo pedido',clients:'Clientes',cash:'Caja',reports:'Reportes',settings:'Configuración'};setPage(pages[destination.target]);setSelected(null);}
    if (window.matchMedia('(max-width:1099px)').matches) setChatOpen(false);
  }
  function inspectOrder(id,tab='Detalle'){setOrderDestination(previous=>({tab,focus:null,version:previous.version+1}));setSelected(id);}
  const messages=<>{error&&<p role="alert" className="w-error">{error}</p>}{notice&&<p role="status" className="w-notice">{notice}</p>}{busy&&<p role="status">Procesando…</p>}</>;
  if(exists===null)return <p>Cargando almacenamiento local…</p>;
  if(!opened)return <Gate workspace={workspace} exists={exists} run={run} onOpen={onOpen} notice={messages}/>;
  const doc=documents[selected]&&canReadOrder(state.profile,documents[selected])?documents[selected]:null;
  const launcher=!chatOpen&&!receipt?<button id="creativa-assistant-launcher" ref={assistantLauncher} className={doc?'w-order-assistant':'a-launcher'} type="button" aria-label="Abrir asistente" aria-controls="creativa-assistant-panel" aria-expanded={false} onClick={()=>setChatOpen(true)}>Asistente</button>:null;
  const nav=admin?['Pedidos','Nuevo pedido','Producción','Clientes','Caja','Reportes','Configuración']:['Pedidos','Producción','Configuración'];
  return <div className={`w-app ${chatOpen&&!receipt?'w-assistant-open':''}`}><aside className="w-sidebar"><img src="/brand/creativa-logo.png" alt="Creativa Impresos"/><nav aria-label="Secciones">{nav.map(n=><button key={n} className={page===n?'active':''} onClick={()=>{setPage(n);setSelected(null);}}>{n}</button>)}</nav><p>{state.profile.nombre}<br/><small>{admin?'Administración':'Diseñador'}</small></p><button disabled={busy} onClick={()=>run(lock)}>Bloquear espacio</button></aside><main className="w-main"><header className="w-header"><div><p className="w-eyebrow">CREATIVA · GESTIÓN DE IMPRENTA</p><h1>{page}</h1><p className="w-screen-description">{SCREEN_HELP[page]}</p></div><div className="w-connection"><b>Trabajo local</b><span>Datos guardados en esta computadora</span></div></header>{state.demonstration&&<div className="w-demo-banner"><div><strong>Modo demostración · Datos ficticios</strong><p>Pedidos, diseños y precios ficticios. Los cambios duran hasta salir.</p></div><button disabled={busy} onClick={()=>run(lock)}>Salir de demostración</button></div>}{messages}
  {page==='Nuevo pedido'&&<form className="w-card w-form" onSubmit={createOrder}><h2>Registrar trabajo</h2><p>{state.demonstration?'Borrador de ejemplo: los cambios son temporales.':'El borrador se guarda cifrado mientras escribes.'}</p><div className="w-fields">{[['client','Cliente','text'],['phone','Teléfono','tel'],['product','Tipo de trabajo','text'],['qty','Cantidad','number'],['received','Recepción','date'],['delivery','Entrega prevista','datetime-local'],['price','Precio total (S/)','number']].map(([key,label,type])=><Field key={key} label={label} type={type} value={draft[key]} required={key!=='phone'} min={key==='qty'?1:key==='price'?0:undefined} step={key==='price'?'0.01':undefined} maxLength={key==='client'||key==='product'?150:key==='phone'?20:undefined} onChange={e=>changeDraft(key,e.target.value)}/>)}<Field label="Indicaciones"><textarea value={draft.description} maxLength={5000} onChange={e=>changeDraft('description',e.target.value)}/></Field></div><button className="w-primary" disabled={busy||expired}>Guardar pedido</button></form>}
  {['Pedidos','Producción'].includes(page)&&<>{state.demonstration&&<section className="w-sample-intro"><div><p className="w-eyebrow">MUESTRARIO DE CREATIVA</p><h2>Invitaciones y tarjetas listas para explorar</h2><p>{SAMPLE_DESIGNS.length} estilos de ejemplo, con frente, reverso o interiores. Abre una muestra en 3D para girarla, desplegarla y probar materiales.</p></div><div><button aria-pressed={!sampleOnly} onClick={()=>{setSampleOnly(false);setNumber(1);}}>Todos los trabajos</button><button aria-pressed={sampleOnly} onClick={()=>{setSampleOnly(true);setSearch('');setStage('Todos');setNumber(1);}}>Ver muestras 3D</button></div></section>}<div className="w-stats"><article><span>Trabajos activos</span><b>{allOrders.filter(d=>!d.cancelled&&d.stage!=='Entregado').length}</b></article><article><span>Entrega vencida</span><b>{allOrders.filter(d=>!d.cancelled&&d.stage!=='Entregado'&&d.delivery.slice(0,10)<today()).length}</b></article>{admin&&<article><span>Saldo por cobrar</span><b>{money(allOrders.filter(d=>!d.cancelled).reduce((n,d)=>n+d.total-paid(d),0))}</b></article>}</div><div className="w-toolbar"><Field label="Buscar pedidos" value={search} onChange={e=>{setSearch(e.target.value);setNumber(1);}}/><Select label="Etapa" values={['Todos',...STAGES,'Anulados']} value={stage} onChange={e=>{setStage(e.target.value);setNumber(1);}}/></div>{page==='Producción'&&<div className="w-pipeline">{STAGES.map(s=><button key={s} onClick={()=>setStage(s)}>{s}<b>{allOrders.filter(d=>d.stage===s&&!d.cancelled).length}</b></button>)}</div>}
    <div className="w-orders">{orders.slice((activePage-1)*25,activePage*25).map(d=><button className={`w-order ${d.cancelled?'cancelled':''}`} key={d.id} onClick={()=>inspectOrder(d.id,sampleOnly?'Presentación 3D':'Detalle')}>{state.demonstration&&d.previews?.length>0&&<div className={`w-sample-image ${d.previews.at(-1).model}`}><img loading="lazy" decoding="async" draggable="false" src={state.files[Object.values(d.previews.at(-1).panels)[0].fileId]?.url} alt={`Muestra de ${d.product}`}/><span>Vista 3D disponible</span></div>}<span className="w-order-head"><strong>{d.code}</strong><span>{d.cancelled?'Anulado':d.stage}</span></span><h2>{d.client}</h2><p>{d.product} · {d.qty} unidades</p><p>Entrega: {new Date(d.delivery).toLocaleString('es-PE')}</p>{admin&&<b>Saldo {money(d.total-paid(d))}</b>}<span>{sampleOnly?'Abrir muestra 3D →':'Ver pedido →'}</span></button>)}</div>{!orders.length&&<div className="w-card"><h2>No hay pedidos en esta vista</h2><p>Registra un trabajo o cambia los filtros.</p></div>}<div className="w-pagination"><button disabled={activePage===1} onClick={()=>setNumber(n=>n-1)}>Anterior</button><span>Página {activePage} de {pages} · {orders.length} pedidos</span><button disabled={activePage===pages} onClick={()=>setNumber(n=>n+1)}>Siguiente</button></div></>}
  {page==='Clientes'&&<div className="w-card"><h2>Clientes e historial</h2><Field label="Buscar cliente" value={search} onChange={e=>setSearch(e.target.value)}/>{[...new Set(allOrders.map(d=>`${d.client}\n${d.phone}`))].filter(key=>key.toLowerCase().includes(search.toLowerCase())).map(key=>{const related=allOrders.filter(d=>`${d.client}\n${d.phone}`===key);return <details key={key}><summary>{key.split('\n').join(' · ')} · {related.length} pedidos</summary>{related.map(d=><p key={d.id}><button onClick={()=>inspectOrder(d.id)}>{d.code} · {d.product}</button> · {d.cancelled?'Anulado':d.stage} · saldo {money(d.total-paid(d))}</p>)}</details>;})}</div>}
  {page==='Caja'&&<Cash documents={documents} state={state} busy={busy||expired} command={command} run={run}/>}
  {page==='Reportes'&&<Reports orders={allOrders} documents={documents}/>}
  {page==='Configuración'&&<><section className="w-card"><h2>Recorrer la app</h2><p>Prueba pedidos, diseños y reportes con información ficticia en una sesión temporal.</p><button disabled={busy||state.demonstration} onClick={()=>run(async()=>{const demo=await workspace.demo();await lock();onOpen(demo);})}>Explorar demostración</button></section><Settings state={state} busy={busy} run={run} backup={backup} rename={name=>workspace.rename(current.current,name)}/></>}
  </main>{!doc&&launcher}<AssistantPanel assistant={assistant} session={current.current} open={chatOpen&&!receipt} onClose={closeAssistant} context={{page,orderId:doc?.id||null}} onNavigate={navigateAssistant}/>{doc&&<Order key={doc.id} navigationVersion={orderDestination.version} assistantOpen={chatOpen&&!receipt} initialTab={orderDestination.tab} initialFocus={orderDestination.focus} assistantControl={launcher} doc={doc} previewService={previews} previewBusy={busy} previewReadOnly={expired} session={current.current} onPresent={async variants=>{await previews.present(current.current,variants);await lock();}} team={state.team} userId={state.profile.id} admin={admin} busy={busy||expired} error={error} run={run} command={command} attachDesign={file=>workspace.attachDesign(current.current,doc.id,file)} getDesign={designId=>workspace.getDesign(current.current,doc.id,designId)} onClose={()=>setSelected(null)} receipt={()=>setReceipt(doc)}/>}{receipt&&<Receipt doc={receipt} close={()=>setReceipt(null)}/>}</div>;
}

function Order({doc,navigationVersion,assistantOpen,initialTab='Detalle',initialFocus,assistantControl,previewService,previewBusy,previewReadOnly,session,onPresent,admin,busy,error,run,command,attachDesign,getDesign,onClose,receipt,team=[],userId}) {
  const [amount,setAmount]=useState(''),[method,setMethod]=useState('Efectivo'),[reason,setReason]=useState(''),[customer,setCustomer]=useState(''),[category,setCategory]=useState('Material'),[concept,setConcept]=useState(''),[refundId,setRefundId]=useState(''),[tab,setTab]=useState(initialTab);
  const fileInput=useRef(null);
  const modal=useRef(null);
  const [localDestination,setLocalDestination]=useState(null);
  function navigateWithin(tab,focus){setTab(tab);setLocalDestination({focus});}
  useEffect(()=>{if(localDestination)modal.current?.querySelector(`[data-assistant-focus=${localDestination.focus}]`)?.focus();},[localDestination]);
  const [lastDestination,setLastDestination]=useState(navigationVersion);
  // Cambiar de pestaña por una acción conserva los campos del pedido y enfoca
  // después de montar el destino. No se remonta todo el formulario.
  if(lastDestination!==navigationVersion){setLastDestination(navigationVersion);setTab(initialTab);}
  useEffect(()=>{const before=document.activeElement;const selector=initialFocus==='design-upload'?'[data-assistant-focus=design-upload]':initialFocus==='design-approval'?'[data-assistant-focus=design-approval]':initialFocus==='production-stage'?'[data-assistant-focus=production-stage]':'button';modal.current?.querySelector(selector)?.focus();return()=>before?.focus();},[navigationVersion]);
  function keyboard(e){
    if(e.key==='Escape'&&!previewBusy)onClose();
    if(e.key==='Tab'&&!assistantOpen){
      const items=Array.from(modal.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')).filter(el=>el.getClientRects().length);
      if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}
      if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}
    }
  }
  const act=(type,payload)=>run(()=>command(type,doc.id,typeof payload==='function'?payload():payload));
  async function designFile(e) {
    const file=e.target.files?.[0];e.target.value='';if(file)await run(()=>attachDesign(file));
  }
  async function openDesign(design) {
    await run(async()=>{const file=await getDesign(design.id);download(file.name,file.blob,file.blob.type);});
  }
  return <div className="w-overlay w-order-overlay"><section ref={modal} onKeyDown={keyboard} className={`w-modal ${tab==='Presentación 3D'?'w-preview-modal':''}`} role="dialog" aria-modal={!assistantOpen} aria-labelledby="order-title"><header><div><small>{doc.code}</small><h2 id="order-title">{doc.client}</h2><p>{doc.product} · {doc.cancelled?'Anulado':doc.stage}</p></div><div className="w-order-controls">{assistantControl}<button disabled={previewBusy} onClick={onClose} aria-label="Cerrar pedido">Cerrar</button></div></header><div className="w-tabs">{['Detalle','Diseños','Presentación 3D','Producción',...(admin?['Pagos','Costos']:[]),'Historial'].map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</div>
    <OrderChecklist order={doc} onNavigate={navigateWithin}/>{error&&<p role="alert" className="w-error">{error}</p>}{tab==='Detalle'&&<><p>Teléfono: {doc.phone||'Sin registrar'}</p><p>Entrega: {new Date(doc.delivery).toLocaleString('es-PE')}</p><p>Cantidad: {doc.qty}</p><p className="w-description">{doc.description||'Sin indicaciones.'}</p>{admin&&<><p>Total: <b>{money(doc.total)}</b> · Pagado: {money(paid(doc))} · Saldo: {money(doc.total-paid(doc))}</p><button onClick={receipt}>Imprimir recibo / PDF</button>{doc.cancelled?<p className="w-error">Motivo de anulación: {doc.cancelReason}. Los cobros se conservan; registra la devolución si corresponde.</p>:<><Field label="Motivo de anulación" value={reason} onChange={e=>setReason(e.target.value)}/><button disabled={busy||!reason.trim()} onClick={()=>act('cancel',{reason})}>Anular conservando historial y cobros</button></>}</>}</>}
    {tab==='Diseños'&&<><h3>Versiones del diseño</h3>{doc.references?.length>0&&<div><h4>Referencias importadas del pedido anterior</h4>{doc.references.map(d=><button key={d.id} onClick={()=>openDesign(d)}>{d.name}</button>)}</div>}<p>Una nueva versión invalida la aprobación anterior. La confirmación queda registrada con versión, fecha y responsable.</p><button data-assistant-focus="design-upload" disabled={busy||doc.cancelled} onClick={()=>fileInput.current.click()}>Adjuntar nueva versión</button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" hidden onChange={designFile}/>{doc.designs.map((d,i)=><article className="w-row" key={d.id}><div><strong>Versión {i+1}: {d.name}</strong><small>{d.by} · {new Date(d.at).toLocaleString('es-PE')} · SHA256 {d.hash.slice(0,12)}…</small></div><button onClick={()=>openDesign(d)}>Abrir / descargar</button></article>)}{doc.approval?<p className="w-notice">Última versión aprobada por {doc.approval.customer}; registrado por {doc.approval.by} el {new Date(doc.approval.at).toLocaleString('es-PE')}.</p>:<><Field data-assistant-focus="design-approval" label="Nombre del cliente que confirmó" value={customer} onChange={e=>setCustomer(e.target.value)} maxLength={150}/><button disabled={busy||!doc.designs.length||!customer.trim()||doc.cancelled} onClick={()=>act('approve',{designId:doc.designs.at(-1).id,customer})}>Registrar aprobación de la última versión</button></>}</>}
    {tab==='Presentación 3D'&&<PreviewEditor order={doc} service={previewService} session={session} busy={previewBusy} readOnly={previewReadOnly||doc.cancelled||doc.stage==='Entregado'} run={run} onPresent={onPresent}/>}
    {tab==='Producción'&&<><h3>Etapa actual: {doc.stage}</h3><Field data-assistant-focus="production-stage" label="Motivo de retroceso o entrega con saldo" value={reason} onChange={e=>setReason(e.target.value)}/><div className="w-pipeline">{STAGES.map((s,i)=><button key={s} disabled={busy||doc.cancelled||(!admin&&s==='Entregado')||i>STAGES.indexOf(doc.stage)+1||s===doc.stage} onClick={()=>act('stage',{stage:s,reason})}>{s}</button>)}</div><Select label="Responsable del diseño" values={[{value:'',label:'Sin asignar'},...team.filter(p=>p.rol==='disenador').map(p=>({value:p.id,label:p.nombre}))]} value={doc.assignee||''} disabled={busy||doc.cancelled||!admin} onChange={e=>act('assign',{assignee:e.target.value||null})}/>{!admin&&!doc.assignee&&<button disabled={busy} onClick={()=>act('assign',{assignee:userId})}>Tomar trabajo</button>}</>}
    {tab==='Pagos'&&<><p>Total {money(doc.total)} · Pagado {money(paid(doc))} · Saldo {money(doc.total-paid(doc))}</p><div className="w-fields"><Field label="Importe (S/)" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/><Select label="Método de cobro" values={METHODS} value={method} onChange={e=>setMethod(e.target.value)}/></div><button disabled={busy||doc.cancelled||!amount} onClick={()=>act('payment',()=>({amount:cents(amount),method}))}>Registrar cobro</button><h3>Corrección mediante devolución</h3><Select label="Cobro original" values={[{value:'',label:'Selecciona un cobro'},...doc.payments.filter(p=>p.amount>0).map(p=>({value:p.id,label:`${money(p.amount)} · ${p.method} · ${p.id.slice(0,8)}`}))]} value={refundId} onChange={e=>setRefundId(e.target.value)}/><Field label="Motivo de devolución" value={reason} onChange={e=>setReason(e.target.value)}/><button disabled={busy||!amount||!refundId||!reason.trim()} onClick={()=>act('refund',()=>({paymentId:refundId,amount:cents(amount),reason}))}>Registrar devolución del importe indicado</button><p>La devolución conserva el cobro original y utiliza su método. Los movimientos de jornadas cerradas se corrigen en una jornada abierta.</p>{doc.payments.map(p=><article className="w-row" key={p.id}><b>{money(p.amount)} · {p.method}</b><span>{new Date(p.at).toLocaleString('es-PE')} · {p.reason||p.by}</span></article>)}</>}
    {tab==='Costos'&&<><p>Costos {money(costs(doc))} · Margen estimado del pedido {money(doc.total-costs(doc))}</p><div className="w-fields"><Select label="Categoría del costo" values={['Material','Mano de obra','Tercerización','Desperdicio','Otro']} value={category} onChange={e=>setCategory(e.target.value)}/><Field label="Concepto del costo" value={concept} onChange={e=>setConcept(e.target.value)} maxLength={500}/><Field label="Costo (S/)" type="number" step="0.01" min="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></div><button disabled={busy||!amount||!concept.trim()} onClick={()=>act('cost',()=>({amount:cents(amount),category,concept}))}>Agregar costo</button>{doc.costs.map(c=><article className="w-row" key={c.id}><span>{c.category}: {c.concept}</span><b>{money(c.amount)}</b></article>)}<p>Los costos describen el consumo del pedido. Los pagos de compras se registran por separado en Caja; agregar un costo no crea una salida de efectivo.</p></>}
    {tab==='Historial'&&<ol className="w-audit">{doc.audit.toReversed().map((a,i)=><li key={a.id||i}><strong>{a.type}</strong> · {a.by} · {new Date(a.at).toLocaleString('es-PE')}{a.reason&&<p>{a.reason}</p>}</li>)}</ol>}
  </section></div>;
}

function Cash({documents,busy,command,run}) {
  const [date,setDate]=useState(today()),[amount,setAmount]=useState(''),[method,setMethod]=useState('Efectivo'),[type,setType]=useState('egreso'),[concept,setConcept]=useState(''),[counted,setCounted]=useState(''),[confirmed,setConfirmed]=useState(false);
  const entries=cashEntries(documents,date),closing=Object.values(documents).find(d=>d.kind==='closing'&&d.date===date), expected=entries.filter(e=>e.method==='Efectivo').reduce((n,e)=>n+e.amount,0);
  return <><div className="w-card"><Field label="Fecha de Caja" type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}/><h2>Efectivo esperado: {money(expected)}</h2><div className="w-stats">{METHODS.map(m=><article key={m}><span>{m}</span><b>{money(entries.filter(e=>e.method===m).reduce((n,e)=>n+e.amount,0))}</b></article>)}</div></div>{!closing&&date===today()&&<form className="w-card" onSubmit={e=>{e.preventDefault();void run(async()=>{await command('movement',undefined,{type,amount:cents(amount),method,concept});setAmount('');setConcept('');});}}><h2>Registrar movimiento</h2><div className="w-fields"><Select label="Tipo de movimiento" values={[{value:'ingreso',label:'Ingreso / fondo de apertura'},{value:'egreso',label:'Salida / gasto'}]} value={type} onChange={e=>setType(e.target.value)}/><Field label="Monto (S/)" type="number" step="0.01" min="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/><Select label="Método" values={METHODS} value={method} onChange={e=>setMethod(e.target.value)}/><Field label="Concepto" value={concept} maxLength={300} onChange={e=>setConcept(e.target.value)} required/></div><button disabled={busy}>Guardar movimiento</button></form>}<div className="w-card"><h2>Movimientos</h2>{entries.map((e,i)=><article className="w-row" key={e.id||i}><span>{e.concept} · {e.method}</span><b>{money(e.amount)}</b></article>)}{!entries.length&&<p>No hay movimientos en esta fecha.</p>}</div><div className="w-card"><h2>Cierre de Caja</h2>{closing?<p>Cerrada · Contado {money(closing.counted)} · Esperado {money(closing.expected)} · Diferencia {money(closing.counted-closing.expected)}</p>:date===today()?<form onSubmit={e=>{e.preventDefault();void run(()=>command('close',undefined,{date,counted:cents(counted)}));}}><p>Revisa los movimientos registrados en esta computadora y cuenta el efectivo antes de cerrar.</p><Field label="Efectivo contado (S/)" type="number" min="0" step="0.01" value={counted} onChange={e=>setCounted(e.target.value)} required/><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Revisé los movimientos registrados y el efectivo contado.</label><button disabled={busy||!confirmed}>Cerrar jornada</button></form>:<p>Sin cierre registrado.</p>}</div></>;
}
function Reports({orders,documents}) {
  const [from,setFrom]=useState(`${today().slice(0,7)}-01`),[to,setTo]=useState(today());
  const chosen=orders.filter(d=>!d.cancelled&&d.received>=from&&d.received<=to);
  const total=chosen.reduce((n,d)=>n+d.total,0),cost=chosen.reduce((n,d)=>n+costs(d),0);
  const payments=orders.flatMap(d=>d.payments).filter(p=>today(p.at)>=from&&today(p.at)<=to);
  const movements=Object.values(documents).filter(d=>d.kind==='movement'&&today(d.at)>=from&&today(d.at)<=to);
  function csv(){const quote=v=>`"${String(v).replaceAll('"','""')}"`;download(`Creativa-costos-${from}-${to}.csv`,'\uFEFF'+[['Pedido','Cliente','Venta','Costos','Margen','Cobrado','Saldo'],...chosen.map(d=>[d.code,d.client,d.total/100,costs(d)/100,(d.total-costs(d))/100,paid(d)/100,(d.total-paid(d))/100])].map(row=>row.map(v=>quote(/^[=+@-]/.test(String(v))?`'${v}`:v)).join(';')).join('\r\n'),'text/csv;charset=utf-8');}
  return <div className="w-card"><h2>Costos y resultado por pedido</h2><div className="w-toolbar"><Field label="Desde" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><Field label="Hasta" type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/><button onClick={csv}>Exportar CSV</button></div><div className="w-stats">{[['Valor de pedidos',total],['Costos registrados',cost],['Margen estimado',total-cost],['Cobros netos del período',payments.reduce((n,p)=>n+p.amount,0)],['Salidas de Caja',movements.filter(m=>m.type==='egreso').reduce((n,m)=>n+m.amount,0)]].map(([label,value])=><article key={label}><span>{label}</span><b>{money(value)}</b></article>)}</div><p>Valor y margen corresponden a pedidos recibidos en el período. Cobros incluyen devoluciones por su fecha real. El margen usa únicamente los costos registrados; no representa utilidad contable.</p><div className="w-table"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Venta</th><th>Costos</th><th>Margen</th><th>Saldo</th></tr></thead><tbody>{chosen.map(d=><tr key={d.id}><td>{d.code}</td><td>{d.client}</td><td>{money(d.total)}</td><td>{money(costs(d))}</td><td>{money(d.total-costs(d))}</td><td>{money(d.total-paid(d))}</td></tr>)}</tbody></table></div></div>;
}
function Settings({state,busy,run,backup,rename}) {
  const [name,setName]=useState(state.profile.nombre);
  return <div className="w-card"><h2>Protección y recuperación</h2><p>{state.demonstration?'Esta demostración se guarda solo en memoria y se descarta al salir.':'Datos cifrados en este dispositivo. El espacio se bloquea tras 10 minutos de inactividad.'}</p><button disabled={busy||state.demonstration} onClick={()=>run(backup)}>Descargar respaldo cifrado</button><p>Conserva el archivo y su PIN. Puedes restaurarlo desde la pantalla inicial de una instalación o perfil nuevo. La restauración no sobrescribe otra copia.</p><form onSubmit={e=>{e.preventDefault();void run(()=>rename(name));}}><Field label="Responsable local" value={name} onChange={e=>setName(e.target.value)} required maxLength={100}/><button disabled={busy}>Guardar responsable</button></form></div>;
}
function Receipt({doc,close}) {return <div className="w-overlay w-print-root"><section className="w-modal"><div className="w-print-controls"><button onClick={()=>window.print()}>Imprimir / Guardar PDF</button><button onClick={close}>Cerrar recibo</button></div><article><img className="w-receipt-logo" src="/brand/creativa-logo.png" alt="Creativa Impresos"/><h1>Recibo de pedido</h1><p>Comprobante interno · No es boleta electrónica</p><h2>{doc.code}</h2><p>Cliente: {doc.client} · {doc.phone}</p><p>{doc.product} · {doc.qty} unidades</p><p>Entrega prevista: {new Date(doc.delivery).toLocaleString('es-PE')}</p><p>Total: {money(doc.total)}</p><p>Pagado: {money(paid(doc))}</p><h2>Saldo: {money(doc.total-paid(doc))}</h2><p>Estado: {doc.cancelled?'Anulado':doc.stage}</p><p>Emitido: {new Date().toLocaleString('es-PE')}</p></article></section></div>;}
