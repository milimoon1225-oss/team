// Repositorio local inyectado: save(opened,state). Ningún acceso a React o IndexedDB.
export function createSession({ opened: initial, repository, release }) {
  let opened = initial, accepting = true, closing = null, pending = Promise.resolve(), writing = 0;
  const listeners = new Set();
  const closingListeners = new Set();
  function read() {
    if (!opened) throw new Error('El espacio está bloqueado.');
    return opened.state;
  }
  function update(change) {
    if (!accepting) return Promise.reject(new Error('El espacio está bloqueado.'));
    if (typeof change !== 'function') return Promise.reject(new Error('El guardado necesita una actualización sobre la copia vigente.'));
    writing++;
    const job = pending.then(async () => {
      const state = change(read());
      if (state === opened.state) return state;
      const saved = await repository.save(opened, state);
      opened = saved;
      for (const listener of listeners) { try { listener(state); } catch { /* Un render no revierte un guardado confirmado. */ } }
      return state;
    }).finally(() => { writing--; });
    pending = job.catch(() => {});
    return job;
  }
  async function backup() {
    await pending;
    read();
    return JSON.stringify(opened.envelope);
  }
  function close() {
    if (closing) return closing;
    accepting = false;
    for (const listener of closingListeners) { try { listener(); } catch { /* El bloqueo continúa. */ } }
    closingListeners.clear();
    closing = pending.finally(() => {
      opened = null; listeners.clear(); release();
    });
    return closing;
  }
  return { read: () => { if (!accepting) throw new Error('El espacio está bloqueado.'); return read(); }, update, backup, close, flush: () => pending, hasWrites: () => writing > 0,
    onClose(listener) { if (!accepting) listener(); else closingListeners.add(listener); return () => closingListeners.delete(listener); },
    subscribe(listener) { if (!accepting) throw new Error('El espacio está bloqueado.'); listeners.add(listener); return () => listeners.delete(listener); } };
}
