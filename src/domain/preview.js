export const PREVIEW_MODELS = Object.freeze({
  card: { label: 'Tarjeta de presentación', widthMm: 90, heightMm: 50, thicknessMm: 0.35, slots: ['front', 'back'] },
  bifold: { label: 'Invitación díptica', widthMm: 105, heightMm: 148, thicknessMm: 0.25, slots: ['cover', 'backCover', 'insideLeft', 'insideRight'] },
  invitation: { label: 'Invitación plana', widthMm: 127, heightMm: 178, thicknessMm: 0.35, slots: ['front', 'back'], localOnly: true },
  trifold: { label: 'Invitación tríptica envolvente', widthMm: 105, heightMm: 148, thicknessMm: 0.25, slots: ['outsideLeft', 'outsideCenter', 'outsideRight', 'insideLeft', 'insideCenter', 'insideRight'], localOnly: true },
  gatefold: { label: 'Invitación doble puerta', widthMm: 140, heightMm: 180, thicknessMm: 0.25, slots: ['outsideLeft', 'outsideCenter', 'outsideRight', 'insideLeft', 'insideCenter', 'insideRight'], localOnly: true },
});
export const PANEL_LABELS = { front: 'Frente', back: 'Reverso', cover: 'Portada', backCover: 'Contraportada', outsideLeft: 'Exterior izquierdo', outsideCenter: 'Exterior central', outsideRight: 'Exterior derecho', insideLeft: 'Interior izquierdo', insideCenter: 'Interior central', insideRight: 'Interior derecho' };
export const EFFECTS = Object.freeze({ foil: 'Foil', relief: 'Relieve', varnish: 'Barniz sectorizado' });
export const DEFAULT_APPEARANCE = Object.freeze({ paper: 'smooth', finish: 'matte', foil: 'gold', relief: 'raised', reliefStrength: 0.35, lighting: 'neutral', lightAngle: 35, lightIntensity: 1 });
export function appearanceOf(config) { return { ...DEFAULT_APPEARANCE, ...config.appearance }; }
const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const assert = (ok, text) => { if (!ok) throw new Error(text); };
const finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
export function newPreview(model = 'bifold') {
  assert(Object.hasOwn(PREVIEW_MODELS,model), 'Modelo 3D no disponible.');
  const template = PREVIEW_MODELS[model];
  assert(template, 'Modelo 3D no disponible.');
  return { schema: 1, model, widthMm: template.widthMm, heightMm: template.heightMm, thicknessMm: template.thicknessMm, sourceDesignId: null, appearance: { ...DEFAULT_APPEARANCE }, panels: {} };
}
export function validateAppearance(value) {
  exactKeys(value, Object.keys(DEFAULT_APPEARANCE));
  assert(Object.keys(value).length === Object.keys(DEFAULT_APPEARANCE).length && ['smooth','textured'].includes(value.paper) && ['matte','satin','gloss'].includes(value.finish)
    && ['gold','silver'].includes(value.foil) && ['raised','debossed'].includes(value.relief) && ['neutral','side','studio'].includes(value.lighting)
    && finite(value.reliefStrength,0,1) && finite(value.lightAngle,-180,180) && finite(value.lightIntensity,0.4,2), 'Material o iluminación no válidos.');
  return value;
}
export function previewAssets(config) {
  return Object.values(config.panels).flatMap(panel => [panel, ...Object.values(panel.masks || {})]);
}
function validateAsset(asset, remote) {
  assert(asset && uuid(asset.fileId) && /^[a-f0-9]{64}$/.test(asset.hash) && typeof asset.name === 'string' && asset.name.length > 0 && asset.name.length <= 255, 'Imagen de panel no válida.');
  if (remote) assert(typeof asset.path === 'string' && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[a-f0-9]{64}\.(jpg|png|webp)$/.test(asset.path), 'Falta la imagen confirmada del panel.');
}
export function validateGeometry(config) {
  assert(config?.schema === 1 && Object.hasOwn(PREVIEW_MODELS,config.model), 'Modelo 3D no válido.');
  assert(finite(config.widthMm, 20, 300) && finite(config.heightMm, 20, 400), 'Usa medidas entre 20 y 300 mm de ancho y entre 20 y 400 mm de alto.');
  assert(finite(config.thicknessMm, 0.15, 1), 'El espesor debe estar entre 0,15 y 1 mm.');
  return config;
}
export function validatePreview(config, { remote = false } = {}) {
  validateGeometry(config);
  assert(!remote || !PREVIEW_MODELS[config.model].localOnly, 'Este formato está disponible en espacios locales.');
  if (config.appearance !== undefined) validateAppearance(config.appearance);
  assert(config.sourceDesignId == null || uuid(config.sourceDesignId), 'Archivo de impresión vinculado no válido.');
  const slots = PREVIEW_MODELS[config.model].slots;
  assert(config.panels && Object.keys(config.panels).length === slots.length && slots.every(slot => Object.hasOwn(config.panels, slot)), 'Carga todas las caras de este modelo.');
  for (const panel of Object.values(config.panels)) {
    validateAsset(panel, remote);
    assert(['contain', 'cover'].includes(panel.fit) && [0, 90, 180, 270].includes(panel.rotation) && typeof panel.demo === 'boolean', 'Ajuste del panel no válido.');
    if (panel.masks !== undefined) { exactKeys(panel.masks, Object.keys(EFFECTS)); for (const mask of Object.values(panel.masks)) validateAsset(mask, remote); }
  }
  return config;
}
export const isFolded = model => ['bifold', 'trifold', 'gatefold'].includes(model);

