import { useEffect, useRef, useState } from 'react';
import { PANEL_LABELS, PREVIEW_MODELS, isFolded, panelSize, previewPose } from '../../domain/preview.js';
import './preview.css';

function PanelImage({ panel, slot, width, height }) {
  if (!panel?.url) return <div className="p3-empty-face"><span>CREATIVA</span><strong>{PANEL_LABELS[slot]}</strong><small>Carga una imagen o el ejemplo</small></div>;
  const swap = panel.rotation === 90 || panel.rotation === 270;
  return <img draggable="false" alt={PANEL_LABELS[slot]} src={panel.url} style={{ width: `${swap ? height / width * 100 : 100}%`, height: `${swap ? width / height * 100 : 100}%`, objectFit: panel.fit, transform: `translate(-50%,-50%) rotate(${panel.rotation}deg)` }} />;
}
function Scene({ config, camera, opening, onCamera }) {
  const host = useRef(null), renderer = useRef(null), callbacks = useRef({ onCamera });
  const [ready, setReady] = useState(false), [status, setStatus] = useState('loading'), [error, setError] = useState('');
  useEffect(() => { callbacks.current = { onCamera }; }, [onCamera]);
  useEffect(() => {
    let active = true;
    void import('./renderer/scene.js').then(({ createCardScene }) => {
      if (!active) return;
      renderer.current = createCardScene(host.current, { onCamera: value => callbacks.current.onCamera(value), onStatus: value => { if(active)setStatus(value); }, onFailure: value => { if(active)setError(value); } });
      setReady(true);
    }).catch(() => { if(active)setError('Este equipo no pudo iniciar el visor 3D. Puedes revisar las caras en vista plana.'); });
    return () => { active = false; renderer.current?.dispose(); renderer.current = null; };
  }, []);
  useEffect(() => { if(ready)void renderer.current.configure(config); }, [ready,config]);
  useEffect(() => { if(ready)renderer.current.camera(camera); }, [ready,camera]);
  useEffect(() => { if(ready)renderer.current.opening(opening); }, [ready,opening]);
  function key(e) {
    const delta = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (!delta) return; e.preventDefault(); onCamera({ ...camera, yaw: camera.yaw + delta[0], pitch: Math.max(-70, Math.min(70, camera.pitch + delta[1])) });
  }
  return <div className="p3-stage p3-webgl-stage" data-engine="webgl" data-status={error?'error':status} data-yaw={Math.round(camera.yaw)} data-opening={previewPose(config,opening).opening} role="group" aria-label="Vista 3D: arrastra para girar o usa las flechas" tabIndex={0} onKeyDown={key}>
    <div ref={host} className="p3-canvas-host" onDragStart={e => e.preventDefault()}/>
    <div className="p3-stage-label">{PREVIEW_MODELS[config.model].label}<span>{config.widthMm} × {config.heightMm} mm {isFolded(config.model) ? '· cerrada' : ''}</span></div>
    {status==='loading' && !error && <p className="p3-render-status" role="status">Preparando materiales…</p>}
    {error && <div className="p3-render-error" role="status"><p>{error}</p><Flat config={config}/></div>}
    {!error && <span className="p3-drag-hint">Arrastra para girar · rueda para acercar · flechas para ajustar</span>}
  </div>;
}
function Flat({ config }) {
  return <div className="p3-flat">{PREVIEW_MODELS[config.model].slots.map(slot => {const size=panelSize(config,slot);return <figure key={slot}><div style={{ aspectRatio: `${size.widthMm}/${size.heightMm}` }}><PanelImage panel={config.panels[slot]} slot={slot} width={size.widthMm} height={size.heightMm}/></div><figcaption>{PANEL_LABELS[slot]} · {size.widthMm} × {size.heightMm} mm</figcaption></figure>;})}</div>;
}
export default function PreviewViewer({ config, comparison = null }) {
  const [camera, setCamera] = useState({ yaw: -18, pitch: -12, zoom: 1 }), [opening, setOpening] = useState(25), [flat, setFlat] = useState(false);
  const folded = isFolded(config.model) || comparison && isFolded(comparison.model);
  return <div className="p3-viewer">
    <div className="p3-view-toolbar"><div className="p3-segment"><button aria-pressed={!flat} onClick={() => setFlat(false)}>Vista 3D</button><button aria-pressed={flat} onClick={() => setFlat(true)}>Vista plana</button></div>
      {!flat && <><button onClick={() => { setCamera({ yaw: -18, pitch: -12, zoom: 1 }); setOpening(25); }}>Restablecer vista</button><button onClick={() => setCamera({ ...camera, yaw: 0, pitch: 0 })}>Frente</button><button onClick={() => setCamera({ ...camera, yaw: 180, pitch: 0 })}>Reverso</button>{folded && <><button onClick={() => { setOpening(180); setCamera({ ...camera, yaw: 0, pitch: 0 }); }}>Abrir invitación</button><button onClick={() => setOpening(0)}>Cerrar invitación</button></>}</>}
    </div>
    <div className={`p3-scenes ${comparison ? 'p3-compare' : ''}`}>{[config, ...(comparison ? [comparison] : [])].map((item, i) => <section key={i} className="p3-scene-wrap">{comparison && <p className="p3-version-label">{item.versionLabel || (i ? 'Comparación' : 'Versión visible')}</p>}{flat ? <Flat config={item}/> : <Scene config={item} camera={camera} opening={opening} onCamera={setCamera}/>}</section>)}</div>
    {!flat && <div className="p3-controls"><label>Giro horizontal<input type="range" min="-180" max="180" value={((camera.yaw + 180) % 360 + 360) % 360 - 180} onChange={e => setCamera({ ...camera, yaw: Number(e.target.value) })}/></label><label>Inclinación<input type="range" min="-70" max="70" value={camera.pitch} onChange={e => setCamera({ ...camera, pitch: Number(e.target.value) })}/></label><label>Zoom<input type="range" min="0.6" max="2.4" step="0.05" value={camera.zoom} onChange={e => setCamera({ ...camera, zoom: Number(e.target.value) })}/></label>{folded && <label>Apertura de la invitación · {opening}°<input type="range" min="0" max="180" value={opening} onChange={e => setOpening(Number(e.target.value))}/></label>}</div>}
    <p className="p3-note">Materiales y acabados son simulaciones. Usa la vista plana para revisar el diseño y una muestra física para confirmar color y acabado de impresión.</p>
  </div>;
}
