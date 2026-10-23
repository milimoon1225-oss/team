import fs from 'node:fs/promises';
import dns from 'node:dns/promises';
const envText=await fs.readFile(new URL('../caja-config-app/.env.local',import.meta.url),'utf8');
const env=Object.fromEntries(envText.split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l.trim())).map(l=>{const p=l.indexOf('=');return[l.slice(0,p).trim(),l.slice(p+1).trim().replace(/^["']|["']$/g,'')];}));
const origin=env.VITE_SUPABASE_URL;
const key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!origin?.startsWith('https://') || !key?.startsWith('sb_publishable_')) throw new Error('Configuración pública inesperada.');
console.log(JSON.stringify({proyecto:new URL(origin).hostname,configuracionPublica:true}));
const requests=[['autenticacion',origin+'/auth/v1/health',true],['configuracion_auth',origin+'/auth/v1/settings',true],['dashboard','https://supabase.com/dashboard',false],['estado','https://status.supabase.com/',false]];
await Promise.all(requests.map(async([nombre,url,authenticated])=>{
  const start=Date.now();
  try {
    const response=await fetch(url,{headers:authenticated?{apikey:key}:{},signal:AbortSignal.timeout(15000)});
    let detalle;
    if(authenticated){const data=await response.json();detalle=response.ok?'responde correctamente':JSON.stringify(data).replaceAll(key,'[clave]').slice(0,400);}
    console.log(JSON.stringify({nombre,status:response.status,milisegundos:Date.now()-start,detalle}));
  }catch(error){console.log(JSON.stringify({nombre,error:error.name,codigo:error.cause?.code,mensaje:error.cause?.message||error.message,milisegundos:Date.now()-start}));}
}));
for(const host of [new URL(origin).hostname,'supabase.com']){
  try{const addresses=await dns.lookup(host,{all:true});console.log(JSON.stringify({dns:host,resuelve:addresses.length>0}));}
  catch(error){console.log(JSON.stringify({dns:host,codigo:error.code}));}
}
