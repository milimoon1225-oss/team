const DB = 'creativa-caja-local-v1';
const STORE = 'depositos';
const SLOT = 'principal';
const ITERACIONES = 600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function abrir() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(new Error('No se puede abrir el almacenamiento de este dispositivo.'));
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  });
}

export async function leerSobre() {
  const db = await abrir();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(SLOT);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('No se pudo leer la copia de Caja.'));
    });
  } finally { db.close(); }
}

// Solo estos dos datos se consultan antes de introducir el PIN. No incluyen nombres ni montos.
export async function estadoDeposito() {
  const sobre = await leerSobre();
  return { existe: !!sobre, pendientes: sobre ? Number(sobre.pendientes) || 0 : 0 };
}

export function tomarBloqueo() {
  if (!navigator.locks || !crypto.subtle) return Promise.reject(new Error('Abre esta aplicación mediante su enlace seguro o la aplicación de escritorio para usar Caja sin conexión.'));
  let liberar;
  const espera = new Promise(resolve => { liberar = resolve; });
  return new Promise((resolve, reject) => {
    navigator.locks.request('creativa-caja-local-abierta', { ifAvailable: true }, async lock => {
      if (!lock) { reject(new Error('Caja sin conexión ya está abierta en otra pestaña o ventana. Ciérrala allí y vuelve a intentar.')); return; }
      resolve(liberar);
      await espera;
    }).catch(reject);
  });
}

function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function bytes(text) { return Uint8Array.from(atob(text), char => char.charCodeAt(0)); }
function verificarSobre(sobre) {
  if (sobre?.version !== 1 || sobre?.iteraciones !== ITERACIONES || !sobre.dispositivo || !sobre.sal || !sobre.iv || !sobre.cifrado) throw new Error('La copia local no tiene un formato reconocido. Conserva una copia de respaldo antes de solicitar ayuda.');
}
async function derivar(pin, sal) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(sal), iterations: ITERACIONES, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function cifrar(datos, llave, anterior) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(`creativa-caja-local-v1:${datos.dispositivo}`) }, llave, encoder.encode(JSON.stringify(datos)));
  return { ...anterior, version: 1, dispositivo: datos.dispositivo, iteraciones: ITERACIONES, revision: (anterior.revision || 0) + 1, iv: base64(iv), cifrado: base64(new Uint8Array(cifrado)), pendientes: datos.operaciones.filter(op => op.estado !== 'sincronizado').length };
}

// La confirmación se entrega después de completar la transacción, nunca tras request.onsuccess.
async function guardarSobre(sobre, revisionAnterior) {
  const db = await abrir();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite', { durability: 'strict' });
      const store = tx.objectStore(STORE);
      let motivo = 'No se pudo guardar en este dispositivo. No des por registrado el movimiento; revisa el espacio disponible.';
      const request = store.get(SLOT);
      request.onsuccess = () => {
        const actual = request.result;
        if ((actual?.revision ?? null) !== revisionAnterior) { motivo = 'La copia local cambió en otra ventana. Bloquea y vuelve a abrir Caja antes de continuar.'; tx.abort(); return; }
        store.put(sobre, SLOT);
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error(motivo));
      tx.onabort = () => reject(new Error(motivo));
    });
  } finally { db.close(); }
  window.dispatchEvent(new CustomEvent('creativa-caja-local-change', { detail: { existe: true, pendientes: sobre.pendientes } }));
}

export async function crearDeposito(pin, datos) {
  if (!/^\d{6,12}$/.test(pin)) throw new Error('El PIN debe tener entre 6 y 12 dígitos.');
  const sal = base64(crypto.getRandomValues(new Uint8Array(16)));
  const llave = await derivar(pin, sal);
  const sobre = await cifrar(datos, llave, { sal, revision: 0 });
  await guardarSobre(sobre, null);
  return { datos, llave, sobre };
}

export async function desbloquearDeposito(pin) {
  const sobre = await leerSobre();
  verificarSobre(sobre);
  const llave = await derivar(pin, sobre.sal);
  let plano;
  try {
    plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(sobre.iv), additionalData: encoder.encode(`creativa-caja-local-v1:${sobre.dispositivo}`) }, llave, bytes(sobre.cifrado));
  } catch { throw new Error('El PIN no coincide o la copia local está dañada. No se modificó ningún movimiento.'); }
  const datos = JSON.parse(decoder.decode(plano));
  if (datos.version !== 1 || datos.dispositivo !== sobre.dispositivo || !datos.usuario || !Array.isArray(datos.operaciones)) throw new Error('No se reconoce el contenido de la copia de Caja.');
  return { datos, llave, sobre };
}

export async function guardarDeposito(abierto, datos) {
  const sobre = await cifrar(datos, abierto.llave, abierto.sobre);
  await guardarSobre(sobre, abierto.sobre.revision);
  return { datos, llave: abierto.llave, sobre };
}
