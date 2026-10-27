import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/application/session.js';
import { createWorkspace } from '../src/application/workspace.js';
import { initialState } from '../src/domain/workspace.js';
import { today } from '../src/domain/operations.js';

const now=()=>new Date('2026-10-23T15:00:00Z');
const state=()=>initialState({mode:'standalone',name:'Admin',device:crypto.randomUUID(),userId:crypto.randomUUID(),now:now()});
const payload={client:'Cliente',phone:'',product:'Tarjetas',qty:100,received:today(now()),delivery:`${today(now())}T18:00`,total:10000};
function repository() {
  let saved=null,locked=false,releases=0;
  return {
    readEnvelope:async()=>saved?.envelope || null,
    async exclusive(){if(locked)throw new Error('Otra ventana');locked=true;return()=>{locked=false;releases++;};},
    async create(_pin,s){saved={state:structuredClone(s),envelope:{revision:1}};return saved;},
    async decrypt(){if(!saved)throw new Error('No existe');return saved;},
    async save(opened,s){saved={...opened,state:structuredClone(s),envelope:{revision:opened.envelope.revision+1}};return saved;},
    async restore(envelope){if(saved)throw new Error('Ya existe');saved=envelope;return saved;},
    get releases(){return releases;},get locked(){return locked;},get saved(){return saved;},
  };
}
const unreachable=new Proxy({}, {get:()=>async()=>{throw new Error('No debería usar red');}});
const files={readBackup:async f=>f,prepareDesign:async f=>f,inspect:async()=>({hash:'a'.repeat(64),url:'data:prueba'}),toBlob:async()=>({type:'application/pdf'})};
const local=async(repo=repository(),extra={})=>{
  const app=createWorkspace({repository:repo,remote:unreachable,files,now,...extra});
  const session=await app.open({exists:false,pin:'31415926',confirm:'31415926',mode:'standalone',name:'Admin'});
  return {app,session,repo};
};

test('sesión: serializa cambios sobre el estado vigente y libera el bloqueo después del último guardado',async()=>{
  let releaseSave;const wait=new Promise(r=>{releaseSave=r;});let count=0,released=false;
  const session=createSession({opened:{state:{n:0},envelope:{revision:1}},repository:{save:async(o,s)=>{count++;if(count===1)await wait;return {...o,state:s,envelope:{revision:o.envelope.revision+1}};}},release:()=>{released=true;}});
  const a=session.update(s=>({...s,n:s.n+1})),b=session.update(s=>({...s,n:s.n+1}));
  assert.equal(session.hasWrites(),true);const close=session.close();
  await assert.rejects(()=>session.update(s=>s),/bloqueado/);assert.equal(released,false);
  releaseSave();await Promise.all([a,b,close]);assert.equal((await b).n,2);assert.equal(released,true);assert.throws(()=>session.read(),/bloqueado/);
});
test('sesión: fallo de disco conserva estado y respaldo; el siguiente guardado puede recuperarse',async()=>{
  let fail=true;
  const session=createSession({opened:{state:{n:0},envelope:{revision:1}},repository:{save:async(o,s)=>{if(fail)throw new Error('Disco lleno');return {...o,state:s,envelope:{revision:2}};}},release:()=>{}});
  await assert.rejects(()=>session.update(s=>({...s,n:1})),/Disco lleno/);assert.equal(session.read().n,0);assert.equal(JSON.parse(await session.backup()).revision,1);
  fail=false;await session.update(s=>({...s,n:s.n+2}));assert.equal(session.read().n,2);
  await session.close();await session.close();
});
test('casos de uso locales: preparación, pedido, cobro, devolución, respaldo y reapertura sin red',async()=>{
  const {app,session,repo}=await local();const id=crypto.randomUUID();
  await app.execute(session,{type:'create',target:id,payload});
  await app.execute(session,{type:'payment',target:id,payload:{amount:2000,method:'Yape'}});
  const payment=session.read().documents[id].payments[0].id;
  await app.execute(session,{type:'refund',target:id,payload:{paymentId:payment,amount:500,reason:'Corrección'}});
  assert.equal(session.read().documents[id].payments.length,2);assert.equal(session.read().queue.length,0);
  const backup=await app.backup(session);assert.equal(JSON.parse(backup.text).revision,4);
  await app.lock(session);assert.equal(repo.releases,1);
  const reopened=await app.open({exists:true,pin:'31415926'});assert.equal(reopened.read().documents[id].payments[1].amount,-500);await app.lock(reopened);
});
test('preparación y restauración fallidas liberan el bloqueo sin sobrescribir otra copia',async()=>{
  const repo=repository(),app=createWorkspace({repository:repo,remote:unreachable,files,now});
  await assert.rejects(()=>app.open({exists:false,pin:'31415926',confirm:'distinto',mode:'standalone',name:'Admin'}),/PIN/);assert.equal(repo.locked,false);assert.equal(repo.saved,null);
  const session=await app.open({exists:false,pin:'31415926',confirm:'31415926',mode:'standalone',name:'Admin'});await app.lock(session);
  const before=structuredClone(repo.saved);await assert.rejects(()=>app.restore({file:{state:state()},pin:'31415926'}),/Ya existe/);assert.equal(repo.locked,false);assert.deepEqual(repo.saved,before);
});
test('archivo y operación se guardan juntos; una validación fallida no deja archivos huérfanos',async()=>{
  const {app,session}=await local();const id=crypto.randomUUID(),file={name:'Final.pdf',hash:'a'.repeat(64),url:'data:archivo'};
  await assert.rejects(()=>app.attachDesign(session,id,file),/pedido/);assert.deepEqual(session.read().files,{});
  await app.execute(session,{type:'create',target:id,payload});await app.attachDesign(session,id,file);
  assert.equal(Object.keys(session.read().files).length,1);assert.equal(session.read().documents[id].designs.length,1);
});

test('edición local: rechaza abrir un modo ajeno sin crear datos y libera el bloqueo', async () => {
  const repo=repository(), app=createWorkspace({repository:repo,files,now});
  await assert.rejects(()=>app.open({exists:false,pin:'31415926',confirm:'31415926',mode:'shared',name:'Admin'}),/no válida/);
  assert.equal(repo.saved,null); assert.equal(repo.locked,false);
});
test('diseñador no puede cobrar ni cambiar el responsable desde los casos de uso', async () => {
  const {app,session}=await local();
  await session.update(s=>({...s,profile:{...s.profile,rol:'disenador'}}));
  await assert.rejects(()=>app.execute(session,{type:'create',payload}),/administración/);
  await assert.rejects(()=>app.rename(session,'Otro'),/administración/);
});
