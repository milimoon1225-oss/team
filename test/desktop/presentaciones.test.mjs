import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {validarPresentacion}=createRequire(import.meta.url)('../../desktop/presentaciones.cjs');
const panel={url:'data:image/png;base64,aGVsbG8=',fit:'contain',rotation:0};
const projection=()=>({schema:1,variants:[{schema:1,model:'card',widthMm:90,heightMm:50,thicknessMm:.35,panels:{front:{...panel},back:{...panel}},versionLabel:'Versión 1',demo:true}]});
test('IPC admite exclusivamente geometría e imágenes de la presentación',()=>{
  assert.ok(validarPresentacion(projection()));
  for(const change of [p=>{p.documents={};},p=>{p.variants[0].total=100;},p=>{p.variants[0].panels.front.url='https://host/image.png';},p=>{p.variants[0].panels.front.url='data:image/svg+xml;base64,aGVsbG8=';},p=>{p.variants[0].widthMm=-1;}]){
    const value=projection();change(value);assert.throws(()=>validarPresentacion(value),/no válida/);
  }
});
test('IPC permite acabados y máscaras locales, rechaza rutas y parámetros adicionales',async()=>{
  const {customerProjection,newPreview}=await import('../../src/domain/preview.js');
  const source={...newPreview('card'),panels:{front:{...panel,masks:{foil:{url:panel.url,fileId:'privado'}}},back:{...panel}}};
  const value=customerProjection([source]);assert.ok(validarPresentacion(value));
  for(const mutate of [p=>{p.variants[0].appearance.account='privada';},p=>{p.variants[0].panels.front.masks.foil='https://host/mask.png';},p=>{p.variants[0].appearance.lightIntensity=Infinity;}]){
    const bad=structuredClone(value);mutate(bad);assert.throws(()=>validarPresentacion(bad),/no válida/);
  }
});
test('IPC acepta cada formato registrado con sus caras exactas y rechaza caras faltantes',async()=>{
  const {PREVIEW_MODELS,customerProjection,newPreview}=await import('../../src/domain/preview.js');
  for(const model of Object.keys(PREVIEW_MODELS)) {
    const source={...newPreview(model),panels:Object.fromEntries(PREVIEW_MODELS[model].slots.map(slot=>[slot,{...panel}]))};
    const value=customerProjection([source]);assert.ok(validarPresentacion(value));
    const missing=structuredClone(value);delete missing.variants[0].panels[PREVIEW_MODELS[model].slots[0]];assert.throws(()=>validarPresentacion(missing));
    const extra=structuredClone(value);extra.variants[0].panels.secret={...panel};assert.throws(()=>validarPresentacion(extra));
  }
});
