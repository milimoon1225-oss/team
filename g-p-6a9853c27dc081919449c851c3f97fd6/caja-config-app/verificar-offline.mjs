import { chromium } from 'file:///C:/Users/MILAGROS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = 'http://127.0.0.1:5174';
const usuario = { id:'00000000-0000-4000-8000-000000000001', email:'prueba@example.test', role:'authenticated', aud:'authenticated' };
const job = { id:'00000000-0000-4000-8000-000000000010',codigo:'TR-PRUEBA',cliente:'Cliente de prueba',precio_total:100,pagado:0,estado:'Pendiente',tipo:'Tarjetas' };
const token = [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:usuario.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'prueba'].join('.');
const sesion = { access_token:token, refresh_token:'prueba', expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:usuario };
const browser = await chromium.launch({channel:'msedge',headless:true});
await mkdir('qa-offline',{recursive:true});
try {
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:960}});
 await context.addInitScript(session=>localStorage.setItem('sb-mtsvbkncnnvzqnkhzrwz-auth-token',JSON.stringify(session)),sesion);
 const remoto=new Map(); const solicitudes=[]; let perder=false, conflicto=false, activado=true;
 const caja=()=>({movimientos:[...remoto.values()].map(o=>({...o,tipo:o.tipo==='abono'?'ingreso':o.tipo,origen:'Prueba',responsable:'Prueba'})),cierre:null});
 await context.route('https://**/*',async route=>{
  const nombre=route.request().url().split('/').at(-1); let data;
  if(nombre==='creativa_caja_offline_estado') {if(!activado)return route.fulfill({status:404,json:{code:'PGRST202',message:'missing'}});data={version:1};}
  else if(nombre==='creativa_cargar_pedidos') data={perfil:{nombre:'L. Virginia',rol:'administracion'},trabajos:[job],categorias:[],tipos:[],disenadores:[]};
  else if(nombre==='creativa_caja') data=caja();
  else if(nombre==='creativa_configuracion')data={nombre:'Creativa',telefono:'',direccion:''};
  else if(nombre==='creativa_sincronizar_caja') {
   const op=route.request().postDataJSON().p_operacion; solicitudes.push(op);
   if(conflicto && op.tipo==='abono')return route.fulfill({status:400,json:{code:'P0001',message:'El saldo cambió. Conserva el cobro para revisión; no vuelvas a cobrar.'}});
   if(!remoto.has(op.id)){remoto.set(op.id,op);if(op.tipo==='abono')job.pagado+=op.monto;}
   if(perder){perder=false;return route.abort();}
   data={id:op.id,estado:'sincronizado',fecha:op.ocurrido_en.slice(0,10),caja:caja(),...(op.tipo==='abono'?{pedido:job}:{})};
  } else if(nombre==='creativa_consultar_pagos')data={pedido:job,pagos:[]};
  else if(route.request().url().includes('/auth/'))data={user:usuario};
  else return route.fulfill({status:400,json:{code:'P0001',message:'RPC no prevista en la prueba'}});
  await route.fulfill({status:200,json:data});
 });
 const page=await context.newPage(); const errores=[];page.on('pageerror',e=>errores.push(e.message));
 await page.goto(base+'/#caja-local');
 await page.getByLabel('Elige un PIN').fill('246810');await page.getByLabel('Repite el PIN').fill('246810');await page.getByRole('checkbox').check();
 activado=false;await page.getByRole('button',{name:'Preparar Caja en este dispositivo'}).click();await page.getByRole('alert').filter({hasText:'Falta activar'}).waitFor();
 assert.equal(await page.evaluate(()=>new Promise(res=>{const r=indexedDB.open('creativa-caja-local-v1');r.onsuccess=()=>{const q=r.result.transaction('depositos').objectStore('depositos').get('principal');q.onsuccess=()=>res(!!q.result);};})),false);
 activado=true;await page.getByRole('button',{name:'Preparar Caja en este dispositivo'}).click();await page.getByRole('heading',{name:'Registrar un movimiento'}).waitFor();
 await context.setOffline(true);
 await page.getByRole('button',{name:'Almuerzos',exact:true}).click();await page.getByLabel('Monto (S/)').fill('15');await page.getByRole('button',{name:'Guardar en este dispositivo'}).click();await page.getByRole('status').filter({hasText:'Guardado en este dispositivo'}).waitFor();
 await page.getByLabel('¿Qué vas a registrar?').selectOption('abono');await page.getByRole('combobox',{name:/Pedido guardado/}).selectOption(job.id);await page.getByLabel('Monto (S/)').fill('40');await page.getByRole('button',{name:'Guardar en este dispositivo'}).click();
 await page.waitForFunction(()=>document.querySelector('.local-pending-number')?.textContent==='2');
 const sobre=await page.evaluate(()=>new Promise(res=>{const r=indexedDB.open('creativa-caja-local-v1');r.onsuccess=()=>{const q=r.result.transaction('depositos').objectStore('depositos').get('principal');q.onsuccess=()=>res(q.result);};}));
 assert.equal(sobre.pendientes,2);assert.ok(!JSON.stringify(sobre).includes('Almuerzos'));assert.ok(!JSON.stringify(sobre).includes('Cliente de prueba'));
 await page.getByRole('button',{name:'Bloquear con PIN'}).click();await page.getByLabel('PIN de este dispositivo').fill('111111');await page.getByRole('button',{name:'Abrir Caja con mi PIN'}).click();await page.getByRole('alert').filter({hasText:'El PIN no coincide'}).waitFor();
 await page.getByLabel('PIN de este dispositivo').fill('246810');await page.getByRole('button',{name:'Abrir Caja con mi PIN'}).click();await page.getByRole('heading',{name:'Registrar un movimiento'}).waitFor();
 const otro=await context.newPage();await context.setOffline(false); // online event attempts the queue
 await page.waitForFunction(()=>document.querySelector('.local-pending-number')?.textContent==='0');
 assert.equal(remoto.size,2);assert.equal(job.pagado,40);
 await otro.goto(base+'/#caja-local');await otro.getByLabel('PIN de este dispositivo').fill('246810');await otro.getByRole('button',{name:'Abrir Caja con mi PIN'}).click();await otro.getByRole('alert').filter({hasText:'otra pestaña'}).waitFor();await otro.close();
 // Lost acknowledgement: server applies once, retry uses exactly the same ID/body.
 await page.getByLabel('¿Qué vas a registrar?').selectOption('egreso');await page.getByRole('button',{name:'Almuerzos',exact:true}).click();await page.getByLabel('Monto (S/)').fill('12');await page.getByRole('button',{name:'Guardar en este dispositivo'}).click();await page.waitForFunction(()=>document.querySelector('.local-pending-number')?.textContent==='1');
 perder=true;await page.getByRole('button',{name:'Sincronizar pendientes'}).click();await page.getByRole('alert').waitFor();const ultimo=solicitudes.at(-1);await page.getByRole('button',{name:'Sincronizar pendientes'}).click();await page.waitForFunction(()=>document.querySelector('.local-pending-number')?.textContent==='0');assert.deepEqual(solicitudes.at(-1),ultimo);assert.equal(remoto.size,3);
 // A conflicting payment remains encrypted and visible after reload.
 await page.getByLabel('¿Qué vas a registrar?').selectOption('abono');await page.getByRole('combobox',{name:/Pedido guardado/}).selectOption(job.id);await page.getByLabel('Monto (S/)').fill('60');await page.getByRole('button',{name:'Guardar en este dispositivo'}).click();await page.waitForFunction(()=>document.querySelector('.local-pending-number')?.textContent==='1');conflicto=true;
 await page.getByRole('button',{name:'Sincronizar pendientes'}).click();await page.locator('.local-review').waitFor();assert.equal(remoto.size,3);
 await page.reload();await page.getByLabel('PIN de este dispositivo').fill('246810');await page.getByRole('button',{name:'Abrir Caja con mi PIN'}).click();await page.locator('.local-review').waitFor();
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:960});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa-offline/caja-movil.png',fullPage:true});
 await page.setViewportSize({width:1280,height:960});await page.screenshot({path:'qa-offline/caja-escritorio.png',fullPage:true});
 await page.getByRole('button',{name:'Volver a Creativa',exact:true}).click();await page.getByRole('heading',{name:'Hola, L. Virginia'}).waitFor();await page.locator('.sidebar').getByRole('button',{name:/Caja/}).click();await page.getByRole('status').filter({hasText:'por sincronizar o revisar'}).waitFor();
 await page.locator('.sidebar').getByRole('button',{name:/Configuración/}).click();await page.getByRole('heading',{name:'Creativa en tu dispositivo'}).waitFor();await page.getByRole('button',{name:'Guardar datos',exact:true}).waitFor();
 assert.deepEqual(errores,[]);await context.close();
 const pwa=await browser.newContext();await pwa.route('https://**/*',r=>r.abort());const movil=await pwa.newPage();await movil.goto(base);await movil.evaluate(()=>navigator.serviceWorker.ready);await movil.reload();await movil.waitForFunction(()=>!!navigator.serviceWorker.controller);await pwa.setOffline(true);await movil.reload();await movil.getByRole('heading',{name:'¡Qué bueno verte!'}).waitFor();await movil.getByRole('button',{name:'Abrir Caja de este dispositivo'}).click();await movil.getByRole('heading',{name:'Prepara este dispositivo'}).waitFor();await pwa.close();
 console.log('PASS: activation gate, encrypted durable queue, offline entries, PIN rejection, tab lock, idempotent retry, conflict retention, reload, online guards, responsive layouts and PWA offline reload. All backend data mocked.');
} finally {await browser.close();}
