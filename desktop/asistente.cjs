// Puente acotado: la ventana de clientes no recibe estas capacidades.
function crearAsistente({ autorizado, getClient }) {
  let pending = null;
  function cancelAll() { pending?.controller.abort(); pending = null; }
  function assertSender(event) { if (!autorizado(event)) throw new Error('Ventana no autorizada.'); }
  return {
    cancelAll,
    cancel(event, id) {
      assertSender(event);
      if (typeof id === 'string' && pending?.id === id) cancelAll();
      return true;
    },
    async request(event, value) {
      assertSender(event);
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
          typeof value.id !== 'string' || !/^[a-f0-9-]{36}$/.test(value.id) ||
          !['status', 'verify', 'interpret', 'analyze'].includes(value.action) ||
          Object.keys(value).sort().join(',') !== (['status','verify'].includes(value.action) ? 'action,id' : value.action === 'analyze' ? 'action,id,images,payload,task' : 'action,id,model,question')) {
        throw new Error('Solicitud de asistente no válida.');
      }
      if (value.action === 'interpret' && (typeof value.question !== 'string' || !value.question.trim() || value.question.length > 1000 ||
          !['qwen3.5:4b'].includes(value.model))) throw new Error('Pregunta o modelo no permitido.');
      if (value.action === 'analyze' && (!['brief','review','compare','tag','knowledge','approval','search','explain'].includes(value.task) || typeof value.payload !== 'string' || value.payload.length > 14000 || !Array.isArray(value.images) || value.images.length > 2 || value.images.some(image => typeof image !== 'string' || image.length > 1800000 || !/^[A-Za-z0-9+/]+=*$/.test(image)) || value.images.reduce((n,s)=>n+s.length,0) > 3000000)) throw new Error('Análisis no permitido.');
      // No se acepta concurrencia arbitraria que pueda llenar la memoria del equipo.
      if (pending) return { ok: false, error: 'Hay otra consulta local en curso. Cancélala antes de continuar.' };
      const active = { id: value.id, controller: new AbortController() }; pending = active;
      try {
        const client = await getClient();
        active.controller.signal.throwIfAborted();
        const result = value.action === 'analyze' ? await client.analyze({ task: value.task, payload: value.payload, images: value.images, signal: active.controller.signal }) : value.action === 'verify' ? await client.verify({ signal: active.controller.signal }) : value.action === 'status'
          ? await client.status({ signal: active.controller.signal })
          : await client.interpret({ question: value.question, model: value.model, signal: active.controller.signal });
        active.controller.signal.throwIfAborted();
        return { ok: true, value: result };
      } catch (error) { return { ok: false, error: active.controller.signal.aborted ? 'Consulta cancelada.' : error.message }; }
      finally { if (pending === active) pending = null; }
    },
  };
}
module.exports = { crearAsistente };
