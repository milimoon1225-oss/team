import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const env = await fs.readFile(new URL('./.env.local', import.meta.url), 'utf8');
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
const datos={movimientos:[{id:'1',tipo:'ingreso',concepto:'Cobro de pedido TR-1',monto:50,metodo:'Yape',hora:'2026-09-28T10:00',origen:'Pedido',responsable:'Cobro registrado'}],cierre:null};
let config={nombre:'Creativa Impresos',telefono:'',direccion:''};
let perder=true;const ids=new Set();
await context.route('**/rest/v1/rpc/creativa_caja',r=>r.fulfill({json:datos}));
await context.route('**/rest/v1/rpc/creativa_movimiento',async r=>{const p=r.request().postDataJSON();if(!ids.has(p.p_id)){ids.add(p.p_id);datos.movimientos.push({id:p.p_id,tipo:p.p_tipo,concepto:p.p_concepto,monto:p.p_monto,metodo:p.p_metodo,origen:'Caja',responsable:'L. Virginia'});}if(perder){perder=false;await r.abort();}else await r.fulfill({json:datos});});
await context.route('**/rest/v1/rpc/creativa_cerrar_caja',r=>{datos.cierre={contado:100,esperado:100,resumen:[...datos.movimientos]};return r.fulfill({json:datos});});
await context.route('**/rest/v1/rpc/creativa_configuracion',r=>r.fulfill({json:config}));
await context.route('**/rest/v1/rpc/creativa_guardar_configuracion',r=>{const p=r.request().postDataJSON();config={nombre:p.p_nombre,telefono:p.p_telefono,direccion:p.p_direccion};return r.fulfill({json:config});});
await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5174');
await page.getByRole('heading',{name:'Hola, L. Virginia'}).waitFor();
await page.locator('.quick-card').filter({hasText:'Caja'}).click();
await page.getByRole('heading',{name:'Control de caja',exact:true}).waitFor();
await page.getByRole('button',{name:'Almuerzos',exact:true}).click(); assert.equal(await page.getByLabel('Concepto',{exact:true}).inputValue(),'Almuerzos'); await page.getByRole('button',{name:'Registrar ingreso'}).click();await page.getByLabel('Monto (S/)',{exact:true}).fill('100');await page.getByLabel('Concepto',{exact:true}).fill('Fondo de apertura');
await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();await page.getByRole('button',{name:'Confirmar movimiento pendiente'}).waitFor();
await page.getByRole('button',{name:'Confirmar movimiento pendiente'}).click();await page.getByText('Movimiento registrado.',{exact:true}).waitFor();assert.equal(ids.size,1);
await page.getByRole('button',{name:'Preparar cierre'}).click();await page.getByLabel('Efectivo contado (S/)').fill('100');await page.getByRole('button',{name:'Confirmar cierre del día'}).click();await page.getByText('Cierre guardado',{exact:true}).waitFor();
for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
await page.screenshot({path:'caja-config-app/caja.png',fullPage:true});
await page.locator('.sidebar').getByRole('button',{name:'Configuración'}).click();await page.getByLabel('Nombre del negocio').fill('Creativa Actualizada');await page.getByRole('button',{name:'Guardar datos'}).click();await page.getByText('Datos del negocio guardados.').waitFor();assert.equal(config.nombre,'Creativa Actualizada');
await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.screenshot({path:'caja-config-app/configuracion.png',fullPage:true});assert.deepEqual(errors,[]);await browser.close();console.log('PASS: navegación, reintento sin duplicados, cierre, configuración y anchos 320/390/1440.');

