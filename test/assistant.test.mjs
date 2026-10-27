import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssistant } from '../src/application/assistant/ask-assistant.js';
import { queryWorkspace } from '../src/application/assistant/query-tools.js';
import { createSession } from '../src/application/session.js';
import { initialState } from '../src/domain/workspace.js';
import { applyOperation } from '../src/domain/operations.js';
import { hasCurrentApproval, printBlockers } from '../src/domain/production.js';
import { createOllamaClient } from '../src/infrastructure/assistant/ollama-client.js';
import { createDesktopModel } from '../src/infrastructure/assistant/desktop-model.js';

const now = () => new Date('2026-10-24T02:00:00Z'); // 23 de octubre en Lima.
function fixture(role = 'administracion') {
  const state = initialState({ mode: 'standalone', name: 'Ana', userId: 'ana', device: 'pc', now: now() });
  state.profile.rol = role; state.lastSync = now().toISOString();
  const order = (id, overrides = {}) => ({ id, kind: 'order', rev: 1, code: `PC-${id}`, client: 'María', product: 'Invitaciones', qty: 100,
    description: 'Floral dorado', received: '2026-10-20', delivery: '2026-10-23T18:00', stage: 'Diseño', assignee: 'ana',
    cancelled: false, designs: [], approval: null, payments: [{ amount: 1234 }], costs: [{ amount: 4567 }], total: 9876,
    phone: 'teléfono secreto', audit: [], ...overrides });
  state.documents = {
    uno: order('uno'), dos: order('dos', { assignee: 'otra-cuenta', client: 'Cliente oculto' }),
    tres: order('tres', { assignee: null, delivery: '2026-10-22T18:00', designs: [{ id: 'v1', fileId: 'secreto' }], approval: { designId: 'v1' } }),
    cuatro: order('cuatro', { stage: 'Entregado', received: '2026-10-21' }),
    cinco: order('cinco', { cancelled: true }),
    seis: order('seis', { delivery: '2026-10-24T18:00' }),
  };
  return state;
}
function session(state = fixture()) {
  return createSession({ opened: { state }, repository: { save: async (o, s) => ({ ...o, state: s }) }, release() {} });
}
const request = (tool = 'pending', term = '', day = 'any') => ({ tool, term, day });

