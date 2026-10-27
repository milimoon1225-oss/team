import test from 'node:test';
import { PREVIEW_MODELS } from '../src/domain/preview.js';
import assert from 'node:assert/strict';
import { createAssistant } from '../src/application/assistant/ask-assistant.js';
import { createSession } from '../src/application/session.js';
import { createDemonstration } from '../src/application/demonstration.js';
import { checkedBrief, checkedCitations, quoteSheet, retrievePassages, scheduleStation, technicalReview, validateAssistantData } from '../src/domain/assistant/tools.js';
import { createOllamaClient, validateAnalysisRequest } from '../src/infrastructure/assistant/ollama-client.js';

const now = new Date('2026-10-23T15:00:00Z');
const base = {qty:100,widthMm:90,heightMm:50,sheetWidthMm:200,sheetHeightMm:100,marginMm:0,gapMm:0,bleedMm:0,wastePercent:0,marginPercent:50,discountPercent:10,setupCents:1000,designCents:2000,sheetCents:100,printCents:50,finishCents:10};
const asset = {name:'muestra.webp',hash:'a'.repeat(64),url:'data:image/webp;base64,AAAA'};
async function setup() {
  const demo = await createDemonstration({files:{demoPreview:async model=>Object.fromEntries(PREVIEW_MODELS[model].slots.map(key=>[key,asset]))},now});
  const state=structuredClone(demo.read());delete state.demonstration;delete state.assistantData;await demo.close();
  const session=createSession({opened:{state},repository:{save:async(o,state)=>({...o,state})},release(){}});
  const calls=[];
  const model={analyze:async args=>{
    calls.push(args);const input=JSON.parse(args.payload);
    return {brief:{client:'María',product:'Invitaciones',qty:150,delivery:'',description:'Floral'},review:{visibleText:'MARIA Y JOSE 20/12/2025',summary:'Revisar el nombre.',items:[{detail:'Posible diferencia de nombre.',evidence:'MARIA'}]},compare:{summary:'Cambió el texto.',items:[{detail:'MARIO ahora es MARIA.',evidence:'A: MARIO; B: MARIA'}]},tag:{description:'Invitación azul con flores',tags:['azul','flores','boda']},knowledge:{answer:'Revisa la última versión.',citations:input.passages?[{id:input.passages[0].id,quote:input.passages[0].text.slice(0,80)}]:[]},approval:{message:'Confirma nombres y fecha de esta versión.',checklist:['Revisar nombres']},search:{terms:['azul','flores']},explain:{summary:'Se usan los costos o tiempos indicados.',notes:['Verifica los supuestos.']}}[args.task];
  }};
  const media={prepare:async()=>({kind:'image',originalWidth:1200,originalHeight:600,hash:asset.hash,image:'AAAA',previewUrl:asset.url,name:asset.name,page:1,text:''}),compare:async()=>({changedPercent:4,sameFile:false,image:asset.url,method:'Prueba'}),manual:async file=>({title:file.name,pages:[{number:1,text:'Para aprobar la invitación revisa los nombres y la fecha de la última versión del diseño.'}]})};
  const app=createAssistant({languageModel:model,media,designs:{get:async()=>({blob:new Blob(['image']),name:'muestra.webp'})},now:()=>now});
  return {app,session,calls};
}

