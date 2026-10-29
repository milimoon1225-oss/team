import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import './assistant.css';
const AssistantStudio = lazy(() => import('./AssistantStudio.jsx'));
const AssistantResult = lazy(() => import('./AssistantResult.jsx'));

function ChatIcon() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2V11.5a9 9 0 1 1 18 0Z" stroke="currentColor" strokeWidth="1.7"/><path d="M7 10h9M7 14h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

function AnswerCard({ answer, navigate, chooseTool, stale }) {
  const [limit, setLimit] = useState(3);
  return <div className="a-answer" aria-label="Resultado del asistente">
    {answer.summary && <h3>{answer.summary}</h3>}
    {answer.reply && <p>{answer.reply}</p>}
    {stale && <p className="a-warning">Los datos cambiaron desde esta respuesta. Consulta de nuevo para ver las acciones vigentes.</p>}
    {answer.rows?.slice(0, limit).map(row => <article className="a-evidence" key={row.id}>
      <div className="a-order-line"><strong>{row.client}</strong><span>{row.cancelled ? 'Anulado' : row.stage}</span></div>
      <p>{row.product} · {row.qty} unidades</p>
      <p className="a-delivery">Entrega: {new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(row.delivery)?`${row.delivery}:00-05:00`:row.delivery).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
      {answer.contextOrderId && row.blockers.length > 0 && <ul>{row.blockers.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      {!answer.contextOrderId && answer.query?.tool === 'blocked' && <ul>{row.blockers.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      {row.pending && <small>{row.review ? 'Tiene operaciones en revisión.' : 'Cambios pendientes en el respaldo importado.'}</small>}
      {!stale && <div className="a-actions">{(answer.contextOrderId || answer.query?.tool === 'blocked' ? row.actions : row.actions.filter(item => item.action.target === 'order-detail')).slice(0,2).map(({ label, action }) => <button key={action.target} onClick={() => navigate(action)}>{label}</button>)}
        {row.actions.length > 2 && answer.contextOrderId && <details><summary>Más opciones</summary>{row.actions.slice(2).map(({label,action})=><button key={action.target} onClick={()=>navigate(action)}>{label}</button>)}</details>}
      </div>}
      <small>{row.code}</small>
    </article>)}
    {answer.rows?.length > limit && <button className="a-more" onClick={() => setLimit(n => n + 3)}>Mostrar más resultados</button>}
    {answer.total > (answer.rows?.length || 0) && <p>Hay {answer.total} resultados. Añade el cliente o código para precisar.</p>}
    {!stale && answer.actions?.map(({ label, action }) => <button key={action.target} onClick={() => navigate(action)}>{label}</button>)}
    {!stale && answer.offerTool && <button onClick={()=>chooseTool(answer.offerTool, answer.toolSeed)}>Abrir opciones detalladas</button>}
    {answer.query && <details className="a-source"><summary>{answer.source === 'model' ? 'Qwen3.5 · IA local' : 'Consulta local'} · Ver detalle</summary>
      <p>{answer.query.term || 'Todos los trabajos autorizados'} · {({ any:'Cualquier fecha',today:'Entrega hoy',tomorrow:'Entrega mañana',overdue:'Entrega anterior a hoy' })[answer.query.day]}</p>
      <p>Datos de esta computadora.</p>
    </details>}
  </div>;
}

export default function AssistantPanel({ assistant, session, open, onClose, context, onNavigate }) {
  const [studio,setStudio]=useState(null), [question,setQuestion]=useState(''), [attachment,setAttachment]=useState(null);
  const [messages,setMessages]=useState([]), [busy,setBusy]=useState(false), [elapsed,setElapsed]=useState(0);
  const [status,setStatus]=useState('Consultas rápidas sin cargar IA'), [engineStatus,setEngineStatus]=useState('');
  const request=useRef(null), alive=useRef(true), input=useRef(null), bottom=useRef(null), sequence=useRef(0), previous=useRef(null), pendingTask=useRef(null), files=useRef(null);
  let snapshot;
  try { snapshot=session.read(); } catch { /* Bloqueado. */ }
  const welcome=useMemo(()=>{
    try { return assistant.welcome(session,context); }
    catch { return {name:'equipo',page:'Pedidos',order:null,help:'Abre el espacio de trabajo para continuar.'}; }
  },[assistant,session,snapshot,context.page,context.orderId]);
  function append(message) {
    setMessages(current=>[...current,{...message,id:++sequence.current}].slice(-24).map((item,index,all)=>
      item.answer?.result?.images && index < all.length-4 ? {...item,answer:{reply:`${item.answer.result.title}: ${item.answer.result.summary || 'Análisis terminado.'} Vuelve a solicitarlo para consultar las imágenes.`}} : item));
  }
  function cancel() { request.current?.abort(); request.current=null; setBusy(false); }
  function minimize() { cancel(); onClose(); }
  useEffect(()=>{
    alive.current=true;
    const clear=()=>{request.current?.abort();request.current=null;previous.current=null;pendingTask.current=null;setMessages([]);setQuestion('');setAttachment(null);setStudio(null);setBusy(false);};
    const off=assistant.observe(session,({revoked}={})=>{
      if(revoked){clear();setStatus('Los permisos cambiaron. Iniciamos una conversación nueva.');return;}
      request.current?.abort();request.current=null;setBusy(false);
      setMessages(current=>current.map(item=>item.answer?{...item,stale:true}:item));
      setStatus(sequence.current?'Datos actualizados. Conservé la conversación.':'Consultas rápidas sin cargar IA');
    });
    const offClose=session.onClose(clear);
    return()=>{alive.current=false;request.current?.abort();request.current=null;off();offClose();};
  },[session,assistant]);
  useEffect(()=>{if(open&&!studio)input.current?.focus();if(!open)cancel();},[open,studio]);
  useEffect(()=>{if(open)bottom.current?.scrollIntoView({block:'nearest'});},[messages,busy,open]);
  useEffect(()=>{if(!busy){setElapsed(0);return;}const began=Date.now();const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-began)/1000)),1000);return()=>clearInterval(timer);},[busy]);
  // Cambiar de trabajo cancela el análisis anterior, conservando lo escrito y el historial.
  useEffect(()=>{cancel();pendingTask.current=null;setStudio(null);},[context.orderId,context.page]);
  function navigate(action) {
    try { const destination=assistant.navigate(session,action);cancel();onNavigate(destination); }
    catch(error){append({role:'assistant',text:error.message});}
  }
  function chooseTool(tool,seed='') { cancel();setStudio({tool,seed}); }
  async function perform(job) {
    cancel();const controller=new AbortController();request.current=controller;setBusy(true);
    try {
      const answer=await job(controller.signal);
      if(!alive.current||request.current!==controller||controller.signal.aborted)return;
      if(answer.query)previous.current=answer.query;
      pendingTask.current=answer.pendingTask || null;
      setStatus(answer.result?.model||answer.source==='model'?'Consulta terminada.':'Consulta local actualizada.');
      append({role:'assistant',answer});
      if(answer.navigation)navigate(answer.navigation);
    } catch(error) {
      if(alive.current&&request.current===controller&&!controller.signal.aborted)append({role:'assistant',text:`${error.message} Puedes seguir usando las consultas locales.`});
    } finally {if(alive.current&&request.current===controller){request.current=null;setBusy(false);}}
  }
  async function send(text=question,query) {
    if(!text.trim()&&!attachment)return;
    const questionText=text.trim() || 'Revisa este archivo';
    const file=attachment;
    append({role:'user',text:questionText+(file?`\nAdjunto: ${file.name}`:'')});setQuestion('');setAttachment(null);
    await perform(signal=>query?assistant.quick(session,query):assistant.chat(session,{question:questionText,context:{...context,lastQuery:previous.current,pendingTask:pendingTask.current,attachment:file},signal}));
  }
  async function applyBrief(brief,replace) {
    // La escritura ya tiene sus propias comprobaciones y provoca un aviso de datos actualizados.
    cancel();
    try{await assistant.tools.applyBrief(session,brief,replace);append({role:'assistant',text:'Propuesta guardada como borrador. Revisa los datos y completa el precio antes de crear el pedido.'});navigate({target:'new-order'});}
    catch(error){append({role:'assistant',text:error.message});}
  }
  async function checkEngine() {
    setEngineStatus('Probando una respuesta real de Qwen3.5:4b… La primera carga puede tardar.');
    await perform(async signal=>{try {const value=await assistant.verify(session,{signal});const text=value.ready?`Qwen3.5:4b respondió correctamente. Prueba real: ${(value.milliseconds/1000).toFixed(1)} s.`:'Ollama está disponible, pero falta descargar qwen3.5:4b. Ejecuta: ollama pull qwen3.5:4b';setEngineStatus(text);return{reply:text};} catch(error) {setEngineStatus(`La comprobación no se completó: ${error.message}`);throw error;}});
  }
  const quick=(label,tool,day='any')=>void send(label,{tool,term:'',day});
  let hasDraft=false;
  try{const draft=session.read().draft;hasDraft=!!(draft?.client||draft?.product||draft?.description||draft?.price);}catch{/* Espacio cerrado. */}
  return <>
    {open&&<aside id="creativa-assistant-panel" className="a-chat" aria-label="Asistente Creativa" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(studio)setStudio(null);else minimize();}}}>
      <header className="a-chat-header"><div className="a-avatar"><ChatIcon/></div><div><h2>Tu ayudante Creativa</h2><span>Una ayuda para seguir trabajando</span></div><button aria-label="Minimizar chat" onClick={minimize}>×</button></header>
      <div className="a-context">{welcome.order?`${welcome.order.client} · ${welcome.order.design?`versión ${welcome.order.version}: ${welcome.order.design}`:'Sin diseño adjunto'}`:`Estás en ${welcome.page}`}{welcome.order&&<button className="a-return" onClick={minimize}>Volver al pedido</button>}</div>
      {studio?<Suspense fallback={<p role="status">Abriendo opciones…</p>}><AssistantStudio assistant={assistant} session={session} context={context} initialTool={studio.tool} initialText={studio.seed} navigate={navigate} onBack={()=>setStudio(null)}/></Suspense>:<>
        <div className="a-chat-body" role="log" aria-label="Conversación con Creativa" aria-live="polite" aria-relevant="additions">
          {!messages.length&&<div className="a-welcome"><p className="a-greeting">Hola, {welcome.name} 👋</p><h3>{welcome.order?'Seguimos con este trabajo':'¿Qué necesitas hacer hoy?'}</h3><p>{welcome.order?'Puedo revisar lo que falta, abrir el diseño o preparar un mensaje para el cliente.':welcome.help}</p></div>}
          {messages.map(item=>item.role==='user'?<div className="a-user-message" key={item.id}>{item.text}</div>:<div className="a-assistant-message" key={item.id}>
            {item.stale?<details className="a-archive"><summary>Respuesta anterior · los datos cambiaron</summary>{item.answer?.result?<p>{item.answer.result.title}. Solicita un análisis actualizado para ver sus evidencias.</p>:<AnswerCard answer={item.answer} stale navigate={navigate} chooseTool={chooseTool}/>}</details>
              :item.answer?.result?<Suspense fallback={<p>Cargando resultado…</p>}><AssistantResult result={item.answer.result} hasDraft={hasDraft} applyBrief={applyBrief} navigate={navigate} setNotice={setStatus}/></Suspense>
                :item.answer?<AnswerCard answer={item.answer} navigate={navigate} chooseTool={chooseTool}/>:<p>{item.text}</p>}
          </div>)}
          {busy&&<p className="a-thinking" role="status"><span/>{elapsed>=8?'La IA local sigue trabajando. Puedes cancelarla y continuar.':'Estoy revisando…'}<button onClick={cancel}>Cancelar consulta</button></p>}
          <div ref={bottom}/>
        </div>
        <div className="a-suggestions" aria-label="Sugerencias del asistente">
          {welcome.order?<><button disabled={busy} onClick={()=>void send('¿Qué falta aquí?')}>¿Qué falta aquí?</button><button disabled={busy} onClick={()=>void send('Abre el diseño')}>Ver diseño</button><button disabled={busy} onClick={()=>void send('Prepara el mensaje')}>Mensaje al cliente</button></>
            :<><button disabled={busy} onClick={()=>quick('¿Qué tengo para hoy?','pending','today')}>Para hoy</button><button disabled={busy} onClick={()=>quick('Ver pendientes','pending')}>Ver pendientes</button><button disabled={busy} onClick={()=>quick('Revisar bloqueos de impresión','blocked')}>¿Qué falta para imprimir?</button></>}
        </div>
        <form className="a-composer" onSubmit={e=>{e.preventDefault();void send();}}>
          <div className="a-write">{attachment&&<div className="a-attachment">{attachment.name}<button type="button" aria-label="Quitar adjunto" onClick={()=>setAttachment(null)}>×</button></div>}
          <label className="a-input-label"><span className="a-sr-only">Tu pregunta</span><textarea ref={input} value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} rows={2} placeholder={pendingTask.current==='brief'?'Pega aquí el mensaje del cliente…':welcome.order?'¿Qué falta? ¿Cómo sigo?':'Busca un cliente o escribe lo que necesitas…'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!busy)void send();}}}/></label></div>
          <div className="a-compose-actions"><button type="button" disabled={busy} aria-label="Adjuntar archivo para revisar" onClick={()=>files.current.click()}>＋</button><button className="a-send" disabled={busy||(!question.trim()&&!attachment)} aria-label="Consultar al asistente">↑</button></div>
          <input ref={files} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="a-sr-only" aria-label="Archivo para el asistente" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>10*1024*1024){setStatus('Adjunta un PDF o imagen de hasta 10 MB.');return;}setAttachment(file);}}/>
        </form>
        <p className="a-status" role="status">{status}</p>
        <details className="a-engine"><summary>Más opciones y ayuda</summary><p>Las búsquedas y mensajes de confirmación funcionan sin cargar IA. Los análisis usan Qwen3.5 de 4B. La conversación se borra al bloquear.</p><button onClick={()=>chooseTool('review')}>Herramientas de la imprenta</button><button disabled={busy} onClick={()=>void checkEngine()}>Comprobar modelo local</button>{engineStatus&&<p>{engineStatus}</p>}</details>
      </>}
    </aside>}
  </>;
}
