import { browserFiles } from '../browser/files.js';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
function check(signal) { signal?.throwIfAborted(); }
function canvas(width, height) { const value = document.createElement('canvas'); value.width = width; value.height = height; return value; }
function flattened(source, width, height) {
  const result = canvas(width, height), context = result.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
  const ratio = Math.min(width / source.width, height / source.height);
  context.drawImage(source, (width - source.width * ratio) / 2, (height - source.height * ratio) / 2, source.width * ratio, source.height * ratio);
  return result;
}
async function digest(blob) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join(''); }
async function openPdf(blob, signal) {
  const loading = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false, useSystemFonts: true, useWasm: false, isImageDecoderSupported: false, maxImageSize: 24000000, stopAtErrors: true });
  const cancel = () => { void loading.destroy(); };
  signal?.addEventListener('abort', cancel, { once: true }); check(signal);
  try { const pdf = await loading.promise; return { pdf, close: async () => { signal?.removeEventListener('abort', cancel); await loading.destroy(); } }; }
  catch (error) { signal?.removeEventListener('abort', cancel); await loading.destroy(); throw error; }
}

export const assistantMedia = {
  async prepare(blob, { name = blob.name || 'Diseño', page = 1, signal } = {}) {
    check(signal);
    if (!blob.size || blob.size > 10 * 1024 * 1024) throw new Error('Usa una imagen o PDF de hasta 10 MB.');
    const hash = await digest(blob); let source, metadata, text = '';
    if (blob.type === 'application/pdf') {
      const doc = await openPdf(blob, signal);
      try {
        if (!Number.isInteger(page) || page < 1 || page > doc.pdf.numPages) throw new Error('Esa página no existe en el PDF.');
        const pdfPage = await doc.pdf.getPage(page), raw = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: Math.min(2, 1600 / Math.max(raw.width, raw.height)) });
        source = canvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const render = pdfPage.render({ canvasContext: source.getContext('2d'), viewport, background: '#ffffff' });
        const cancel = () => render.cancel(); signal?.addEventListener('abort', cancel, { once: true });
        try { await render.promise; } finally { signal?.removeEventListener('abort', cancel); }
        text = (await pdfPage.getTextContent()).items.map(item => item.str || '').join(' ').slice(0, 6000);
        metadata = { kind: 'pdf', page, pages: doc.pdf.numPages, pageWidthMm: raw.width * 25.4 / 72, pageHeightMm: raw.height * 25.4 / 72 };
      } finally { await doc.close(); }
    } else {
      if (!['image/png','image/jpeg','image/webp'].includes(blob.type)) throw new Error('Exporta desde Corel a PNG, JPEG, WebP o PDF.');
      const bitmap = await createImageBitmap(blob);
      try {
        if (bitmap.width * bitmap.height > 24000000) throw new Error('La imagen supera 24 megapíxeles.');
        metadata = { kind: 'image', originalWidth: bitmap.width, originalHeight: bitmap.height, page: 1, pages: 1 };
        const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        source = flattened(bitmap, Math.max(1, Math.round(bitmap.width * ratio)), Math.max(1, Math.round(bitmap.height * ratio)));
      } finally { bitmap.close(); }
    }
    check(signal);
    const previewUrl = source.toDataURL('image/jpeg', 0.86), image = previewUrl.split(',')[1];
    if (image.length > 1800000) throw new Error('La copia de análisis es demasiado grande. Usa una página más sencilla.');
    source.width = source.height = 1;
    return { ...metadata, hash, name, text, image, previewUrl };
  },
  async compare(first, second, signal) {
    const bitmaps = [];
    try {
      for (const asset of [first, second]) { check(signal); bitmaps.push(await createImageBitmap(await browserFiles.toBlob(asset.previewUrl))); }
      const images = bitmaps.map(bitmap => flattened(bitmap, 480, 480));
      const a = images[0].getContext('2d').getImageData(0,0,480,480), b = images[1].getContext('2d').getImageData(0,0,480,480);
      const diff = canvas(480, 480), pixels = diff.getContext('2d').createImageData(480,480); let changed = 0;
      for (let i = 0; i < a.data.length; i += 4) {
        const delta = Math.max(...[0,1,2].map(k => Math.abs(a.data[i+k]-b.data[i+k])));
        if (delta > 24) { changed++; pixels.data.set([219,54,106,255],i); } else pixels.data.set([b.data[i],b.data[i+1],b.data[i+2],75],i);
      }
      check(signal); diff.getContext('2d').putImageData(pixels,0,0);
      return { changedPercent: changed / (480*480) * 100, sameFile: first.hash === second.hash && first.page === second.page,
        image: diff.toDataURL('image/png'), method: 'Mapa orientativo a 480 × 480 px con proporciones conservadas y umbral RGB 24. No mide una diferencia de color de impresión.' };
    } finally { bitmaps.forEach(bitmap => bitmap.close()); }
  },
  async manual(file, { signal } = {}) {
    check(signal);
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Usa un manual TXT, Markdown o PDF de hasta 10 MB.');
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      const doc = await openPdf(file, signal);
      try {
        if (doc.pdf.numPages > 40) throw new Error('Importa una sección de hasta 40 páginas del manual.');
        const pages = []; let length = 0;
        for (let number = 1; number <= doc.pdf.numPages; number++) {
          check(signal); const page = await doc.pdf.getPage(number), data = await page.getTextContent();
          const text = data.items.map(item => item.str || '').join(' ').trim(); length += text.length;
          if (length > 200000) throw new Error('El manual supera 200 000 caracteres. Importa una sección más corta.');
          if (text) pages.push({ number, text }); page.cleanup();
        }
        if (!pages.length) throw new Error('El PDF no contiene texto extraíble. Usa una versión con OCR o copia el texto a TXT.');
        return { title: file.name.slice(0,200), pages };
      } finally { await doc.close(); }
    }
    if (!/\.(txt|md)$/i.test(file.name)) throw new Error('Usa un archivo TXT, Markdown o PDF.');
    const content = (await file.text()).trim(); check(signal);
    if (!content || content.length > 200000) throw new Error('El texto está vacío o supera 200 000 caracteres.');
    return { title: file.name.slice(0,200), pages: [{ number: 1, text: content }] };
  },
};
