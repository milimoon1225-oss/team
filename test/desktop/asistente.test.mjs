import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { crearAsistente } = createRequire(import.meta.url)('../../desktop/asistente.cjs');
const id = '00000000-0000-4000-8000-000000000001';
test('IPC niega clientes, subframes y solicitudes arbitrarias antes de usar el modelo', async () => {
  let calls = 0;
  const api = crearAsistente({ autorizado: e => e === 'staff-main', getClient: async () => { calls++; return { status: async () => ({ models: [] }) }; } });
  for (const event of ['customer', 'subframe']) await assert.rejects(() => api.request(event, { id, action: 'status' }), /autorizada/);
  for (const value of [{ id, action: 'shell' }, { id, action: 'status', url: 'https://evil.test' }, { id, action: 'interpret', question: 'Hola', model: 'cloud:latest' }]) await assert.rejects(() => api.request('staff-main', value));
  assert.equal(calls, 0); assert.equal((await api.request('staff-main', { id, action: 'status' })).ok, true);
});
test('IPC cancelación, concurrencia y respuesta tardía', async () => {
  let finish, signal;
  const api = crearAsistente({ autorizado: () => true, getClient: async () => ({ interpret: args => { signal = args.signal; return new Promise(r => { finish = r; }); } }) });
  const job = api.request({}, { id, action: 'interpret', question: 'Pendientes', model: 'qwen3.5:4b' });
  await Promise.resolve(); assert.equal((await api.request({}, { id, action: 'status' })).ok, false);
  api.cancel({}, id); assert.equal(signal.aborted, true); finish({ tool: 'pending' });
  assert.equal((await job).ok, false);
});
test('IPC multimodal permite tareas acotadas y rechaza comandos, imágenes excesivas y campos libres', async () => {
  let count=0;
  const api=crearAsistente({autorizado:event=>event==='staff-main',getClient:async()=>({analyze:async args=>{count++;assert.equal(args.task,'review');assert.deepEqual(args.images,['AAAA']);return {summary:'Revisión de prueba',items:[]};}})});
  const valid={id,action:'analyze',task:'review',payload:'{}',images:['AAAA']};
  await assert.rejects(()=>api.request('customer',valid),/autorizada/);
  for(const request of [{...valid,task:'shell'},{...valid,url:'https://evil.test'},{...valid,images:['http://evil.test/image']},{...valid,images:['A'.repeat(1800001)]},{...valid,payload:'x'.repeat(14001)}])await assert.rejects(()=>api.request('staff-main',request));
  assert.equal(count,0);assert.equal((await api.request('staff-main',valid)).ok,true);assert.equal(count,1);
});
