const assert = (ok, message) => { if (!ok) throw new Error(message); };
export const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function text(value, max = 10000) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `Escribe un texto de hasta ${max} caracteres.`);
  return value.trim();
}
export function number(value, min, max, integer = false) {
  assert(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isSafeInteger(value)), 'Revisa las cantidades, medidas o tiempos indicados.');
  return value;
}
export function checkedBrief(proposal, source) {
  assert(proposal && typeof proposal === 'object' && ['client', 'product', 'description', 'delivery'].every(k => typeof proposal[k] === 'string' && proposal[k].length <= (k === 'description' ? 3000 : 150)), 'El modelo no preparó un encargo válido.');
  number(proposal.qty, 0, 2147483647, true);
  if (proposal.client) assert(normalize(source).includes(normalize(proposal.client)), 'El nombre propuesto no aparece en el mensaje. Revisa el encargo manualmente.');
  const missing = [];
  for (const [key, label] of [['client', 'Nombre del cliente'], ['product', 'Tipo de trabajo'], ['qty', 'Cantidad'], ['delivery', 'Fecha y hora de entrega']]) if (!proposal[key]) missing.push(label);
  missing.push('Precio confirmado', 'Texto final y medidas confirmados');
  return { client: proposal.client, product: proposal.product, qty: proposal.qty || '', delivery: proposal.delivery, description: proposal.description, missing };
}

export function technicalReview(asset, { widthMm, heightMm, bleedMm = 3 }) {
  number(widthMm, 1, 3000); number(heightMm, 1, 3000); number(bleedMm, 0, 20);
  const checks = [];
  if (asset.kind === 'pdf') {
    const width = asset.pageWidthMm, height = asset.pageHeightMm;
    const expectedWidth = widthMm + 2 * bleedMm, expectedHeight = heightMm + 2 * bleedMm;
    const dimensionsMatch = Math.abs(width - expectedWidth) <= 0.6 && Math.abs(height - expectedHeight) <= 0.6;
    checks.push({ label: 'Medidas de la página PDF', value: `${width.toFixed(1)} × ${height.toFixed(1)} mm. Esperado con sangrado: ${expectedWidth} × ${expectedHeight} mm.`, level: dimensionsMatch ? 'ok' : 'review' });
    checks.push({ label: 'Sangrado', value: 'La coincidencia de medidas no demuestra que el arte llegue al borde. Compruébalo en Corel.', level: 'review' });
  } else {
    const dpi = Math.min(asset.originalWidth / ((widthMm + 2 * bleedMm) / 25.4), asset.originalHeight / ((heightMm + 2 * bleedMm) / 25.4));
    checks.push({ label: 'Resolución efectiva de la imagen', value: `${Math.round(dpi)} ppp para ${widthMm} × ${heightMm} mm más ${bleedMm} mm de sangrado. Referencia de trabajo: 300 ppp.`, level: dpi >= 300 ? 'ok' : 'review' });
    const requestedRatio = (widthMm + 2 * bleedMm) / (heightMm + 2 * bleedMm);
    const difference = Math.abs(asset.originalWidth / asset.originalHeight / requestedRatio - 1);
    checks.push({ label: 'Proporción de la imagen', value: difference < 0.02 ? 'Coincide aproximadamente con las medidas indicadas.' : 'La proporción difiere; revisa recorte, orientación o medidas.', level: difference < 0.02 ? 'ok' : 'review' });
  }
  checks.push({ label: 'Color, fuentes y acabado', value: 'Esta revisión no certifica perfiles CMYK/ICC, fuentes incrustadas, sobreimpresión, troquel ni reproducción del material.', level: 'review' });
  return checks;
}

