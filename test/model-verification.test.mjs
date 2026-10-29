import test from 'node:test';
import assert from 'node:assert/strict';
import { createOllamaClient } from '../src/infrastructure/assistant/ollama-client.js';
import { createDesktopModel } from '../src/infrastructure/assistant/desktop-model.js';

test('modelo instalado no se declara listo sin una respuesta válida',async()=>{
  const calls=[];
  const client=createOllamaClient({fetcher:async(url)=>{calls.push(url);return Response.json(url.endsWith('/tags')?{models:[{name:'qwen3.5:4b'}]}:{done:true,message:{content:'{"tool":"pending","term":"","day":"today"}'}});}});
  const result=await client.verify();assert.equal(result.ready,true);assert.equal(calls.length,2);assert.ok(calls[1].endsWith('/api/chat'));
  const missing=createOllamaClient({fetcher:async()=>Response.json({models:[]})});assert.equal((await missing.verify()).ready,false);
  const wrong=createOllamaClient({fetcher:async url=>Response.json(url.endsWith('/tags')?{models:[{name:'qwen3.5:4b'}]}:{done:true,message:{content:'{"tool":"unsupported","term":"","day":"any"}'}})});
  await assert.rejects(()=>wrong.verify(),/no superó/);
});
test('comprobación usa el puente acotado y propaga el fallo del motor',async()=>{
  let sent;const model=createDesktopModel({request:async value=>{sent=value;return {ok:false,error:'No se pudo cargar el modelo.'};}});
  await assert.rejects(()=>model.verify(),/No se pudo cargar/);assert.equal(sent.action,'verify');assert.deepEqual(Object.keys(sent).sort(),['action','id']);
});
