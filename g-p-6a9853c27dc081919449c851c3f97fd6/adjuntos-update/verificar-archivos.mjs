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
  const body = route.request().url().includes('/auth/') ? user : route.request().url().includes('/storage/') ? {Key:'archivo'} : route.request().url().includes('creativa_guardar_pedido_v2') ? {id:'nuevo',codigo:'TR-00000002',cliente:'Cliente prueba',tipo:'Tarjeta tapa dura',entrega:'2026-09-28T17:00:00',estado:'Pendiente',precio_total:20,pagado:0,archivos:[]} : {
    perfil: { nombre: designer ? 'Milagros' : 'L. Virginia', rol: designer ? 'disenador' : 'administracion' },
    categorias: [{id:'cat1',nombre:'Tarjetas'}], tipos: [{id:'tipo1',categoria_id:'cat1',nombre:'Tarjeta tapa dura'}, {id:'tipo2',categoria_id:'cat1',nombre:'Tarjeta tapa dura'}, ...Array.from({length:20},(_,i)=>({id:'long'+i,categoria_id:'cat1',nombre:'Tarjeta personalizada con un nombre muy largo para probar pantallas pequeñas '+i}))],
    disenadores:[{id:'d1',nombre:'Milagros'}], trabajos:[{id:'job1',codigo:'TR-AB123456789012345',cliente:'Cliente de muestra',tipo:'Tarjeta tapa dura',entrega:'2026-09-28T17:00:00',estado:'En diseño',disenador_id:'d1',precio_total:150,pagado:50,cantidad:100,descripcion:'Colores azul y magenta. Texto de muestra para revisar el diseño.',urgente:false}]
  };
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const page = await context.newPage();
const errors=[]; page.on('pageerror',error=>errors.push(error.message));

await page.setViewportSize({width:360,height:850});
await page.goto('http://localhost:5173/');
await page.getByRole('heading',{name:'Hola, L. Virginia'}).waitFor();
await page.locator('.bottom-add').click();
await page.getByPlaceholder('Ej. María Quispe').fill('Cliente prueba');
await page.locator('#categoria-trabajo').click();
await page.getByRole('option',{name:'Tarjetas',exact:true}).click();
await page.locator('#tipo-trabajo').click();
await page.getByRole('option',{name:'Tarjeta tapa dura',exact:true}).click();
await page.getByPlaceholder('Ej. 100').fill('1');
await page.locator('input[type="date"]').fill('2026-09-25');
await page.locator('input[type="datetime-local"]').fill('2026-09-28T17:00');
await page.getByPlaceholder('0.00').first().fill('20');
await page.locator('input[type="file"]').setInputFiles({name:'referencia.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 prueba')});
await page.getByText('referencia.pdf',{exact:false}).first().waitFor();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.getByRole('button',{name:'Guardar trabajo',exact:true}).click();
await page.getByRole('heading',{name:'Trabajo guardado',exact:true}).waitFor();
await page.getByText('El pedido TR-00000002 fue registrado y ya está disponible en la lista de trabajos.',{exact:true}).waitFor();
assert.deepEqual(errors,[]);
await browser.close();
console.log('OK: selección PDF, guardado con servicio simulado, mensaje sin Supabase y sin desborde a 360px.');