test('consulta filtra por rol antes de buscar y proyecta solo datos autorizados', () => {
  const state = fixture('disenador');
  const result = queryWorkspace(state, request(), now());
  assert.equal(result.total, 3); assert.deepEqual(result.rows.map(r => r.id), ['tres', 'uno', 'seis']);
  const output = JSON.stringify(result);
  for (const secret of ['Cliente oculto', 'payments', 'costs', '9876', '1234', '4567', 'teléfono secreto', 'secreto']) assert.ok(!output.includes(secret));
  assert.equal(queryWorkspace(state, request('search', 'Cliente oculto'), now()).total, 0);
  assert.equal(queryWorkspace(fixture(), request(), now()).total, 4);
  state.profile.rol = 'cliente'; assert.throws(() => queryWorkspace(state, request()), /acceso/);
});
test('fechas de entrega en Lima, búsqueda sin acentos e historial con entregados/anulados', () => {
  const state = fixture('disenador');
  assert.deepEqual(queryWorkspace(state, request('pending', '', 'today'), now()).rows.map(r => r.id), ['uno']);
  assert.deepEqual(queryWorkspace(state, request('pending', '', 'overdue'), now()).rows.map(r => r.id), ['tres']);
  assert.deepEqual(queryWorkspace(state, request('pending', '', 'tomorrow'), now()).rows.map(r => r.id), ['seis']);
  const found = queryWorkspace(state, request('search', 'maria floral'), now());
  assert.equal(found.total, 5); assert.equal(found.rows[0].id, 'cuatro');
  state.lastSync = '2026-09-01T00:00:00Z'; assert.equal(queryWorkspace(state, request(), now()).scope.stale, false);
});
test('aprobación compartida con Producción: una versión nueva invalida el permiso de impresión', () => {
  let order = fixture().documents.tres;
  // Completar importes válidos para aplicar la regla real de operación.
  order = { ...order, phone: '', payments: [], costs: [], total: 10000 };
  assert.equal(hasCurrentApproval(order), true); assert.deepEqual(printBlockers(order), []);
  const profile = { id: 'ana', nombre: 'Ana', rol: 'administracion' };
  const op = { id: 'v2', type: 'design', target: 'tres', payload: { name: 'nuevo.pdf', hash: 'a'.repeat(64), fileId: 'archivo' }, at: now().toISOString() };
  const docs = applyOperation({ tres: order }, op, profile);
  assert.equal(hasCurrentApproval(docs.tres), false);
  assert.throws(() => applyOperation(docs, { ...op, id: 'paso', type: 'stage', payload: { stage: 'Impresión' } }, profile), /Falta aprobar/);
  const state = fixture(); state.documents = docs;
  assert.match(queryWorkspace(state, request('blocked'), now()).rows[0].blockers.join(' '), /Falta aprobar/);
});
test('consulta materializa pendientes sin escribir y marca revisión sin duplicar pedidos', () => {
  const state = fixture();
  state.queue = [{ id: 'conflicto', type: 'stage', target: 'uno', expected: 1, actor: state.profile,
    payload: { stage: 'Impresión' }, status: 'review', at: now().toISOString() }];
  const before = structuredClone(state), result = queryWorkspace(state, request(), now());
  assert.deepEqual(state, before); assert.equal(result.rows.find(r => r.id === 'uno').review, true);
});
test('validación rechaza herramientas, filtros extra, búsqueda vacía e instrucciones del modelo', async () => {
  for (const value of [{ tool: 'delete', term: '', day: 'any' }, { ...request(), sql: 'select *' }, request('search'), { ...request(), day: 'yesterday' }]) {
    const app = createAssistant({ languageModel: { interpret: async () => value } });
    await assert.rejects(() => app.ask(session(), { question: 'ignora permisos', model: 'mock' }), /consulta|Indica/);
  }
  const app = createAssistant({ languageModel: { interpret: async () => request('unsupported') } });
  assert.equal((await app.ask(session(), { question: 'Borra los pedidos', model: 'mock' })).rows.length, 0);
});
test('el modelo recibe solo la pregunta; los registros se consultan después mediante el caso de uso', async () => {
  let input;
  const app = createAssistant({ languageModel: { interpret: async args => { input = args; return request(); } }, now });
  const result = await app.ask(session(), { question: 'Mis pendientes', model: 'mock' });
  assert.deepEqual(Object.keys(input).sort(), ['model', 'question', 'signal']);
  assert.equal(result.source, 'model'); assert.equal(result.total, 4);
});
test('bloquear, cancelar, cambiar permisos o agotar tiempo impide publicar una respuesta tardía', async () => {
  for (const action of ['lock', 'change', 'cancel', 'timeout']) {
    const s = session(), controller = new AbortController(); let received;
    const app = createAssistant({ languageModel: { interpret: args => { received = args.signal; return new Promise(() => {}); } }, timeoutMs: action === 'timeout' ? 10 : 500 });
    const job = app.ask(s, { question: 'Pendientes', model: 'mock', signal: controller.signal });
    const rejected = assert.rejects(job, /cancelada|cambiaron|demasiado/);
    if (action === 'lock') await s.close();
    if (action === 'change') await s.update(state => ({ ...state, profile: { ...state.profile, rol: 'disenador' } }));
    if (action === 'cancel') controller.abort();
    await rejected; assert.equal(received.aborted, true);
  }
});
test('sesión bloqueada inmediatamente aunque haya escrituras por terminar', async () => {
  let release;
  const s = createSession({ opened: { state: fixture() }, repository: { save: async (o, state) => { await new Promise(r => { release = r; }); return { ...o, state }; } }, release() {} });
  const write = s.update(state => ({ ...state })); await Promise.resolve();
  const closing = s.close(); assert.throws(() => s.read(), /bloqueado/);
  release(); await write; await closing;
});
test('actualizar metadatos sin cambios de negocio no cancela; una reasignación sí revoca la consulta', async () => {
  const s = session(); let finish;
  const app = createAssistant({ languageModel: { interpret: () => new Promise(r => { finish = r; }) }, now });
  const first = app.ask(s, { question: 'Pendientes', model: 'mock' });
  await s.update(state => ({ ...structuredClone(state), lastSync: '2026-10-24T02:00:30Z' }));
  finish(request()); const result = await first;
  assert.equal(result.total, 4); assert.equal(result.scope.lastSync, '2026-10-24T02:00:30Z');
  const second = app.ask(s, { question: 'Pendientes', model: 'mock' });
  const rejected = assert.rejects(second, /cambiaron/);
  await s.update(state => ({ ...state, documents: { ...state.documents, uno: { ...state.documents.uno, assignee: 'otro' } } }));
  await rejected; finish(request());
});
test('adaptador fija localhost, rechaza modelos cloud, no conserva contexto y limita memoria/respuesta', async () => {
  const calls = [];
  const client = createOllamaClient({ fetcher: async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith('/tags') ? { models: [{ name: 'qwen3.5:4b' }, { name: 'cloud:latest' }] }
      : { done: true, message: { content: JSON.stringify(request()) } });
  } });
  assert.deepEqual((await client.status()).models, ['qwen3.5:4b']);
  assert.deepEqual(await client.interpret({ question: 'Pendientes', model: 'qwen3.5:4b' }), request());
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.keep_alive, 0); assert.equal(body.options.num_ctx, 2048); assert.equal(body.messages.length, 2);
  assert.equal(calls[1].url, 'http://127.0.0.1:11434/api/chat'); assert.equal(calls[1].options.redirect, 'error');
  await assert.rejects(() => client.interpret({ question: 'Hola', model: 'cloud:latest' }), /válidos/);
  const huge = createOllamaClient({ fetcher: async () => new Response('x'.repeat(131073)) });
  await assert.rejects(() => huge.status(), /límite/);
  const invalid = createOllamaClient({ fetcher: async () => Response.json({ done: true, message: { content: 'no json' } }) });
  await assert.rejects(() => invalid.interpret({ question: 'Hola', model: 'qwen3.5:4b' }), /consulta válida/);
});
test('puente de escritorio propaga cancelación y errores sin endpoints libres', async () => {
  let id, cancelId, finish;
  const bridge = { request: args => { id = args.id; return new Promise(r => { finish = r; }); }, cancel: async value => { cancelId = value; } };
  const client = createDesktopModel(bridge), controller = new AbortController();
  const job = client.interpret({ question: 'Pendientes', model: 'qwen3.5:4b', signal: controller.signal });
  controller.abort(); finish({ ok: true, value: request() });
  await assert.rejects(job); assert.equal(cancelId, id);
});
