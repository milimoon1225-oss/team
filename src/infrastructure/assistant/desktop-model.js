export function createDesktopModel(bridge) {
  async function call(action, args, signal) {
    const id = crypto.randomUUID();
    const cancel = () => { void bridge.cancel(id).catch(() => {}); };
    signal?.throwIfAborted();
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      const result = await bridge.request({ id, action, ...args });
      signal?.throwIfAborted();
      if (!result.ok) throw new Error(result.error);
      return result.value;
    } finally { signal?.removeEventListener('abort', cancel); }
  }
  return {
    analyze: ({ task, payload, images = [], signal }) => call('analyze', { task, payload, images }, signal),
    status: ({ signal } = {}) => call('status', {}, signal),
    interpret: ({ question, model, signal }) => call('interpret', { question, model }, signal),
  };
}
