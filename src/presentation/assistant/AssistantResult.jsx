import { useState } from 'react';
import { money } from '../../domain/operations.js';
function Field({ label, children, ...props }) { return <label className="t-field"><span>{label}</span>{children || <input {...props}/>}</label>; }

function Brief({ result, apply, hasDraft }) {
  const [brief,setBrief]=useState(result.brief),[replace,setReplace]=useState(false);
  return <div className="t-brief"><div className="t-grid">{[['client','Cliente'],['product','Trabajo'],['qty','Cantidad'],['delivery','Entrega (AAAA-MM-DDTHH:mm)']].map(([key,label])=><Field key={key} label={`Propuesta: ${label}`} value={brief[key]} type={key==='qty'?'number':'text'} onChange={e=>setBrief({...brief,[key]:key==='qty'?(e.target.value===''?'':Number(e.target.value)):e.target.value})}/>)}<Field label="Propuesta: Indicaciones"><textarea value={brief.description} onChange={e=>setBrief({...brief,description:e.target.value})} maxLength={3000}/></Field></div>
    <p>Por confirmar:</p><ul>{result.brief.missing.map(item=><li key={item}>{item}</li>)}</ul>
    {hasDraft && <label className="t-check"><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/>Reemplazar mi borrador actual con esta propuesta revisada</label>}
    <button onClick={()=>apply(brief,replace)} disabled={hasDraft&&!replace}>Usar como borrador de pedido</button>
  </div>;
}

export default function AssistantResult({ result, run, saveIndex, applyBrief, hasDraft, navigate, setNotice, calculation }) {
  if (!result) return null;
  async function copy() { try { await navigator.clipboard.writeText(result.message); setNotice('Texto copiado. Revísalo antes de compartirlo.'); } catch { setNotice('Selecciona el mensaje y usa Ctrl+C para copiarlo.'); } }
  return <section className="t-result" aria-label="Resultado de herramienta"><header><span>{result.model?'Qwen3.5 · Revisión asistida':'Cálculo o consulta local'}</span><h3>{result.title}</h3></header>
    {result.summary&&<p>{result.summary}</p>}{result.note&&<p className="t-note">{result.note}</p>}
    {result.scope&&<p className="t-scope">Datos locales de esta computadora.</p>}
    {result.images&&<div className="t-images">{result.images.map(image=><figure key={image.name}><img src={image.url} alt={image.name}/><figcaption>{image.name}<small>SHA256 {image.hash}</small></figcaption></figure>)}</div>}
    {result.checks&&<><h4>Comprobaciones técnicas</h4>{result.checks.map(check=><article className={`t-check-result ${check.level}`} key={check.label}><strong>{check.label}</strong><p>{check.value}</p></article>)}</>}
    {result.textComparison&&<><h4>Comparación con la referencia</h4><p className="t-note">{result.textComparison.message}</p><Field label={result.textComparison.source}><textarea readOnly value={result.textComparison.observed} rows={4}/></Field><details><summary>Texto de referencia aportado</summary><p>{result.textComparison.reference||'Sin referencia.'}</p></details></>}
    {result.items&&<><h4>Observaciones de la IA para revisar</h4>{!result.items.length&&<p>El modelo no señaló observaciones. Esto no certifica que el diseño esté correcto.</p>}{result.items.map((item,i)=><article className="t-observation" key={i}><p>{item.detail}</p><small>Evidencia indicada: {item.evidence}</small></article>)}</>}
    {result.difference&&<figure className="t-difference"><img src={result.difference.image} alt="Mapa orientativo de cambios en rosa"/><figcaption>{result.difference.sameFile?'Mismo archivo y página.':`${result.difference.changedPercent.toFixed(2)} % de píxeles diferentes en la copia de comparación.`}<p>{result.difference.method}</p></figcaption></figure>}
    {result.brief&&<Brief key={result.sourceText} result={result} apply={applyBrief} hasDraft={hasDraft}/>}
    {result.tags&&<><p className="t-tags">{result.tags.join(' · ')}</p><button onClick={()=>saveIndex(result.index)}>Guardar ficha visual en esta copia</button></>}
    {result.rows&&result.rows.map(row=><article className="t-candidate" key={row.id}><strong>{row.code} · {row.client}</strong><p>{row.product}</p><small>Coincide: {row.matched.join(', ')} · {row.indexed?'Incluye ficha visual':'Datos del pedido'}</small><div className="a-actions">{row.actions.map(item=><button key={item.action.target} onClick={()=>navigate(item.action)}>{item.label}</button>)}</div></article>)}
    {result.sources&&<><h4>Fuentes verificadas</h4>{result.sources.map(source=><blockquote key={source.id}><p>{source.quote}</p><cite>{source.title} · página {source.page}</cite></blockquote>)}</>}
    {result.message&&<><Field label="Mensaje propuesto al cliente"><textarea readOnly rows={8} value={result.message}/></Field><button onClick={()=>void copy()}>Copiar mensaje revisable</button></>}
    {result.checklist&&<ul>{result.checklist.map((item,i)=><li key={i}>{item}</li>)}</ul>}
    {result.quotes&&<><div className="w-table"><table><thead><tr><th>Concepto</th><th>Opción A</th><th>Opción B</th></tr></thead><tbody>{[['yieldPerSheet','Unidades por pliego',false],['sheets','Pliegos con merma',false],['paper','Papel',true],['printing','Impresión',true],['finishing','Acabado',true],['setup','Preparación',true],['design','Diseño',true],['cost','Costo total',true],['priceBeforeDiscount','Precio con margen',true],['price','Precio con descuento',true],['gain','Diferencia precio/costo',true]].map(([key,label,currency])=><tr key={key}><td>{label}</td>{result.quotes.map((quote,i)=><td key={i}>{currency?money(quote[key]):quote[key]}</td>)}</tr>)}</tbody></table></div>{result.quotes.map((quote,i)=><p className={quote.belowCost?'t-note':''} key={i}>Opción {i?'B':'A'}: margen después del descuento {quote.actualMargin.toFixed(1)} %. {quote.belowCost?'El precio queda por debajo del costo.':''}</p>)}<p>{result.quotes[0].assumptions}</p><button onClick={()=>run('explain',{kind:'quote',data:calculation})}>Explicar estas alternativas con IA</button></>}
    {result.schedule&&<><div className="w-table"><table><thead><tr><th>Trabajo</th><th>Estado</th><th>Minutos</th><th>Fin estimado en Lima</th></tr></thead><tbody>{result.schedule.map(job=><tr key={job.id}><td>{job.code} · {job.client}</td><td>{job.status==='blocked'?job.blockers.join(' '):job.status==='missing'?'Faltan tiempos':job.late?'Riesgo de retraso':'Programado'}</td><td>{job.minutes??'—'}</td><td>{job.endAt?new Date(job.endAt).toLocaleString('es-PE',{timeZone:'America/Lima'}):'Sin programar'}</td></tr>)}</tbody></table></div><button onClick={()=>run('explain',{kind:'capacity',data:calculation})}>Explicar estas prioridades con IA</button></>}
    {result.actions&&<div className="a-actions">{result.actions.map(item=><button key={item.action.target} onClick={()=>navigate(item.action)}>{item.label}</button>)}</div>}
  </section>;
}
