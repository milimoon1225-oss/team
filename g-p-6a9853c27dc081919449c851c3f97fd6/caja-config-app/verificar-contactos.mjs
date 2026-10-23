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
const pedidos=[{id:'1',codigo:'TR-001',cliente:'Rosa',telefono:'987654321',tipo:'Tarjetas',precio_total:100,pagado:40,estado:'Listo',entrega:'2026-09-20T12:00:00',archivos:[]},{id:'2',codigo:'TR-002',cliente:'Luis',telefono:'',tipo:'Banner',precio_total:20,pagado:20,estado:'En diseño',entrega:'2099-01-01T12:00:00',archivos:[]}];
await context.route('**/rest/v1/rpc/creativa_cargar_pedidos',r=>r.fulfill({json:{perfil:{nombre:'L. Virginia',rol:'administracion'},trabajos:pedidos,disenadores:[],categorias:[],tipos:[]}}));
let entregas=0;
await context.route('**/rest/v1/rpc/creativa_cambiar_estado',r=>{entregas++;pedidos[0].estado='Entregado';return r.fulfill({json:null});});
await context.route('**/rest/v1/rpc/creativa_cargar_clientes',r=>r.fulfill({json:[{id:'c1',nombre:'Rosa',telefono:'987654321',pedidos}]}));
await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5174');await page.getByRole('heading',{name:'Hola, L. Virginia'}).waitFor();
await context.route('**/rest/v1/rpc/creativa_configuracion',r=>r.fulfill({json:{nombre:'Creativa Impresos',telefono:'',direccion:''}})); await page.getByRole('button',{name:'Ver / imprimir recibo',exact:true}).first().click(); await page.getByRole('dialog').waitFor(); assert.ok((await page.locator('.receipt-totals').innerText()).includes('60.00')); await page.locator('.receipt-logo').evaluate(img=>img.decode()); await page.locator('.receipt-paper').screenshot({path:'caja-config-app/recibo-elegante.png'}); await page.locator('.receipt-controls select').selectOption('80'); await page.emulateMedia({media:'print'}); assert.equal(await page.locator('.receipt-controls').isVisible(),false); assert.equal(await page.locator('.receipt-paper').isVisible(),true); await page.emulateMedia({media:'screen'}); await page.getByRole('button',{name:'Cerrar sin imprimir'}).click(); assert.equal(await page.getByRole('dialog').count(),0); const aviso=await page.getByRole('link',{name:'Avisar por WhatsApp'}).getAttribute('href');assert.ok(aviso.startsWith('https://wa.me/51987654321?text='));assert.ok(decodeURIComponent(aviso).includes('ya está listo para recoger'));assert.equal(await page.getByRole('link',{name:'Llamar',exact:true}).getAttribute('href'),'tel:+51987654321');
await page.getByRole('button',{name:'Listos para recoger',exact:true}).click();assert.equal(await page.locator('.job-card').count(),1);
await page.getByRole('button',{name:'Confirmar entrega',exact:true}).click();await page.getByText('Aún tiene un saldo de S/ 60.00.',{exact:false}).waitFor();assert.equal(entregas,0);
await page.getByRole('button',{name:'Volver',exact:true}).click();assert.equal(entregas,0);
for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
await page.screenshot({path:'caja-config-app/contactos-admin.png',fullPage:true});
await page.getByRole('button',{name:'Confirmar entrega',exact:true}).click();await page.getByRole('button',{name:'Sí, registrar entrega',exact:true}).click();await page.locator('.job-card').waitFor({state:'hidden'});assert.equal(entregas,1);assert.equal(pedidos[0].pagado,40);
await page.getByRole('button',{name:'Con saldo pendiente',exact:true}).click();await page.locator('.job-card').waitFor();assert.equal(await page.locator('.job-card').count(),1);
await page.locator('.sidebar').getByRole('button',{name:'Clientes',exact:false}).click();await page.getByRole('link',{name:'WhatsApp',exact:false}).waitFor();assert.equal(await page.getByRole('link',{name:'Llamar',exact:true}).getAttribute('href'),'tel:+51987654321');assert.deepEqual(errors,[]);
await browser.close();console.log('PASS: enlaces WhatsApp/teléfono, mensaje de pedido listo, filtros, confirmación sin alterar pagos y vistas 320/390/1440.');
