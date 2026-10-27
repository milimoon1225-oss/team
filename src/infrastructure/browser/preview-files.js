import { newPreview, panelSize, PREVIEW_MODELS } from '../../domain/preview.js';
import { browserFiles } from './files.js';
import { sampleDesign } from '../../domain/samples.js';
import { paintSample } from './sample-art.js';

async function encode(canvas, name) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.92));
  if (!blob || blob.size > 2.8 * 1024 * 1024) throw new Error('La imagen preparada es demasiado grande. Reduce su tamaño.');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), n => n.toString(16).padStart(2, '0')).join('');
  const url = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('No se pudo leer la imagen.')); r.readAsDataURL(blob); });
  return { url, hash, name, width: canvas.width, height: canvas.height };
}
export const previewFiles = {
  async preparePreview(file) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024) throw new Error('Exporta cada cara desde Corel en PNG, JPEG o WebP, hasta 10 MB.');
    let bitmap;
    try { bitmap = await createImageBitmap(file); } catch { throw new Error('No se pudo interpretar esa imagen. Exporta otra vez desde Corel.'); }
    try {
      if (bitmap.width < 32 || bitmap.height < 32 || bitmap.width * bitmap.height > 24000000) throw new Error('Usa una imagen de al menos 32 píxeles por lado y hasta 24 megapíxeles.');
      // El original se conserva byte por byte. Las texturas GPU son copias transitorias.
      return { ...await browserFiles.inspect(file), name: file.name.slice(0, 255), width: bitmap.width, height: bitmap.height };
    } finally { bitmap.close(); }
  },
  async dimensions(url) {
    const bitmap = await createImageBitmap(await browserFiles.toBlob(url));
    try { return { width: bitmap.width, height: bitmap.height }; } finally { bitmap.close(); }
  },
  async demoPreview(model, sampleId, revision=2) {
    const template = PREVIEW_MODELS[model]; if (!template) throw new Error('Modelo no disponible.');
    const sample = sampleDesign(model,sampleId);
    const result = {};
    for (const slot of template.slots) {
      const size=panelSize(newPreview(model),slot);
      const canvas = document.createElement('canvas'); canvas.height=model==='card'?600:1269;canvas.width=Math.round(canvas.height*size.widthMm/size.heightMm);
      const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
      paintSample(ctx,sample,slot,w,h,revision);
      result[slot] = await encode(canvas, `muestra-${sample.id}-${slot}-v${revision}.webp`);
      canvas.width=canvas.height=1;
    }
    return result;
  },
};
