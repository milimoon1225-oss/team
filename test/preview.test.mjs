import test from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEW_MODELS, panelSize, previewLeaves, newPreview, previewPose, validatePreview, customerProjection, validateCustomerProjection, appearanceOf } from '../src/domain/preview.js';
import { applyOperation, makeOperation, materialize, today } from '../src/domain/operations.js';
import { createPreviewService } from '../src/application/preview.js';
import { createSession } from '../src/application/session.js';
import { browserFiles } from '../src/infrastructure/browser/files.js';
const admin={id:crypto.randomUUID(),nombre:'Admin',rol:'administracion'};
const payload={client:'Cliente privado',phone:'999999999',product:'Invitación',qty:100,received:today(),delivery:`${today()}T18:00`,total:10000};
const op=(type,target,payload,expected=0)=>({id:crypto.randomUUID(),type,target,payload,expected,at:new Date().toISOString(),actor:admin,status:'pending'});
test('imágenes locales se decodifican sin peticiones, también bajo CSP de escritorio',async()=>{
  const blob=await browserFiles.toBlob('data:image/png;base64,aGVsbG8=');assert.equal(blob.type,'image/png');assert.equal(await blob.text(),'hello');
  await assert.rejects(()=>browserFiles.toBlob('https://host/imagen.png'),/no válida/);await assert.rejects(()=>browserFiles.toBlob('data:image/svg+xml;base64,aGVsbG8='),/no válida/);
});
function preview(model='card'){
  const p=newPreview(model);
  for(const slot of PREVIEW_MODELS[model].slots)p.panels[slot]={fileId:crypto.randomUUID(),hash:(slot==='back'?'b':'a').repeat(64),name:`${slot}.png`,fit:'contain',rotation:0,demo:false,url:'data:image/png;base64,aGVsbG8='};
  return p;
}
test('geometría: tarjeta y díptico con apertura, reversos y medidas acotadas',()=>{
  const c=newPreview('bifold');assert.equal(previewPose(c,0).centerX,52.5);assert.equal(previewPose(c,180).centerX,0);assert.equal(previewPose(c,180).hingeRotation,-180);assert.equal(previewPose(c,300).opening,180);
  assert.equal(previewPose(newPreview('card'),180).opening,0);
  assert.throws(()=>validatePreview({...preview(),widthMm:0}),/medidas/);assert.throws(()=>validatePreview(newPreview()),/todas las caras/);
});
test('nuevos pliegues: caras, medidas y apertura secuencial sin alterar la configuración',()=>{
  const tri=newPreview('trifold'),gate=newPreview('gatefold'),flat=newPreview('invitation');
  assert.equal(panelSize(tri,'insideRight').widthMm,103);
  assert.equal(panelSize(gate,'outsideLeft').widthMm,70);
  assert.equal(panelSize(gate,'insideCenter').widthMm,140);
  assert.equal(previewPose(tri,0).widthMm,105);
  assert.equal(previewPose(tri,180).widthMm,313);
  assert.equal(previewPose(gate,0).widthMm,140);
  assert.equal(previewPose(gate,180).widthMm,280);
  const halfway=previewLeaves(tri,90);
  assert.equal(halfway.find(leaf=>leaf.id==='left').rotationY,-180);
  assert.equal(halfway.find(leaf=>leaf.id==='right').rotationY,0);
  const before=structuredClone(gate),open=previewLeaves(gate,180);
  assert.equal(open.find(leaf=>leaf.id==='left').rotationY,-180);
  assert.equal(open.find(leaf=>leaf.id==='right').rotationY,180);assert.deepEqual(gate,before);
  assert.equal(previewLeaves(flat,180).length,1);assert.equal(previewPose(flat,180).opening,0);
  for(const model of ['card','bifold','invitation','trifold','gatefold']) {
    const config=preview(model);validatePreview(config);
    const leaves=previewLeaves(config,180),slots=leaves.flatMap(leaf=>[leaf.front,leaf.back]);
    assert.deepEqual(slots.toSorted(),PREVIEW_MODELS[model].slots.toSorted());
    const projected=customerProjection([config]);assert.equal(Object.keys(projected.variants[0].panels).length,slots.length);
    for(const slot of slots){const bad=structuredClone(config);delete bad.panels[slot];assert.throws(()=>validatePreview(bad),/todas las caras/);}
  }
  assert.throws(()=>previewPose(tri,NaN),/Apertura/);
  assert.throws(()=>newPreview('constructor'),/Modelo/);
});
test('formatos nuevos se guardan y recuperan localmente, manteniendo versiones y aprobación',async()=>{
  const id=crypto.randomUUID(),design=op('design',id,{name:'arte.pdf',fileId:crypto.randomUUID(),hash:'f'.repeat(64)});
  let documents=applyOperation({},op('create',id,payload),admin);documents=applyOperation(documents,design,admin);
  documents=applyOperation(documents,op('approve',id,{designId:design.id,customer:'Cliente'}),admin);
  const state={schema:3,mode:'standalone',profile:admin,documents,queue:[],files:{},lastSync:new Date().toISOString()};
  const session=createSession({opened:{state},repository:{save:async(o,state)=>({...o,state})},release(){}});
  const service=createPreviewService({files:{toBlob:async url=>url,inspect:async url=>({url})},remote:{},presenter:{}});
  for(const model of ['bifold','invitation','trifold','gatefold']) {
    const draft={...preview(model),sourceDesignId:design.id};await service.save(session,id,draft);
    const doc=session.read().documents[id],saved=doc.previews.at(-1),loaded=await service.load(session,id,saved.id);
    assert.equal(loaded.model,model);assert.equal(Object.keys(loaded.panels).length,PREVIEW_MODELS[model].slots.length);assert.equal(doc.approval.designId,design.id);
  }
  assert.equal(session.read().documents[id].previews.length,4);
});
test('proyección de cliente excluye finanzas, referencias, autor y rutas; rechaza HTML, SVG y URL externas',()=>{
  const source={...preview(),sourceDesignId:crypto.randomUUID(),client:'Privado',total:10000,phone:'999',by:'Admin',audit:[{}],versionLabel:'Versión 1'};
  const projection=customerProjection([source]);assert.equal(JSON.stringify(projection).includes('Privado'),false);assert.equal(JSON.stringify(projection).includes('fileId'),false);assert.equal(JSON.stringify(projection).includes('sourceDesignId'),false);
  assert.throws(()=>validateCustomerProjection({...projection,total:10000}),/no permitidos/);
  for(const url of ['javascript:alert(1)','https://host/imagen.png','data:image/svg+xml;base64,aGVsbG8=','data:text/html;base64,aGVsbG8=']){
    const changed=structuredClone(projection);changed.variants[0].panels.front.url=url;assert.throws(()=>validateCustomerProjection(changed),/Imagen/);
  }
});
test('guardar vista 3D es atómico y no cambia la aprobación de impresión; carga y presentación bloquean la sesión',async()=>{
  const id=crypto.randomUUID(),create=op('create',id,payload),art=op('design',id,{name:'Impresión.pdf',fileId:crypto.randomUUID(),hash:'c'.repeat(64)});
  let docs=applyOperation({},create,admin);docs=applyOperation(docs,art,admin);docs=applyOperation(docs,op('approve',id,{designId:art.id,customer:'Cliente'}),admin);
  let released=false,fail=false,presented;
  const state={schema:2,mode:'standalone',profile:admin,documents:docs,queue:[],files:{},cursor:0};
  const session=createSession({opened:{state,envelope:{revision:1}},repository:{save:async(o,s)=>{if(fail)throw new Error('Disco lleno');return {...o,state:s,envelope:{revision:o.envelope.revision+1}};}},release:()=>{released=true;}});
  const files={toBlob:async()=>({}),inspect:async()=>({url:'data:image/png;base64,aGVsbG8='})};
  const service=createPreviewService({files,remote:{},presenter:{open:async p=>{presented=p;}}});
  const draft={...preview('bifold'),sourceDesignId:art.id};
  fail=true;await assert.rejects(()=>service.save(session,id,draft),/Disco lleno/);assert.equal(session.read().documents[id].previews,undefined);assert.equal(Object.keys(session.read().files).length,0);
  fail=false;await service.save(session,id,draft);const doc=session.read().documents[id];assert.equal(session.read().schema,3);assert.equal(Object.keys(session.read().files).length,4);assert.equal(doc.designs.length,1);assert.equal(doc.approval.designId,art.id);
  const loaded=await service.load(session,id,doc.previews[0].id);assert.equal(loaded.panels.cover.url,draft.panels.cover.url);await service.present(session,[loaded]);assert.equal(released,true);assert.ok(presented.variants[0]);assert.throws(()=>session.read(),/bloqueado/);
});
test('vista pendiente se materializa una vez con sus archivos y dependencias',()=>{
  const id=crypto.randomUUID(),create=op('create',id,payload);const s={profile:admin,documents:{},queue:[create]};
  const next=makeOperation(s,'preview',id,preview());assert.equal(next.dependsOn,create.id);s.queue.push(next);assert.equal(materialize(s)[id].previews.length,1);
  const confirmed=applyOperation(applyOperation({},create,admin),next,admin);assert.equal(materialize({...s,documents:confirmed})[id].previews.length,1);
});
test('materiales y máscaras se guardan juntos, se recuperan y pasan al cliente sin metadatos privados',async()=>{
  const id=crypto.randomUUID(),documents=applyOperation({},op('create',id,payload),admin),draft=preview();
  draft.appearance={...appearanceOf(draft),paper:'textured',finish:'gloss',relief:'debossed',lighting:'side'};
  draft.panels.front.masks={foil:{fileId:crypto.randomUUID(),hash:'d'.repeat(64),name:'foil.png',url:'data:image/png;base64,bWFzaw=='}};
  const session=createSession({opened:{state:{schema:3,mode:'standalone',profile:admin,documents,queue:[],files:{}},envelope:{revision:1}},repository:{save:async(o,state)=>({...o,state})},release:()=>{}});
  const service=createPreviewService({files:{toBlob:async url=>url,inspect:async url=>({url})},remote:{},presenter:{}});
  await service.save(session,id,draft);const version=materialize(session.read())[id].previews[0];
  const loaded=await service.load(session,id,version.id);assert.deepEqual(loaded.appearance,draft.appearance);assert.equal(loaded.panels.front.masks.foil.url,draft.panels.front.masks.foil.url);
  const projection=customerProjection([loaded]);assert.equal(projection.variants[0].panels.front.masks.foil,draft.panels.front.masks.foil.url);
  assert.equal(JSON.stringify(projection).includes('fileId'),false);assert.equal(JSON.stringify(projection).includes('foil.png'),false);
  assert.throws(()=>validatePreview({...draft,appearance:{...draft.appearance,lightIntensity:Infinity}}),/Material/);
  const bad=structuredClone(projection);bad.variants[0].panels.front.masks.foil='https://host/mask.png';assert.throws(()=>validateCustomerProjection(bad),/Imagen/);
  const legacy=preview();delete legacy.appearance;assert.equal(appearanceOf(legacy).finish,'matte');validatePreview(legacy);
});
test('las máscaras deben coincidir en píxeles con la cara original',async()=>{
  let width=200;
  const service=createPreviewService({files:{preparePreview:async()=>({width,height:100}),dimensions:async()=>({width:200,height:100})},remote:{},presenter:{}});
  assert.ok((await service.prepareMask({}, {url:'local'},'foil')).fileId);
  width=100;await assert.rejects(()=>service.prepareMask({}, {url:'local'},'foil'),/200 × 100/);
  await assert.rejects(()=>service.prepareMask({},null,'foil'),/primero/);
});
