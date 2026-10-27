import { validateState } from '../../domain/operations.js';
const DATABASE = 'creativa-operaciones-v2';
const ITERATIONS = 600000;
const encoder = new TextEncoder();
const b64 = data => { let s = ''; for (const b of new Uint8Array(data)) s += String.fromCharCode(b); return btoa(s); };
const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DATABASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('vault');
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(new Error('No se pudo abrir la base local.'));
  });
}
export async function readEnvelope() {
  const database = await db();
  try { return await new Promise((resolve,reject) => { const r = database.transaction('vault').objectStore('vault').get('main'); r.onsuccess = () => resolve(r.result || null); r.onerror = () => reject(r.error); }); }
  finally { database.close(); }
}
async function put(envelope, expected) {
  const database = await db();
  try {
    await new Promise((resolve,reject) => {
      const tx = database.transaction('vault', 'readwrite', { durability: 'strict' }), store = tx.objectStore('vault');
      const get = store.get('main');
      get.onsuccess = () => {
        if ((get.result?.revision ?? null) !== expected) { tx.abort(); return; }
        store.put(envelope, 'main');
      };
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(new Error('No se guardó: la copia cambió en otra ventana o no hay espacio. Vuelve a abrirla.'));
    });
  } finally { database.close(); }
}
function checkEnvelope(e) {
  if (e?.format !== 'creativa-operaciones-v2' || e.iterations !== ITERATIONS || typeof e.cipher !== 'string' || e.cipher.length > 150000000 || !Number.isSafeInteger(e.revision) || e.revision < 1 || bytes(e.salt).length !== 16 || bytes(e.iv).length !== 12) throw new Error('El respaldo no tiene un formato válido.');
}
async function keyFor(pin, salt) {
  if (!/^\d{6,12}$/.test(pin)) throw new Error('El PIN debe tener entre 6 y 12 dígitos.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(salt),iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function decrypt(envelope, pin) {
  checkEnvelope(envelope);
  const key = await keyFor(pin, envelope.salt);
  let state;
  try { const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv),additionalData:encoder.encode(envelope.format)},key,bytes(envelope.cipher)); state = JSON.parse(new TextDecoder().decode(plain)); }
  catch { throw new Error('PIN incorrecto o respaldo dañado. No se cambió ningún dato.'); }
  validateState(state);
  return { key, state, envelope };
}
export async function save(opened, state) {
  validateState(state);
  const plain=encoder.encode(JSON.stringify(state));
  if(plain.byteLength>75*1024*1024) throw new Error('La copia local alcanzó 75 MB. Conserva un respaldo y archiva archivos antiguos antes de agregar más diseños.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const envelope = {format:'creativa-operaciones-v2',iterations:ITERATIONS,salt:opened.envelope.salt,revision:(opened.envelope.revision || 0)+1,iv:b64(iv)};
  envelope.cipher = b64(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(envelope.format)},opened.key,plain));
  await put(envelope, opened.envelope.revision || null);
  return {key:opened.key,state,envelope};
}
export async function create(pin, state) {
  const salt=b64(crypto.getRandomValues(new Uint8Array(16)));
  return save({key:await keyFor(pin,salt),envelope:{salt,revision:0}},state);
}
export async function restore(envelope, pin) {
  const opened=await decrypt(envelope,pin);
  if (await readEnvelope()) throw new Error('Ya existe una copia local. Restaura en un perfil nuevo para conservar los movimientos de ambos equipos.');
  // Nueva revisión local; se conservan UUID de operaciones para evitar cobros duplicados.
  opened.envelope.revision=0;
  return save(opened,opened.state);
}
export function exclusive() {
  if (!navigator.locks) return Promise.reject(new Error('Este dispositivo no ofrece bloqueo seguro del almacenamiento.'));
  return new Promise((resolve,reject) => navigator.locks.request('creativa-operaciones-v2',{ifAvailable:true},async lock => {
    if (!lock) { reject(new Error('La gestión local ya está abierta en otra ventana. Bloquéala allí antes de continuar.')); return; }
    await new Promise(release=>resolve(release));
  }).catch(reject));
}
