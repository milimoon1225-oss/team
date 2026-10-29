import { canReadOrder, conversationAccess, queryRevision, validateQuery, validateQuestion } from '../../domain/assistant/query-policy.js';
import { materialize } from '../../domain/operations.js';
import { queryWorkspace } from './query-tools.js';
import { conversationContext, planConversation, SCREEN_HELP } from './conversation.js';
import { resolveAssistantAction } from './navigation.js';
import { createAssistantTools } from './tools.js';
import { createAssistantWorkflows } from './workflows.js';

// Aborta incluso si el adaptador ignora la señal. Nunca publica una respuesta de otra sesión.
export function createAssistant({ languageModel, media, designs, query = queryWorkspace, now = () => new Date(), timeoutMs = 90000 }) {
  function observe(session, listener) {
    let previous = session.read(), revision = queryRevision(previous);
    return session.subscribe(state => {
      const next = queryRevision(state);
      if (revision !== next) {
        const before = materialize(previous), after = materialize(state);
        const revoked = conversationAccess(previous) !== conversationAccess(state) || Object.values(before).some(order => canReadOrder(previous.profile, order) && (!after[order.id] || !canReadOrder(state.profile, after[order.id])));
        revision = next; previous = state; listener({ revoked });
      }
    });
  }
  async function inSession(session, signal, task, duration = timeoutMs) {
    const initial = queryRevision(session.read());
    const controller = new AbortController();
    const cancel = () => controller.abort(new Error('Consulta cancelada.'));
    const changed = () => controller.abort(new Error('Los datos o permisos cambiaron. Vuelve a consultar.'));
    const offClose = session.onClose(cancel);
    const offChange = observe(session, changed);
    const timer = setTimeout(() => controller.abort(new Error('El modelo tardó demasiado. Reduce el contenido o prueba las consultas rápidas.')), duration);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    let onAbort;
    try {
      controller.signal.throwIfAborted();
      const aborted = new Promise((_, reject) => {
        onAbort = () => reject(controller.signal.reason);
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });
      const value = await Promise.race([task(controller.signal), aborted]);
      controller.signal.throwIfAborted();
      if (queryRevision(session.read()) !== initial) throw new Error('Los datos cambiaron. Vuelve a consultar.');
      return value;
    } finally {
      clearTimeout(timer); offClose(); offChange();
      signal?.removeEventListener('abort', cancel);
      controller.signal.removeEventListener('abort', onAbort);
    }
  }
  const assistant = {
    observe,
    navigate: (session, action) => resolveAssistantAction(session.read(), action),
    welcome(session, context) {
      const state = session.read(), current = conversationContext(state, context);
      return { name: state.profile.nombre.split(' ')[0], role: state.profile.rol,
        page: current.page, order: current.order ? { id: current.order.id, code: current.order.code, client: current.order.client, version: current.order.designs.length, design: current.order.designs.at(-1)?.name } : null,
        help: SCREEN_HELP[current.page] };
    },
    verify: (session, { signal } = {}) => inSession(session, signal, active => languageModel.verify({ signal: active }), 180000),
    status: (session, { signal } = {}) => inSession(session, signal, active => languageModel.status({ signal: active })),
    ask: (session, { question, model, signal }) => inSession(session, signal, async active => {
      const proposed = await languageModel.interpret({ question: validateQuestion(question), model, signal: active });
      active.throwIfAborted();
      return { ...query(session.read(), validateQuery(proposed), now()), source: 'model', model };
    }),
    quick: (session, request) => ({ ...query(session.read(), validateQuery(request), now()), source: 'quick' }),
  };
  assistant.chat = async (session, { question, context, signal, model = 'qwen3.5:4b' }) => {
    signal?.throwIfAborted();
    const plan = planConversation(session.read(), question, context);
    if (plan.inspect) return workflows.inspect(session, plan.inspect);
    if (plan.workflow) return workflows.run(session, { ...plan.workflow, signal });
    if (plan.query) return assistant.quick(session, plan.query);
    if (plan.reply) return { ...plan, source: 'guide' };
    return assistant.ask(session, { question: plan.question, model, signal });
  };
  assistant.tools = createAssistantTools({ languageModel, media, designs, now, runSession: (session, signal, task) => inSession(session, signal, task, 180000) });
  const workflows = createAssistantWorkflows({ tools: assistant.tools, query, now });
  return assistant;
}
