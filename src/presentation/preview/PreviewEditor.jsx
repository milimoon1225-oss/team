import { useEffect, useState } from 'react';
import { PREVIEW_MODELS, PANEL_LABELS, newPreview, appearanceOf, EFFECTS, isFolded, panelSize, previewPose } from '../../domain/preview.js';
import { SAMPLE_DESIGNS } from '../../domain/samples.js';
import { materialize } from '../../domain/operations.js';
import PreviewViewer from './PreviewViewer.jsx';
import AppearanceSettings from './AppearanceSettings.jsx';

export default function PreviewEditor({ order, service, session, busy, readOnly = false, run, onPresent }) {
  const [draft, setDraft] = useState(() => ({ ...newPreview(), sourceDesignId: order.designs.at(-1)?.id || null }));
  const [sampleId,setSampleId]=useState('');
  const [selected, setSelected] = useState(''), [dirty, setDirty] = useState(false), [comparison, setComparison] = useState(null), [compareId, setCompareId] = useState('');
  const versions = order.previews || [];
  let localSpace=false;
  try { localSpace=session.read().mode==='standalone'; } catch { /* La sesión puede estar bloqueándose. */ }
  function sampleOf(value){return SAMPLE_DESIGNS.find(s=>s.model===value.model&&Object.values(value.panels).some(p=>p.name.startsWith(`muestra-${s.id}-`)))?.id||'';}
  useEffect(() => {
    let active = true;
    if (versions.length) void run(async () => { const value = await service.load(session, order.id, versions.at(-1).id); if (active) { setDraft(value); setSampleId(sampleOf(value)); setSelected(value.id); } });
    return () => { active = false; };
    // La selección posterior se cambia explícitamente, no al llegar una respuesta de red.
  }, []);
  function change(patch) { setDraft(d => ({ ...d, ...patch })); setDirty(true); setComparison(null); setCompareId(''); }
  async function choose(id) {
    if (!id) return;
    await run(async () => { const value = await service.load(session, order.id, id); setDraft(value); setSampleId(sampleOf(value)); setSelected(id); setDirty(false); setComparison(null); setCompareId(''); });
  }
  async function file(slot, event) {
    const source = event.target.files?.[0]; event.target.value = ''; if (!source) return;
    await run(async () => { const image = await service.prepareImage(source); setDraft(d => ({ ...d, panels: { ...d.panels, [slot]: image } })); setDirty(true); setComparison(null); setCompareId(''); });
  }
  function panelChange(slot, patch) { change({ panels: { ...draft.panels, [slot]: { ...draft.panels[slot], ...patch } } }); }
  async function mask(slot,effect,event) {
    const source=event.target.files?.[0];event.target.value='';if(!source)return;
    await run(async () => {
      const asset=await service.prepareMask(source,draft.panels[slot],effect);
      panelChange(slot,{masks:{...draft.panels[slot].masks,[effect]:asset}});
    });
  }
  const complete = PREVIEW_MODELS[draft.model].slots.every(slot => draft.panels[slot]?.url);
  const stale = draft.sourceDesignId && draft.sourceDesignId !== order.designs.at(-1)?.id;
  return <div className="p3-editor">
    <div className="p3-intro"><p className="p3-kicker">ESTUDIO DE PRESENTACIÓN</p><h3>Del diseño al objeto</h3><p>Prepara las caras exportadas desde Corel y revisa cómo se verá la tarjeta armada.</p></div>
    <div className="p3-editor-grid"><fieldset disabled={busy || readOnly} className="p3-settings">
      <label>Modelo 3D<select aria-label="Modelo 3D" disabled={busy} value={draft.model} onChange={e => { setDraft({ ...newPreview(e.target.value), sourceDesignId: order.designs.at(-1)?.id || null }); setDirty(true); setComparison(null); setCompareId(''); }}>{Object.entries(PREVIEW_MODELS).map(([id,model])=><option value={id} key={id} disabled={model.localOnly&&!localSpace}>{model.label}</option>)}</select></label>
      <div className="p3-measures"><label>{isFolded(draft.model)?'Ancho cerrado (mm)':'Ancho (mm)'}<input type="number" min="20" max="300" step="0.1" value={draft.widthMm} onChange={e => { const n = Number(e.target.value); if (n >= 20 && n <= 300) change({ widthMm: n }); }}/></label><label>Alto (mm)<input type="number" min="20" max="400" step="0.1" value={draft.heightMm} onChange={e => { const n = Number(e.target.value); if (n >= 20 && n <= 400) change({ heightMm: n }); }}/></label><label>Espesor del papel (mm)<input type="number" min="0.15" max="1" step="0.05" value={draft.thicknessMm} onChange={e => { const n = Number(e.target.value); if (n >= 0.15 && n <= 1) change({ thicknessMm: n }); }}/></label></div>
      <label>Diseño de ejemplo<select aria-label="Diseño de ejemplo" value={SAMPLE_DESIGNS.some(s=>s.model===draft.model&&s.id===sampleId)?sampleId:SAMPLE_DESIGNS.find(s=>s.model===draft.model).id} onChange={e=>setSampleId(e.target.value)}>{SAMPLE_DESIGNS.filter(s=>s.model===draft.model).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><button disabled={busy} onClick={() => run(async () => { const chosen=SAMPLE_DESIGNS.find(s=>s.model===draft.model&&s.id===sampleId)||SAMPLE_DESIGNS.find(s=>s.model===draft.model);const panels = await service.demo(draft.model,chosen.id); change({ panels,appearance:{...appearanceOf(draft),paper:chosen.paper,finish:chosen.finish} }); })}>Cargar diseño de ejemplo</button>
      <AppearanceSettings value={appearanceOf(draft)} onChange={appearance => change({appearance})}/>
      <p className="p3-help">Exporta cada cara en PNG, JPEG o WebP, sin marcas de corte. {isFolded(draft.model)?`Abierta mide aproximadamente ${previewPose(draft,180).widthMm} × ${draft.heightMm} mm. Las medidas de cada cara aparecen debajo.`:`Frente y reverso miden ${draft.widthMm} × ${draft.heightMm} mm.`} {draft.model==='trifold'?'Esta muestra usa una solapa interior 2 mm más estrecha; comprueba las tolerancias de tu papel antes de producir. ':''}No se importan CDR, PSD o PDF en este visor.</p>
      {PREVIEW_MODELS[draft.model].slots.map(slot => <section className="p3-panel-input" key={slot}><label>{PANEL_LABELS[slot]}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => file(slot, e)}/></label><small>{panelSize(draft,slot).widthMm} × {panelSize(draft,slot).heightMm} mm</small>{draft.panels[slot] && <><small>{draft.panels[slot].name}{draft.panels[slot].demo ? ' · ejemplo' : ''}</small><div className="p3-panel-actions"><label>Ajuste de {PANEL_LABELS[slot]}<select value={draft.panels[slot].fit} onChange={e => panelChange(slot, { fit: e.target.value })}><option value="contain">Imagen completa</option><option value="cover">Cubrir y recortar</option></select></label><button aria-label={`Girar ${PANEL_LABELS[slot]}`} onClick={() => panelChange(slot, { rotation: (draft.panels[slot].rotation + 90) % 360 })}>Girar 90°</button></div>
        <details className="p3-masks"><summary>Efectos de {PANEL_LABELS[slot]}</summary><p className="p3-help">Exporta desde Corel una máscara del mismo tamaño en píxeles. Blanco aplica el efecto; negro lo excluye. Usa fondo negro opaco.</p>{Object.entries(EFFECTS).map(([effect,label]) => <div key={effect}><label>{`${label} de ${PANEL_LABELS[slot]}`}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => mask(slot,effect,e)}/></label>{draft.panels[slot].masks?.[effect] && <><small>{draft.panels[slot].masks[effect].name}</small><button aria-label={`Quitar ${label} de ${PANEL_LABELS[slot]}`} onClick={() => { const masks={...draft.panels[slot].masks};delete masks[effect];panelChange(slot,{masks}); }}>Quitar máscara</button></>}</div>)}</details>
      </>}</section>)}
      <label>Archivo de impresión vinculado<select value={draft.sourceDesignId || ''} onChange={e => change({ sourceDesignId: e.target.value || null })}><option value="">Sin archivo de impresión vinculado</option>{order.designs.map((d, i) => <option key={d.id} value={d.id}>V{i + 1} · {d.name}</option>)}</select></label>
      <button className="p3-primary" disabled={busy || readOnly || !complete || (!dirty && !!selected) || order.cancelled || order.stage === 'Entregado'} onClick={() => run(async () => { const next = await service.save(session, order.id, draft); const id = materialize(next)[order.id].previews.at(-1).id; const value = await service.load(session, order.id, id); setDraft(value); setSampleId(sampleOf(value)); setSelected(id); setDirty(false); setComparison(null); setCompareId(''); })}>Guardar versión 3D</button>
      <p className="p3-help">Las nuevas imágenes se guardan con sus bytes originales, hasta 10 MB y 24 megapíxeles por archivo. Las versiones anteriores mantienen su resolución: vuelve a importar el original para mejorarla. La vista 3D no sustituye el archivo de impresión ni hereda su aprobación.</p>
    </fieldset><div className="p3-workspace">
      <div className="p3-version-toolbar"><label>Versión 3D guardada<select aria-label="Versión 3D guardada" disabled={busy || !versions.length} value={selected} onChange={e => choose(e.target.value)}><option value="">Preparación nueva</option>{versions.map((p, i) => <option key={p.id} value={p.id}>Versión 3D {i + 1} · {PREVIEW_MODELS[p.model].label}</option>)}</select></label><label>Comparar con<select aria-label="Comparar con" disabled={busy || dirty || !selected} value={compareId} onChange={e => { const id = e.target.value; setCompareId(id); if (!id) setComparison(null); else void run(async () => setComparison(await service.load(session, order.id, id))); }}><option value="">Sin comparación</option>{versions.filter(p => p.id !== selected).map(p => <option key={p.id} value={p.id}>Versión 3D {versions.indexOf(p) + 1}</option>)}</select></label></div>
      {readOnly && <p className="p3-status">Consulta de versiones guardadas. Para preparar otra versión, el pedido debe estar activo y la copia compartida vigente.</p>}
      {dirty && <p className="p3-status">Preparación sin guardar. Guarda una versión antes de mostrarla al cliente.</p>}
      {Object.values(draft.panels).some(p => p.demo) && <p className="p3-status">Contiene imágenes de ejemplo.</p>}
      {stale && <p className="p3-status">Vinculada a un archivo anterior. Comprueba la versión de impresión antes de producir.</p>}
      <PreviewViewer config={draft} comparison={comparison}/>
      <button className="p3-primary p3-present" disabled={busy || dirty || !selected || !complete} onClick={() => run(() => onPresent([draft, ...(comparison ? [comparison] : [])]))}>Mostrar al cliente</button>
      <p className="p3-help">Abre una presentación con solo el producto y bloquea tu espacio de trabajo. Para volver a gestionar pedidos necesitarás el PIN.</p>
    </div></div>
  </div>;
}
