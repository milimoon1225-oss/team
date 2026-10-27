const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
function dataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(blob);
  });
}
export const browserFiles = {
  async inspect(blob, expected) {
    if (!TYPES.includes(blob.type) || !blob.size || blob.size > 10 * 1024 * 1024) throw new Error('Adjunta una imagen o PDF de hasta 10 MB.');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), n => n.toString(16).padStart(2, '0')).join('');
    if (expected && hash !== expected) throw new Error('El archivo no coincide con la versión guardada.');
    return { hash, url: await dataURL(blob) };
  },
  async prepareDesign(file) { return { ...await this.inspect(file), name: file.name }; },
  async toBlob(url) {
    const match = typeof url === 'string' && url.match(/^data:(image\/(?:jpeg|png|webp|heic|heif)|application\/pdf);base64,([A-Za-z0-9+/]+=*)$/);
    if (!match || url.length > 15 * 1024 * 1024) throw new Error('Referencia local no válida.');
    // Decodificar en memoria evita peticiones y funciona con la CSP estricta de Electron.
    let decoded;
    try { decoded = atob(match[2]); } catch { throw new Error('La imagen local está dañada.'); }
    if (decoded.length > 10 * 1024 * 1024) throw new Error('Archivo local demasiado grande.');
    return new Blob([Uint8Array.from(decoded, c => c.charCodeAt(0))], { type: match[1] });
  },
  async readBackup(file) {
    if (file.size > 110 * 1024 * 1024) throw new Error('El respaldo supera el límite de 110 MB.');
    try { return JSON.parse(await file.text()); }
    catch { throw new Error('El archivo no contiene un respaldo válido.'); }
  },
};
