import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssistant } from '../src/application/assistant/ask-assistant.js';
import { createDemonstration } from '../src/application/demonstration.js';
import { initialState } from '../src/domain/workspace.js';
import { createSession } from '../src/application/session.js';
import { PREVIEW_MODELS } from '../src/domain/preview.js';
import { STAGES, validateState, cashEntries, today } from '../src/domain/operations.js';

const now = new Date('2026-10-24T02:00:00Z');
const asset = { hash: 'a'.repeat(64), name: 'ejemplo.webp', url: 'data:image/webp;base64,AAAA' };
const files = { demoPreview: async model => Object.fromEntries(PREVIEW_MODELS[model].slots.map(slot => [slot, asset])) };
const state = () => {
  const s = initialState({ mode: 'standalone', name: 'Ana Torres', userId: 'ana', device: 'pc', now });
  s.documents.uno = { id: 'uno', kind: 'order', code: 'PC-UNO', rev: 1, client: 'Cliente', product: 'Invitaciones', description: '', qty: 100, received: today(now), delivery: `${today(now)}T18:00`, stage: 'Diseño', assignee: 'ana', designs: [], approval: null, audit: [] };
  return s;
};
const session = s => createSession({ opened: { state: s }, repository: { save: async (o, next) => ({ ...o, state: next }) }, release() {} });
const assistant = () => createAssistant({ languageModel: { interpret: async () => ({ tool: 'search', term: 'Invitaciones', day: 'any' }) }, now: () => now });

test('conversación contextual: nombre, qué falta y seguimiento mañana sin usar IA', async () => {
  const app = assistant(), s = session(state());
  assert.equal(app.welcome(s, { page: 'Producción', orderId: 'uno' }).name, 'Ana');
  const greeting = await app.chat(s, { question: 'Hola', context: { page: 'Producción' } }); assert.match(greeting.reply, /Ana/);
  const missing = await app.chat(s, { question: '¿Qué falta?', context: { orderId: 'uno' } });
  assert.equal(missing.rows[0].id, 'uno'); assert.equal(missing.rows[0].actions[0].action.target, 'design-upload');
  const next = await app.chat(s, { question: '¿Y mañana?', context: { lastQuery: { tool: 'pending', term: '', day: 'today' } } });
  assert.equal(next.query.day, 'tomorrow'); assert.equal(next.total, 0);
  assert.equal((await app.chat(s, { question: 'Busca las invitaciones', context: {} })).source, 'quick');
});
test('navegación semántica revalida roles y asignación; nunca acepta URL ni campos extra', async () => {
  const app = assistant(), s = session(state());
  const response = await app.chat(s, { question: 'Llévame a caja', context: {} }); assert.equal(response.navigation.target, 'cash');
  assert.equal(app.navigate(s, { target: 'design-upload', orderId: 'uno' }).orderId, 'uno');
  for (const action of [{ target: 'https://example.com' }, { target: 'cash', url: '/admin' }, { target: 'design-upload', orderId: 'uno', tab: 'Pagos' }]) assert.throws(() => app.navigate(s, action));
  await s.update(s => ({ ...s, profile: { ...s.profile, rol: 'disenador' } }));
  assert.throws(() => app.navigate(s, { target: 'cash' }), /acceso/);
  await s.update(s => ({ ...s, documents: { uno: { ...s.documents.uno, assignee: 'otro' } } }));
  assert.throws(() => app.navigate(s, { target: 'design-upload', orderId: 'uno' }), /disponible/);
  await assert.rejects(() => app.chat(s, { question: 'Qué falta', context: { orderId: 'uno' } }), /disponible/);
});
test('demostración temporal coherente: siete etapas, caja, costos, historial y diecinueve vistas 3D', async () => {
  const demo = await createDemonstration({ files, now });
  const data = demo.read(); validateState(data);
  const orders = Object.values(data.documents).filter(d => d.kind === 'order');
  assert.equal(orders.length, 19); assert.deepEqual([...new Set(orders.filter(d => !d.cancelled).map(d => d.stage))], STAGES);
  assert.equal(orders.flatMap(o => o.previews || []).length, 19);
  assert.equal(data.demonstration, true); assert.equal(data.mode, 'standalone'); assert.equal(data.queue.length, 0);
  assert.ok(cashEntries(data.documents, today(now)).length > 5); assert.ok(orders.every(o => o.costs.length && o.audit.length > 3));
  await assert.rejects(() => demo.backup(), /temporal/);
  await demo.close(); assert.throws(() => demo.read(), /bloqueado/);
  const second = await createDemonstration({ files, now }); assert.equal(Object.values(second.read().documents).filter(d => d.kind === 'order').length, 19);
});
