// Contrato del límite IPC: la ventana recibe exclusivamente imágenes y geometría.
function validarPresentacion(value) {
  const check = (ok) => { if (!ok) throw new Error('Presentación no válida.'); };
  function keys(v, list) { check(v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => list.includes(k))); }
  keys(value, ['schema', 'variants']);
  check(value.schema === 1 && Array.isArray(value.variants) && value.variants.length >= 1 && value.variants.length <= 2);
  let total = 0;
  for (const v of value.variants) {
    keys(v, ['schema', 'model', 'widthMm', 'heightMm', 'thicknessMm', 'panels', 'versionLabel', 'demo', 'appearance']);
    check(v.schema === 1 && ['card', 'bifold', 'invitation', 'trifold', 'gatefold'].includes(v.model));
    check(Number.isFinite(v.widthMm) && v.widthMm >= 20 && v.widthMm <= 300 && Number.isFinite(v.heightMm) && v.heightMm >= 20 && v.heightMm <= 400);
    check(Number.isFinite(v.thicknessMm) && v.thicknessMm >= 0.15 && v.thicknessMm <= 1 && typeof v.demo === 'boolean' && typeof v.versionLabel === 'string' && v.versionLabel.length <= 60);
    if(v.appearance !== undefined) {
      const a=v.appearance;
      keys(a,['paper','finish','foil','relief','reliefStrength','lighting','lightAngle','lightIntensity']);
      check(Object.keys(a).length===8 && ['smooth','textured'].includes(a.paper) && ['matte','satin','gloss'].includes(a.finish) && ['gold','silver'].includes(a.foil)
        && ['raised','debossed'].includes(a.relief) && ['neutral','side','studio'].includes(a.lighting)
        && Number.isFinite(a.reliefStrength) && a.reliefStrength>=0 && a.reliefStrength<=1
        && Number.isFinite(a.lightAngle) && a.lightAngle>=-180 && a.lightAngle<=180
        && Number.isFinite(a.lightIntensity) && a.lightIntensity>=0.4 && a.lightIntensity<=2);
    }
    const slots = ['card','invitation'].includes(v.model) ? ['front', 'back'] : v.model==='bifold' ? ['cover', 'backCover', 'insideLeft', 'insideRight'] : ['outsideLeft','outsideCenter','outsideRight','insideLeft','insideCenter','insideRight'];
    keys(v.panels, slots); check(Object.keys(v.panels).length === slots.length);
    for (const p of Object.values(v.panels)) {
      keys(p, ['url', 'fit', 'rotation', 'masks']);
      const images=[p.url];
      if(p.masks!==undefined) { keys(p.masks,['foil','relief','varnish']);images.push(...Object.values(p.masks)); }
      for(const url of images) { check(typeof url === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(url) && url.length <= 14 * 1024 * 1024);total+=url.length; }
      check(['contain', 'cover'].includes(p.fit) && [0, 90, 180, 270].includes(p.rotation));
    }
  }
  check(total <= 64 * 1024 * 1024);
  return value;
}
module.exports = { validarPresentacion };
