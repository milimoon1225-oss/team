const path = require('node:path');

const APP_ORIGIN = 'app://creativa';
function esLocal(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === 'app:' && url.hostname === 'creativa' && !url.port && !url.username && !url.password;
  } catch { return false; }
}

// Esta edición no delega enlaces a otras aplicaciones.
function enlaceExternoPermitido() { return false; }

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
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

module.exports = { APP_ORIGIN, CSP, esLocal, enlaceExternoPermitido, archivoLocal };
