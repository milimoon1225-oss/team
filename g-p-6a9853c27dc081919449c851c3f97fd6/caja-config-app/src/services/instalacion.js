let invitacion = null;
let estado = 'preparando';
const avisar = () => window.dispatchEvent(new Event('creativa-instalacion'));
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); invitacion = event; avisar();
});
window.addEventListener('appinstalled', () => { invitacion = null; avisar(); });

export function estadoInstalacion() {
  return { disponible: !!invitacion, escritorio: location.protocol === 'app:',
    instalada: location.protocol === 'app:' || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    estado };
}
export async function instalar() {
  if (!invitacion) return;
  await invitacion.prompt();
  await invitacion.userChoice;
  invitacion = null; avisar();
}
export function prepararInstalacion() {
  if (location.protocol === 'app:') { estado = 'lista'; return; }
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) { estado = 'no-disponible'; return; }
  navigator.serviceWorker.register('/sw.js').then(async registro => {
    await navigator.serviceWorker.ready;
    estado = 'lista'; avisar();
    if (registro.waiting) { estado = 'actualizacion'; avisar(); }
    registro.addEventListener('updatefound', () => {
      const worker = registro.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) { estado = 'actualizacion'; avisar(); }
      });
    });
  }).catch(() => { estado = 'error'; avisar(); });
}