// Geometría en milímetros; cada grupo gira alrededor de su pliegue.
// El tríptico abre primero la portada y después la solapa interior.
export function previewLeaves(config, opening = 0) {
  validateGeometry(config);
  assert(Number.isFinite(opening), 'Apertura no válida.');
  const w=config.widthMm, t=config.thicknessMm, a=Math.max(0,Math.min(180,opening));
  const leaf=(id,front,back,width,anchorX,centerX,rotationY=0,offsetZ=0)=>({id,front,back,width,anchorX,centerX,rotationY,offsetZ});
  if(!isFolded(config.model)) return [leaf('sheet','front','back',w,0,w/2)];
  if(config.model==='bifold') return [leaf('base','insideRight','backCover',w,0,w/2),leaf('left','cover','insideLeft',w,0,w/2,-a,t+.08)];
  const right=config.model==='gatefold'?w/2:w-2, left=config.model==='gatefold'?w/2:w;
  return [leaf('base','insideCenter','outsideCenter',w,0,w/2),
    leaf('right','outsideRight','insideRight',right,w,-right/2,config.model==='trifold'?Math.max(0,(a-90)*2):a,t+.08),
    leaf('left','outsideLeft','insideLeft',left,0,left/2,config.model==='trifold'?-Math.min(180,a*2):-a,config.model==='gatefold'?t+.08:t*2+.16)];
}
export function panelSize(config, slot) {
  const leaf=previewLeaves(config).find(item=>item.front===slot||item.back===slot);
  assert(leaf, 'Cara no disponible para este formato.');
  return {widthMm:leaf.width,heightMm:config.heightMm};
}

// Con apertura 0 la portada ocupa el frente; a 180 se ven los interiores.
export function previewPose(config, opening = 0) {
  const leaves=previewLeaves(config,opening),angle=isFolded(config.model)?Math.max(0,Math.min(180,opening)):0;
  const edges=leaves.flatMap(leaf=>[leaf.centerX-leaf.width/2,leaf.centerX+leaf.width/2].map(x=>leaf.anchorX+x*Math.cos(leaf.rotationY*Math.PI/180)));
  const minX=Math.min(...edges),maxX=Math.max(...edges);
  return {opening:angle,hingeRotation:-angle,centerX:(minX+maxX)/2,minX,maxX,widthMm:maxX-minX,
    front:config.model==='bifold'?'cover':isFolded(config.model)?'outsideLeft':'front',back:config.model==='bifold'?'insideLeft':isFolded(config.model)?'insideCenter':'back'};
}
function exactKeys(value, allowed) {
  assert(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => allowed.includes(k)), 'La presentación contiene datos no permitidos.');
}
export function validateCustomerProjection(value) {
  exactKeys(value, ['schema', 'variants']);
  assert(value.schema === 1 && Array.isArray(value.variants) && value.variants.length >= 1 && value.variants.length <= 2, 'Presentación de cliente no válida.');
  let total = 0;
  for (const variant of value.variants) {
    exactKeys(variant, ['schema', 'model', 'widthMm', 'heightMm', 'thicknessMm', 'panels', 'versionLabel', 'demo', 'appearance']);
    validateGeometry(variant);
    if (variant.appearance !== undefined) validateAppearance(variant.appearance);
    assert(typeof variant.versionLabel === 'string' && variant.versionLabel.length <= 60 && typeof variant.demo === 'boolean', 'Versión de presentación no válida.');
    const slots = PREVIEW_MODELS[variant.model].slots;
    exactKeys(variant.panels, slots);
    assert(Object.keys(variant.panels).length === slots.length, 'Presentación sin todas sus caras.');
    for (const panel of Object.values(variant.panels)) {
      exactKeys(panel, ['url', 'fit', 'rotation', 'masks']);
      const images = [panel.url];
      if (panel.masks !== undefined) { exactKeys(panel.masks, Object.keys(EFFECTS)); images.push(...Object.values(panel.masks)); }
      for (const url of images) {
        assert(typeof url === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(url) && url.length <= 14 * 1024 * 1024, 'Imagen de presentación no válida.');
        total += url.length;
      }
      assert(['contain', 'cover'].includes(panel.fit) && [0, 90, 180, 270].includes(panel.rotation), 'Orientación de presentación no válida.');
    }
  }
  assert(total <= 64 * 1024 * 1024, 'La presentación supera 64 MB. Muestra una sola versión o usa imágenes más pequeñas.');
  return value;
}
export function customerProjection(variants) {
  const value = { schema: 1, variants: variants.map((v, i) => ({ schema: 1, model: v.model, widthMm: v.widthMm, heightMm: v.heightMm, thicknessMm: v.thicknessMm,
    versionLabel: v.versionLabel || `Versión ${i + 1}`, demo: Object.values(v.panels).some(p => p.demo), appearance: appearanceOf(v),
    panels: Object.fromEntries(PREVIEW_MODELS[v.model].slots.map(slot => [slot, { url: v.panels[slot].url, fit: v.panels[slot].fit, rotation: v.panels[slot].rotation,
      masks: Object.fromEntries(Object.entries(v.panels[slot].masks || {}).map(([key,asset]) => [key, typeof asset === 'string' ? asset : asset.url])) }])) })) };
  return validateCustomerProjection(value);
}