export function compareReferenceText(reference, observed, source) {
  const dates = value => [...new Set((value.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g) || []).map(date => {
    const parts=date.split(/[/.-]/).map(Number);return parts[0]>31?`${parts[0]}-${String(parts[1]).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`:`${parts[2]}-${String(parts[1]).padStart(2,'0')}-${String(parts[0]).padStart(2,'0')}`;
  }))];
  const expected=dates(reference), found=dates(observed), missing=expected.filter(date=>!found.includes(date));
  return { reference, observed, source, expectedDates:expected, observedDates:found, missingDates:missing,
    status:!expected.length?'not-checked':missing.length?'review':'matches',
    message:!expected.length?'La referencia no contiene fechas numéricas para una comparación automática.':missing.length?`No aparecen estas fechas de referencia en el texto leído: ${missing.join(', ')}. Contrasta el archivo original.`:'Las fechas numéricas de referencia aparecen en el texto leído. Comprueba también nombres y otros datos; esto no equivale a una aprobación.' };
}

export function quoteSheet(input) {
  const qty = number(input.qty, 1, 1000000, true), width = number(input.widthMm, 1, 3000), height = number(input.heightMm, 1, 3000);
  const sw = number(input.sheetWidthMm, 10, 3000), sh = number(input.sheetHeightMm, 10, 3000);
  const margin = number(input.marginMm, 0, 100), gap = number(input.gapMm, 0, 50), bleed = number(input.bleedMm, 0, 20);
  const waste = number(input.wastePercent, 0, 100), profit = number(input.marginPercent, 0, 90), discount = number(input.discountPercent, 0, 80);
  const costs = ['setupCents', 'designCents', 'sheetCents', 'printCents', 'finishCents'];
  for (const key of costs) number(input[key], 0, 999999999, true);
  const fit = (w, h) => Math.max(0, Math.floor((sw - margin * 2 + gap) / (w + gap))) * Math.max(0, Math.floor((sh - margin * 2 + gap) / (h + gap)));
  const w = width + 2 * bleed, h = height + 2 * bleed;
  const straight = fit(w, h), rotated = fit(h, w), yieldPerSheet = Math.max(straight, rotated);
  assert(yieldPerSheet > 0, 'El trabajo no cabe en el pliego con estas medidas y márgenes.');
  const sheets = Math.ceil(Math.ceil(qty / yieldPerSheet) * (1 + waste / 100));
  const paper = sheets * input.sheetCents, printing = sheets * input.printCents, finishing = qty * input.finishCents;
  const cost = paper + printing + finishing + input.setupCents + input.designCents;
  assert(Number.isSafeInteger(cost) && cost <= 9999999999, 'El costo calculado excede el rango permitido.');
  const priceBeforeDiscount = Math.ceil(cost / (1 - profit / 100)), price = Math.ceil(priceBeforeDiscount * (1 - discount / 100));
  assert(Number.isSafeInteger(price) && price <= 9999999999, 'El precio calculado excede el rango permitido.');
  return { qty, yieldPerSheet, rotated: rotated > straight, sheets, paper, printing, finishing, setup: input.setupCents, design: input.designCents,
    cost, priceBeforeDiscount, price, gain: price - cost, unitPrice: price / qty, belowCost: price < cost,
    actualMargin: price ? (price - cost) / price * 100 : 0,
    assumptions: 'Distribución en cuadrícula con una orientación; todos los costos incluyen el alcance que indiques. No incluye impuestos ni procesos que no hayas cargado.' };
}

