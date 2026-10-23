import fs from 'node:fs/promises';
const envText = await fs.readFile(new URL('../caja-config-app/.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line.trim())).map(line => { const pos = line.indexOf('='); return [line.slice(0,pos).trim(),line.slice(pos+1).trim().replace(/^["']|["']$/g,'')]; }));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url?.startsWith('https://') || !key?.startsWith('sb_publishable_')) throw new Error('Verificar la configuración pública antes de continuar.');
const endpoints = [
  ['clientes', '/rest/v1/clientes?select=id&limit=1'],
  ['trabajos', '/rest/v1/trabajos?select=id&limit=1'],
  ['pagos', '/rest/v1/pagos?select=id&limit=1'],
  ['pedidos', '/rest/v1/rpc/creativa_cargar_pedidos', {}],
  ['caja', '/rest/v1/rpc/creativa_caja', {p_fecha:'2026-10-02'}],
  ['configuracion', '/rest/v1/rpc/creativa_configuracion', {}],
  ['reportes', '/rest/v1/rpc/creativa_reporte', {p_desde:'2026-10-02',p_hasta:'2026-10-02'}],
  ['archivos', '/storage/v1/object/list/creativa-referencias', {prefix:'',limit:1,offset:0}],
];
const results = await Promise.all(endpoints.map(async ([nombre,path,body]) => {
  try {
    const response = await fetch(url+path,{method:body?'POST':'GET',headers:{apikey:key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
    const json = await response.json();
    return {nombre,status:response.status,codigo:json?.code || json?.error || null,resultado:response.status===401 || response.status===403?'rechaza acceso anónimo':Array.isArray(json)&&json.length===0?'sin registros visibles':'revisar respuesta'};
  } catch { return {nombre,resultado:'no se pudo comprobar la conexión'}; }
}));
console.log(JSON.stringify(results,null,2));
await fs.writeFile(new URL('comprobacion-acceso-piloto.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
if (results.some(r => !['rechaza acceso anónimo','sin registros visibles'].includes(r.resultado))) process.exitCode=1;
