export default function AppearanceSettings({ value, onChange }) {
  const select = (key,label,options) => <label>{label}<select aria-label={label} value={value[key]} onChange={e => onChange({ ...value,[key]:e.target.value })}>{options.map(([id,text]) => <option key={id} value={id}>{text}</option>)}</select></label>;
  return <details className="p3-appearance" open><summary>Papel, acabados e iluminación</summary><div>
    {select('paper','Superficie del papel',[['smooth','Cartulina lisa'],['textured','Papel texturado']])}
    {select('finish','Acabado general',[['matte','Mate'],['satin','Satinado'],['gloss','Brillante']])}
    {select('foil','Color del foil',[['gold','Dorado'],['silver','Plateado']])}
    {select('relief','Tipo de relieve',[['raised','Elevado'],['debossed','Hundido']])}
    <label>Intensidad del relieve<input type="range" min="0" max="1" step="0.05" value={value.reliefStrength} onChange={e => onChange({ ...value,reliefStrength:Number(e.target.value) })}/></label>
    {select('lighting','Iluminación',[['neutral','Luz neutra'],['side','Luz lateral'],['studio','Presentación']])}
    <label>Dirección de la luz<input type="range" min="-180" max="180" value={value.lightAngle} onChange={e => onChange({ ...value,lightAngle:Number(e.target.value) })}/></label>
    <label>Intensidad de la luz<input type="range" min="0.4" max="2" step="0.1" value={value.lightIntensity} onChange={e => onChange({ ...value,lightIntensity:Number(e.target.value) })}/></label>
    <p className="p3-help">Foil, relieve y barniz sectorizado se aplican con las máscaras de cada cara. El relieve simula la superficie; no cambia el contorno.</p>
  </div></details>;
}