export function scheduleStation(orders, input) {
  const capacity = number(input.dailyMinutes, 1, 1440, true);
  assert(typeof input.startAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-05:00$/.test(input.startAt) && Number.isFinite(Date.parse(input.startAt)), 'Indica fecha y hora de inicio válidas para Lima.');
  const startMinute = Number(input.startAt.slice(11, 13)) * 60 + Number(input.startAt.slice(14, 16));
  assert(startMinute < 1440 && Number(input.startAt.slice(14, 16)) < 60 && startMinute + capacity <= 1440, 'La jornada debe terminar dentro del mismo día.');
  let day = 0, used = 0;
  return orders.toSorted((a, b) => a.delivery.localeCompare(b.delivery)).map(order => {
    const estimate = input.estimates?.[order.id];
    if (order.blockers.length) return { ...order, status: 'blocked', minutes: null, endAt: null };
    if (!estimate) return { ...order, status: 'missing', minutes: null, endAt: null };
    const minutes = Math.ceil(number(estimate.setupMinutes, 0, 100000) + order.qty * number(estimate.unitSeconds, 0, 86400) / 60 + number(estimate.finishMinutes, 0, 100000));
    assert(minutes > 0 && minutes <= 525600, 'Indica tiempos positivos y dentro de un año para cada trabajo.');
    if (used === capacity) { day++; used = 0; }
    const beginAt = new Date(Date.parse(input.startAt) + day * 86400000 + used * 60000).toISOString();
    let remaining = minutes;
    while (remaining > capacity - used) { remaining -= capacity - used; day++; used = 0; assert(day < 3660, 'El escenario supera diez años. Revisa la capacidad y los tiempos.'); }
    used += remaining;
    const endAt = new Date(Date.parse(input.startAt) + day * 86400000 + used * 60000).toISOString();
    const due = /(?:Z|[+-]\d{2}:\d{2})$/.test(order.delivery) ? order.delivery : `${order.delivery}${order.delivery.length === 16 ? ':00' : ''}-05:00`;
    assert(Number.isFinite(Date.parse(due)), 'Fecha de entrega no válida.');
    return { ...order, status: 'planned', minutes, beginAt, endAt, late: Date.parse(endAt) > Date.parse(due) };
  });
}

export function retrievePassages(manuals, question) {
  const terms = normalize(text(question, 1000)).match(/[a-z0-9]{3,}/g)?.filter(w => !['como','para','que','del','las','los','una','con','por','sobre','este','esta','cual','puedo','debo'].includes(w)) || [];
  return manuals.flatMap(manual => manual.pages.flatMap(page => {
    const chunks = [];
    for (let start = 0; start < page.text.length; start += 700) {
      const content = page.text.slice(start, start + 900), plain = normalize(content);
      const matched = terms.filter(term => plain.includes(term));
      if (matched.length) chunks.push({ id: `${manual.id}:${page.number}:${start}`, title: manual.title, page: page.number, text: content, score: matched.length });
    }
    return chunks;
  })).sort((a,b) => b.score - a.score).slice(0, 4);
}

export function checkedCitations(result, passages) {
  text(result.answer, 5000); assert(Array.isArray(result.citations) && result.citations.length <= 6, 'Citas no válidas.');
  return result.citations.map(citation => {
    const passage = passages.find(p => p.id === citation.id);
    assert(passage && typeof citation.quote === 'string' && citation.quote.trim().length >= 8 && citation.quote.length <= 240 && passage.text.includes(citation.quote), 'La respuesta contiene una cita que no coincide con el documento. Reformula la pregunta.');
    return { id: passage.id, title: passage.title, page: passage.page, quote: citation.quote };
  });
}

export function validateAssistantData(data) {
  if (data === undefined) return;
  assert(data?.version === 1 && typeof data.ownerId === 'string' && Number.isSafeInteger(data.revision) && data.revision >= 0 && Array.isArray(data.manuals) && data.manuals.length <= 20 && Array.isArray(data.visualIndex) && data.visualIndex.length <= 1000, 'Biblioteca del asistente no válida.');
  assert(data.ownerRole===undefined||['administracion','disenador'].includes(data.ownerRole),'Rol de biblioteca no válido.');
  let length = 0;
  for (const manual of data.manuals) {
    text(manual.id, 100); text(manual.title, 200); assert(Array.isArray(manual.pages) && manual.pages.length <= 40, 'Manual demasiado extenso.');
    for (const page of manual.pages) { number(page.number, 1, 100000, true); text(page.text, 200000); length += page.text.length; }
  }
  for (const entry of data.visualIndex) { for (const key of ['orderId','designId','hash','description']) text(entry[key], key === 'description' ? 1200 : 100); assert(Array.isArray(entry.tags) && entry.tags.length <= 10 && entry.tags.every(tag => typeof tag === 'string' && tag.length <= 80), 'Etiquetas no válidas.'); }
  assert(length <= 2000000, 'La biblioteca supera dos millones de caracteres.');
}
