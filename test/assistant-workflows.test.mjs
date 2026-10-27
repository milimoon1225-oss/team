import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssistant } from '../src/application/assistant/ask-assistant.js';
import { initialState } from '../src/domain/workspace.js';
import { createSession } from '../src/application/session.js';
import { createOllamaClient } from '../src/infrastructure/assistant/ollama-client.js';

const now = () => new Date('2026-10-26T15:00:00Z');
function fixture(role='administracion') {
  const state=initialState({mode:'standalone',name:'Ana',userId:'ana',device:'pc',now:now()});state.profile.rol=role;
  const order=(id,overrides={})=>({id,kind:'order',rev:1,code:`PC-${id}`,client:'María',product:'Invitaciones',qty:100,description:'Confirmar 20/12/2026',received:'2026-10-25',delivery:'2026-10-26T18:00',stage:'Diseño',assignee:'ana',designs:[],approval:null,audit:[],...overrides});
  state.documents={uno:order('uno'),dos:order('dos',{assignee:'otro',client:'Cliente oculto'}),tres:order('tres')};
  return createSession({opened:{state},repository:{save:async(o,state)=>({...o,state})},release(){}});
}
const unavailable={interpret:()=>{throw new Error('No debe cargar IA');},analyze:()=>{throw new Error('No debe cargar IA');}};

test('acciones cotidianas funcionan sin modelo y una búsqueda ambigua ofrece pedidos sin elegir uno',async()=>{
  const app=createAssistant({languageModel:unavailable,now}),s=fixture();
  for(const question of ['¿Qué pedidos tengo pendientes para hoy?','¿Qué trabajos están atrasados?','Mis pendientes','¿Qué tengo para mañana?','Busca trabajos de María','Encuentra el pedido de María','Busca las invitaciones']){
    const result=await app.chat(s,{question,context:{}});assert.equal(result.source,'quick',question);assert.equal(result.navigation,undefined);
  }
  const found=await app.chat(s,{question:'Busca el pedido de María',context:{}});assert.equal(found.total,2);assert.equal(found.contextOrderId,undefined);
  const missing=await app.chat(s,{question:'¿Qué falta aquí?',context:{orderId:'uno'}});assert.equal(missing.total,1);assert.equal(missing.rows[0].id,'uno');
  assert.match(missing.rows[0].blockers.join(' '),/Falta adjuntar/);
  const next=await app.chat(s,{question:'Ayúdame a continuar',context:{orderId:'uno'}});assert.equal(next.rows[0].actions[0].action.target,'design-upload');
});

test('pedido aprobado o entregado sigue teniendo respuesta contextual, sin certificación de impresión',async()=>{
  const app=createAssistant({languageModel:unavailable,now}),s=fixture();
  await s.update(state=>({...state,documents:{...state.documents,uno:{...state.documents.uno,designs:[{id:'v1',name:'final.pdf'}],approval:{designId:'v1'}}}}));
  const result=await app.chat(s,{question:'Qué falta',context:{orderId:'uno'}});assert.equal(result.rows.length,1);assert.match(result.reply,/verifica materiales/);
  await s.update(state=>({...state,documents:{...state.documents,uno:{...state.documents.uno,stage:'Entregado'}}}));
  assert.match((await app.chat(s,{question:'Qué falta',context:{orderId:'uno'}})).reply,/entrega ya está registrada/);
});

test('mensaje reutiliza la última versión sin IA ni escritura; confirmar lleva al registro explícito',async()=>{
  const app=createAssistant({languageModel:unavailable,now}),s=fixture();
  const noFile=await app.chat(s,{question:'Prepara el mensaje',context:{orderId:'uno'}});assert.match(noFile.reply,/adjunta/);
  await s.update(state=>({...state,documents:{...state.documents,uno:{...state.documents.uno,designs:[{id:'v1',name:'anterior.pdf'},{id:'v2',name:'final.pdf'}]}}}));
  const before=structuredClone(s.read());
  const answer=await app.chat(s,{question:'Prepara un mensaje para el cliente',context:{orderId:'uno'}});
  assert.match(answer.result.message,/versión 2: final.pdf/);assert.equal(answer.result.model,false);assert.deepEqual(s.read(),before);
  const confirm=await app.chat(s,{question:'Ya confirmó',context:{orderId:'uno'}});assert.equal(confirm.actions[0].action.target,'design-approval');assert.deepEqual(s.read(),before);
});

