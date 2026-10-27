import { useEffect, useState } from 'react';
import { validateCustomerProjection } from '../../domain/preview.js';
import PreviewViewer from './PreviewViewer.jsx';

export default function CustomerApp({ read }) {
  const [value, setValue] = useState(null), [error, setError] = useState('');
  useEffect(() => { let active = true; read().then(v => { if (active) setValue(validateCustomerProjection(v)); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [read]);
  return <main className="p3-customer"><header><div><span className="p3-kicker">CREATIVA · PRESENTACIÓN</span><h1>Tu diseño, desde todos los ángulos</h1></div><button onClick={() => window.close()}>Cerrar presentación</button></header>
    {error ? <p role="alert">{error}</p> : !value ? <p role="status">Preparando la presentación…</p> : <><div className="p3-customer-meta">{value.variants.map((v, i) => <span key={i}>{v.versionLabel}{v.demo ? ' · diseño de ejemplo' : ''}</span>)}</div><PreviewViewer config={value.variants[0]} comparison={value.variants[1] || null}/></>}
  </main>;
}
