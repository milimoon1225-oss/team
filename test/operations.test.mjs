import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOperation, makeOperation, materialize, cents, paid, costs, today } from '../src/domain/operations.js';
const profile={id:'00000000-0000-4000-8000-000000000001',nombre:'Admin',rol:'administracion'};
const designer={id:'00000000-0000-4000-8000-000000000002',nombre:'Diseño',rol:'disenador'};
const createPayload={client:'Cliente',phone:'900000000',product:'Tarjetas',qty:100,received:today(),delivery:`${today()}T18:00`,total:10000,description:'Prueba'};
const operation=(type,target,payload,expected=0)=>({id:crypto.randomUUID(),type,target,payload,expected,at:new Date().toISOString(),actor:profile,status:'pending'});

test('motor local: producción, aprobaciones, devoluciones y jornada cerrada',()=>{
  const id=crypto.randomUUID();let docs={};
  const apply=(type,payload)=>{docs=applyOperation(docs,operation(type,id,payload),profile);};
  apply('create',createPayload);apply('payment',{amount:3000,method:'Yape'});
  const original=docs[id].payments[0].id;
  assert.throws(()=>apply('payment',{amount:8000,method:'Efectivo'}),/supera/);
  assert.throws(()=>apply('refund',{paymentId:original,amount:4000,reason:'Error'}),/disponible/);
  apply('refund',{paymentId:original,amount:1000,reason:'Corrección'});
  assert.equal(paid(docs[id]),2000);
  apply('cost',{amount:1500,category:'Material',concept:'Papel'});assert.equal(costs(docs[id]),1500);
  apply('stage',{stage:'Diseño'});
  assert.throws(()=>apply('stage',{stage:'Impresión'}),/aprobar/);
  apply('design',{name:'Final.pdf',hash:'a'.repeat(64),fileId:crypto.randomUUID()});
  const first=docs[id].designs.at(-1).id;
  apply('approve',{designId:first,customer:'Cliente'});
  apply('design',{name:'Correccion.pdf',hash:'b'.repeat(64),fileId:crypto.randomUUID()});
  assert.equal(docs[id].approval,null);
  assert.throws(()=>apply('approve',{designId:first,customer:'Cliente'}),/última/);
  apply('approve',{designId:docs[id].designs.at(-1).id,customer:'Cliente'});
  for(const stage of ['Impresión','Acabado','Control de calidad','Listo'])apply('stage',{stage});
  assert.throws(()=>apply('stage',{stage:'Entregado'}),/saldo/);
  apply('stage',{stage:'Entregado',reason:'Crédito autorizado'});
  const closing=operation('close',crypto.randomUUID(),{date:today(),counted:0});docs=applyOperation(docs,closing,profile);
  assert.throws(()=>apply('payment',{amount:1000,method:'Efectivo'}),/cerrada/);
  assert.throws(()=>applyOperation(docs,operation('payment',id,{amount:1000,method:'Efectivo'}),designer),/administración/);
  assert.equal(cents('10.23'),1023);assert.throws(()=>cents('NaN'));assert.throws(()=>cents('10.234'));
});

test('cola persistible: conserva identificadores y no modifica la base confirmada',()=>{
  const id=crypto.randomUUID(),state={profile,documents:{},queue:[]};
  const op=makeOperation(state,'create',id,createPayload);state.queue.push(op);
  const recovered=JSON.parse(JSON.stringify(state));
  assert.equal(recovered.queue[0].id,op.id);assert.equal(Object.keys(recovered.documents).length,0);
  assert.equal(materialize(recovered)[id].client,'Cliente');
});