test('encargo conserva el mensaje y pide solo el contenido faltante; nunca crea un pedido',async()=>{
  let sent;
  const app=createAssistant({now,languageModel:{...unavailable,analyze:async args=>{sent=JSON.parse(args.payload);return {client:'María',product:'Invitaciones',qty:150,delivery:'',description:'Floral'};}}}),s=fixture();
  const ask=await app.chat(s,{question:'Prepara un encargo',context:{}});assert.equal(ask.pendingTask,'brief');assert.equal(ask.openTool,undefined);
  const message='Soy María, necesito 150 invitaciones florales.';
  const result=await app.chat(s,{question:message,context:{pendingTask:ask.pendingTask}});
  assert.equal(sent.message,message);assert.equal(result.result.brief.qty,150);assert.equal(Object.keys(s.read().documents).length,3);
  const explicit=await app.chat(s,{question:`Prepara un encargo: ${message}`,context:{}});assert.equal(explicit.result.brief.client,'María');
  assert.equal((await app.chat(s,{question:'Busca María',context:{pendingTask:'brief'}})).query.tool,'search');
  await assert.rejects(()=>app.chat(fixture('disenador'),{question:message,context:{pendingTask:'brief'}}),/administración/);
});

test('revisión y comparación eligen únicamente versiones del pedido abierto y no inventan medidas',async()=>{
  const calls=[],seen=[];
  const app=createAssistant({now,languageModel:{...unavailable,analyze:async args=>{calls.push(args);return args.task==='review'?{visibleText:'20/12/2026',summary:'Revisar',items:[]}:{summary:'Cambio',items:[]};}},
    designs:{get:async(_s,orderId,designId)=>{seen.push([orderId,designId]);return {blob:{},name:designId};}},
    media:{prepare:async(_blob,{name})=>({kind:'image',name,hash:'a'.repeat(64),text:'',image:'AAAA',previewUrl:'data:image/png;base64,AAAA'}),compare:async()=>({changedPercent:1})}}),s=fixture();
  await s.update(state=>({...state,documents:{...state.documents,uno:{...state.documents.uno,designs:[{id:'v1',name:'A'},{id:'v2',name:'B'}]}}}));
  const review=await app.chat(s,{question:'Revisa el diseño',context:{orderId:'uno'}});
  assert.deepEqual(seen,[['uno','v2']]);assert.match(review.result.checks[0].value,/no se confirmaron las medidas/);
  await app.chat(s,{question:'Compara las versiones',context:{orderId:'uno'}});assert.deepEqual(seen.slice(1),[['uno','v1'],['uno','v2']]);assert.equal(calls.length,2);
  await assert.rejects(()=>app.chat(fixture('disenador'),{question:'Revisa el diseño',context:{orderId:'dos'}}),/disponible/);
});

test('observador distingue cambios normales de pérdida de permisos y la navegación vieja se revalida',async()=>{
  const app=createAssistant({languageModel:unavailable,now}),s=fixture('disenador'),events=[];
  const off=app.observe(s,event=>events.push(event));
  await s.update(state=>({...state,documents:{...state.documents,uno:{...state.documents.uno,rev:2}}}));assert.equal(events.at(-1).revoked,false);
  await s.update(state=>({...state,documents:{...state.documents,nuevo:{...state.documents.uno,id:'nuevo'}}}));assert.equal(events.at(-1).revoked,false);
  await s.update(state=>({...state,documents:{...state.documents,uno:{...state.documents.uno,assignee:'otro'}}}));assert.equal(events.at(-1).revoked,true);
  assert.throws(()=>app.navigate(s,{target:'design-upload',orderId:'uno'}),/disponible/);off();await s.close();
});

test('cliente local limita solicitudes concurrentes incluso fuera del puente Electron',async()=>{
  let finish,count=0;
  const client=createOllamaClient({fetcher:()=>{count++;return new Promise(resolve=>{finish=resolve;});}});
  const first=client.status();await assert.rejects(()=>client.status(),/otra consulta/);assert.equal(count,1);
  finish(Response.json({models:[]}));await first;
});
