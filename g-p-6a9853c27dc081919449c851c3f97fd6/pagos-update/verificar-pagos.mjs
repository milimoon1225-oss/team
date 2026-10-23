import { chromium } from 'file:///C:/Users/MILAGROS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const env = await fs.readFile('C:/Users/MILAGROS/creativa-mila/.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*["']?(https:\/\/[^\s"']+)/)[1];
const ref = new URL(url).hostname.split('.')[0];
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'visual@example.test', aud: 'authenticated', role: 'authenticated' };
const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url'), 'test'].join('.');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
await context.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: `sb-${ref}-auth-token`, session: { access_token: token, refresh_token: 'visual-only', expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: 'bearer', user } });
let designer = false;
await context.route('**/*.supabase.co/**', async route => {
  const body = route.request().url().includes('/auth/') ? { user } : {
    perfil: { nombre: designer ? 'Milagros' : 'L. Virginia', rol: designer ? 'disenador' : 'administracion' },
    categorias: [{id:'cat1',nombre:'Tarjetas'}], tipos: [{id:'tipo1',categoria_id:'cat1',nombre:'Tarjeta tapa dura'}, {id:'tipo2',categoria_id:'cat1',nombre:'Tarjeta tapa dura'}, ...Array.from({length:20},(_,i)=>({id:'long'+i,categoria_id:'cat1',nombre:'Tarjeta personalizada con un nombre muy largo para probar pantallas pequeñas '+i}))],
    disenadores:[{id:'d1',nombre:'Milagros'}], trabajos:[{id:'job1',codigo:'TR-AB123456789012345',cliente:'Cliente de muestra',tipo:'Tarjeta tapa dura',entrega:'2026-09-28T17:00:00',estado:'En diseño',disenador_id:'d1',precio_total:150,pagado:50,cantidad:100,descripcion:'Colores azul y magenta. Texto de muestra para revisar el diseño.',urgente:false}]
  };
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const page = await context.newPage();
const errors=[]; page.on('pageerror',error=>errors.push(error.message));

const pedido={id:'job1',codigo:'TR-00000001',cliente:'Cliente de muestra',tipo:'Tarjetas',estado:'Listo',precio_total:150,pagado:50,entrega:'2026-09-28T17:00:00',archivos:[]};
const pagos=[{id:'inicial',monto:50,metodo:'Yape',fecha:'2026-09-26T10:00:00'}];
const solicitudes=new Set(); let perderRespuesta=true;
await context.route('**/rest/v1/rpc/creativa_consultar_pagos',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pedido,pagos})}));
await context.route('**/rest/v1/rpc/creativa_registrar_abono',async route=>{
  const p=route.request().postDataJSON();
  if(!solicitudes.has(p.p_solicitud)) { solicitudes.add(p.p_solicitud);pedido.pagado+=p.p_monto;pagos.push({id:p.p_solicitud,monto:p.p_monto,metodo:p.p_metodo,fecha:'2026-09-26T11:00:00'}); }
  if(perderRespuesta) {perderRespuesta=false;await route.abort('failed');return;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pedido,pagos})});
});
await page.setViewportSize({width:320,height:850});
async function abrir() {
  await page.goto('http://localhost:5173/');
  await page.getByRole('heading',{name:'Hola, L. Virginia'}).waitFor();
  await page.getByRole('button',{name:'Ver / registrar pagos'}).first().click();
  await page.getByRole('dialog').waitFor();
  await page.getByLabel('Monto recibido (S/)').waitFor();
}
await abrir();
await page.getByLabel('Monto recibido (S/)').fill('25');
await page.getByRole('button',{name:'Registrar pago',exact:true}).click();
await page.getByRole('button',{name:'Confirmar pago pendiente',exact:true}).waitFor();
assert.equal(pagos.length,2);
await abrir();
assert.equal(await page.getByLabel('Monto recibido (S/)').inputValue(),'25');
assert.equal(await page.getByLabel('Monto recibido (S/)').isDisabled(),true);
await page.getByRole('button',{name:'Confirmar pago pendiente',exact:true}).click();
await page.getByText('Pago registrado. El estado de entrega se mantiene.').waitFor();
assert.equal(pagos.length,2);assert.equal(pedido.pagado,75);
for(const width of [320,390,1440]) {
  await page.setViewportSize({width,height:850});
  const d=await page.getByRole('dialog').boundingBox();
  assert.ok(d.x>=0 && d.x+d.width<=width);
  assert.equal(await page.getByRole('dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
}
await page.getByRole('button',{name:'Cobrar saldo completo'}).click();
assert.equal(await page.getByLabel('Monto recibido (S/)').inputValue(),'75.00');
await page.getByRole('button',{name:'Registrar pago',exact:true}).click();
await page.getByText('Pagado por completo · Listo').waitFor();
assert.equal(pedido.pagado,150);assert.equal(pedido.estado,'Listo');assert.equal(pagos.length,3);
await page.getByRole('button',{name:'Cerrar pagos'}).click();
await page.getByRole('button',{name:'Oscuro',exact:true}).click();
await page.getByRole('button',{name:'Ver / registrar pagos'}).first().click();
await page.getByText('Pagado por completo · Listo').waitFor();
await page.setViewportSize({width:390,height:850});
assert.equal(await page.getByRole('dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
await page.screenshot({path:'pagos-update/pago-movil.png'});
await page.keyboard.press('Escape');
await page.getByRole('dialog').waitFor({state:'hidden'});
assert.deepEqual(errors,[]);
await browser.close();
console.log('OK: abono con respuesta perdida, recarga y reintento sin duplicar, saldo completo sin entrega, historial, modal responsive/claro/oscuro y cierre por teclado. Datos simulados.');
