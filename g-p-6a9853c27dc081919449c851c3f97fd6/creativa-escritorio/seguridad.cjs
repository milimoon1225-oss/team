const path = require('node:path');

const APP_ORIGIN = 'app://creativa';
const BACKEND_HOST = 'mtsvbkncnnvzqnkhzrwz.supabase.co';
const EXTERNAL_HOSTS = new Set(['wa.me', 'chat.whatsapp.com', 'api.whatsapp.com', 'web.whatsapp.com', BACKEND_HOST]);

function esLocal(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === 'app:' && url.hostname === 'creativa' && !url.port && !url.username && !url.password;
  } catch { return false; }
}

function enlaceExternoPermitido(valor) {
  if (typeof valor !== 'string' || /[\u0000-\u0020\u007f]/.test(valor)) return false;
  if (/^tel:\+?[1-9][0-9]{6,14}$/.test(valor)) return true;
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
    if (!EXTERNAL_HOSTS.has(url.hostname)) return false;
    if (url.hostname === BACKEND_HOST) return url.pathname.startsWith('/storage/v1/object/sign/');
    return true;
  } catch { return false; }
}

function archivoLocal(valor, raiz) {
  if (!esLocal(valor)) return null;
  try {
    const url = new URL(valor);
    const ruta = decodeURIComponent(url.pathname);
    if (/[\x00-\x1f\\:]/.test(ruta) || ruta.split('/').some(p => p === '..' || p === '.')) return null;
    const archivo = path.resolve(raiz, `.${ruta === '/' ? '/index.html' : ruta}`);
    const relativa = path.relative(raiz, archivo);
    if (relativa.startsWith('..') || path.isAbsolute(relativa)) return null;
    return archivo;
  } catch { return null; }
}

const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${BACKEND_HOST}`,
  "font-src 'self' data:",
  `connect-src 'self' https://${BACKEND_HOST} wss://${BACKEND_HOST}`,
  "worker-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

module.exports = { APP_ORIGIN, BACKEND_HOST, CSP, esLocal, enlaceExternoPermitido, archivoLocal };
