import { validateCustomerProjection } from '../../domain/preview.js';

export const customerPresenter = {
  async open(value) {
    validateCustomerProjection(value);
    if (window.creativaPresentations) { await window.creativaPresentations.open(value); return; }
    const token = crypto.randomUUID(), channel = new BroadcastChannel(`creativa-presentacion-${token}`);
    const address = new URL(location.href); address.search = `presentacion=${token}`; address.hash = 'cliente';
    const popup = window.open(address.href, '_blank');
    if (!popup) { channel.close(); throw new Error('Permite abrir la ventana de presentación en este navegador.'); }
    popup.opener = null;
    await new Promise((resolve, reject) => {
      let sent = false;
      const timeout = setTimeout(() => { channel.close(); reject(new Error('La ventana de presentación no respondió. Inténtalo otra vez.')); }, 15000);
      channel.onmessage = event => {
        if (event.data?.kind === 'request' && !sent) { sent = true; channel.postMessage({ kind: 'projection', value }); }
        if (event.data?.kind === 'ready') { clearTimeout(timeout); channel.close(); resolve(); }
      };
    });
  },
  async read() {
    if (window.creativaCustomer) return validateCustomerProjection(await window.creativaCustomer.read());
    const token = new URL(location.href).searchParams.get('presentacion');
    if (!/^[0-9a-f-]{36}$/.test(token || '')) throw new Error('Abre esta presentación desde el pedido.');
    const channel = new BroadcastChannel(`creativa-presentacion-${token}`);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { clearInterval(retry); channel.close(); reject(new Error('Esta presentación terminó. Vuelve a abrirla desde el pedido.')); }, 10000);
      const retry = setInterval(() => channel.postMessage({ kind: 'request' }), 300);
      channel.onmessage = event => {
        if (event.data?.kind !== 'projection') return;
        try {
          const value = validateCustomerProjection(event.data.value);
          channel.postMessage({ kind: 'ready' }); clearTimeout(timeout); clearInterval(retry); channel.close(); resolve(value);
        } catch (error) { clearTimeout(timeout); clearInterval(retry); channel.close(); reject(error); }
      };
      channel.postMessage({ kind: 'request' });
    });
  },
};