test('cotización: cuadrícula, centavos, margen sobre venta, descuento y pérdida',()=>{
  const result=quoteSheet(base);assert.equal(result.yieldPerSheet,4);assert.equal(result.sheets,25);assert.equal(result.cost,7750);assert.equal(result.priceBeforeDiscount,15500);assert.equal(result.price,13950);assert.equal(result.gain,6200);
  assert.equal(quoteSheet({...base,discountPercent:80}).belowCost,true);
  assert.throws(()=>quoteSheet({...base,widthMm:999,heightMm:999}),/no cabe/);
  for(const invalid of [NaN,Infinity,-1,'100'])assert.throws(()=>quoteSheet({...base,qty:invalid}));
  assert.equal(quoteSheet({...base,wastePercent:10}).sheets,28);
});
test('capacidad: límites de jornada, días consecutivos y exclusión de bloqueados y tiempos ausentes',()=>{
  const orders=[{id:'a',qty:100,delivery:'2026-10-23T10:00',blockers:[]},{id:'b',qty:80,delivery:'2026-10-23T11:00',blockers:[]},{id:'c',qty:1,delivery:'2026-10-23T09:00',blockers:['Falta aprobar']},{id:'d',qty:1,delivery:'2026-10-24T12:00:00',blockers:[]}];
  const result=scheduleStation(orders,{startAt:'2026-10-23T09:00:00-05:00',dailyMinutes:60,estimates:{a:{setupMinutes:10,unitSeconds:30,finishMinutes:0},b:{setupMinutes:10,unitSeconds:30,finishMinutes:0}}});
  assert.equal(result.find(j=>j.id==='a').endAt,'2026-10-23T15:00:00.000Z');assert.equal(result.find(j=>j.id==='b').endAt,'2026-10-24T14:50:00.000Z');assert.equal(result.find(j=>j.id==='b').late,true);assert.equal(result.find(j=>j.id==='c').status,'blocked');assert.equal(result.find(j=>j.id==='d').status,'missing');
  assert.throws(()=>scheduleStation(orders,{startAt:'2026-10-23T23:00:00-05:00',dailyMinutes:120,estimates:{}}),/jornada/);
});
test('revisión técnica y fuentes: mediciones deterministas y citas exactas',()=>{
  const checks=technicalReview({kind:'image',originalWidth:1200,originalHeight:600},{widthMm:90,heightMm:50,bleedMm:3});assert.equal(checks[0].level,'review');assert.match(checks[0].value,/272 ppp/);
  assert.equal(technicalReview({kind:'pdf',pageWidthMm:96,pageHeightMm:56},{widthMm:90,heightMm:50,bleedMm:3})[0].level,'ok');
  const passages=retrievePassages([{id:'manual',title:'Guía',pages:[{number:2,text:'El papel debe secar durante el tiempo indicado por el fabricante antes del acabado.'}]}],'papel secar');
  assert.equal(passages[0].page,2);assert.equal(checkedCitations({answer:'Secado',citations:[{id:passages[0].id,quote:'El papel debe secar'}]},passages)[0].title,'Guía');
  assert.throws(()=>checkedCitations({answer:'No',citations:[{id:'fake',quote:'No existe en el manual'}]},passages),/cita/);
  assert.throws(()=>checkedBrief({client:'Inventado',product:'Invitación',qty:1,delivery:'',description:''},'Soy María'),/nombre/);
});
test('las ocho herramientas funcionan con puertos simulados y la propuesta no crea pedidos',async()=>{
  const {app,session,calls}=await setup(),orders=app.tools.catalog(session).orders,order=orders.find(o=>o.designs.length),source={orderId:order.id,designId:order.designs[0].id,page:1};
  const before=Object.keys(session.read().documents).length;
  const brief=await app.tools.run(session,{task:'brief',input:{message:'Soy María y necesito 150 invitaciones'}});assert.equal(brief.brief.qty,150);assert.equal(Object.keys(session.read().documents).length,before);
  await assert.rejects(()=>app.tools.applyBrief(session,brief.brief),/borrador/);await app.tools.applyBrief(session,brief.brief,true);assert.equal(session.read().draft.price,'');assert.equal(session.read().draft.client,'María');assert.equal(Object.keys(session.read().documents).length,before);
  assert.equal((await app.tools.run(session,{task:'review',input:{...source,widthMm:90,heightMm:50,bleedMm:3}})).checks.length,3);
  assert.equal((await app.tools.run(session,{task:'compare',input:{first:source,second:source}})).difference.changedPercent,4);
  const index=await app.tools.run(session,{task:'tag',input:source});await app.tools.saveIndex(session,index.index);
  assert.equal(app.tools.catalog(session).indexed,1);
  assert.ok((await app.tools.run(session,{task:'search',input:{question:'azul flores'}})).rows.some(row=>row.id===order.id));
  const saved=await app.tools.importManual(session,{name:'Proceso.txt'});assert.equal(saved.pages,1);
  const response=await app.tools.run(session,{task:'knowledge',input:{question:'aprobar invitación'}});assert.equal(response.sources.length,1);
  assert.match((await app.tools.run(session,{task:'approval',input:{orderId:order.id}})).message,/Confirma/);
  const quote=await app.tools.run(session,{task:'quote',input:{base,alternative:{...base,sheetCents:200}}});assert.ok(quote.quotes[1].cost>quote.quotes[0].cost);
  const capacity=await app.tools.run(session,{task:'capacity',input:{startAt:'2026-10-23T09:00:00-05:00',dailyMinutes:480,estimates:{}}});assert.ok(capacity.schedule.some(j=>j.status==='missing'));
  assert.equal((await app.tools.run(session,{task:'explain',input:{kind:'quote',data:{base,alternative:base}}})).quotes[0].price,13950);
  validateAssistantData(session.read().assistantData);
  for(const call of calls.filter(c=>['review','approval','tag'].includes(c.task)))for(const forbidden of ['payments','costs','phone'])assert.ok(!call.payload.includes(`"${forbidden}"`));
});
test('biblioteca y fichas respetan dueño, asignación y hash; finanzas solo administración',async()=>{
  const {app,session,calls}=await setup(),order=app.tools.catalog(session).orders.find(o=>o.designs.length);
  await assert.rejects(()=>app.tools.run(session,{task:'review',input:{orderId:'secret',designId:'secret'}}),/acceso/);assert.equal(calls.length,0);
  await session.update(s=>({...s,profile:{...s.profile,rol:'disenador'}}));
  await assert.rejects(()=>app.tools.run(session,{task:'brief',input:{message:'Soy María'}}),/administración/);
  await assert.rejects(()=>app.tools.run(session,{task:'quote',input:{base,alternative:base}}),/administración/);
  await assert.rejects(()=>app.tools.saveIndex(session,{orderId:order.id,designId:order.designs[0].id,hash:'f'.repeat(64),description:'X',tags:[]}),/acceso|versión/);
  await session.update(s=>({...s,assistantData:{version:1,ownerId:'otra-cuenta',revision:1,manuals:[],visualIndex:[]}}));assert.throws(()=>app.tools.catalog(session),/otra cuenta/);
});
test('cancelar una revisión impide entregar un resultado tardío',async()=>{
  const {session}=await setup();let finish;
  const app=createAssistant({languageModel:{analyze:()=>new Promise(r=>{finish=r;})},now:()=>now});
  const controller=new AbortController(),job=app.tools.run(session,{task:'brief',input:{message:'Soy María'},signal:controller.signal}),rejected=assert.rejects(job,/cancelada/);
  controller.abort();await rejected;finish({client:'María',product:'',qty:0,delivery:'',description:''});
});
test('protocolo multimodal admite solo tareas, formatos y tamaños acotados',async()=>{
  assert.throws(()=>validateAnalysisRequest({task:'shell',payload:'x',images:[]}));assert.throws(()=>validateAnalysisRequest({task:'review',payload:'x',images:[]}));assert.throws(()=>validateAnalysisRequest({task:'brief',payload:'x',images:['AAAA']}));
  const client=createOllamaClient({fetcher:async(_url,options)=>{const body=JSON.parse(options.body);assert.equal(body.model,'qwen3.5:4b');assert.equal(body.think,false);assert.equal(body.messages[1].images[0],'AAAA');return Response.json({done:true,message:{content:JSON.stringify({description:'Azul floral',tags:['azul','floral']})}});}});
  assert.equal((await client.analyze({task:'tag',payload:'{}',images:['AAAA']})).tags.length,2);
});
