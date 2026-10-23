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

let fallar=false;
await context.route('**/rest/v1/rpc/creativa_cargar_clientes',async route=>{
  await route.fulfill({status:fallar?404:200,contentType:'application/json',body:JSON.stringify(fallar?{code:'PGRST202'}:[
    {id:'cliente1',nombre:'María Quispe',telefono:'950 811 000',pedidos:[{id:'p1',codigo:'TR-00000001',tipo:'Tarjetas',estado:'Pendiente',entrega:'2026-09-28T17:00:00',precio_total:100,pagado:25}]},
    {id:'cliente2',nombre:'Otro cliente',telefono:null,pedidos:[]}
  ])});
});
for (const width of [320,390,1440]) {
  await page.setViewportSize({width,height:850});
  await page.goto('http://localhost:5173/');
  await page.getByRole('heading',{name:'Hola, L. Virginia'}).waitFor();
  await page.locator(width<800?'.bottom-nav':'.menu').getByRole('button',{name:'Clientes',exact:false}).click();
  await page.getByRole('heading',{name:'Clientes',exact:true}).waitFor();
  await page.getByRole('heading',{name:'María Quispe'}).waitFor();
  assert.equal(await page.locator('.client-card').count(),2);
  await page.getByLabel('Buscar cliente').fill('maria');
  assert.equal(await page.locator('.client-card').count(),1);
  await page.getByLabel('Buscar cliente').fill('950811000');
  assert.equal(await page.locator('.client-card').count(),1);
  await page.getByRole('button',{name:'Ver pedidos',exact:true}).click();
  await page.getByText('TR-00000001',{exact:true}).waitFor();
  assert.match(await page.locator('.client-balance').innerText(),/75[.,]00/);
  await page.getByLabel('Buscar cliente').fill('');
  await page.getByLabel('Con saldo pendiente').check();
  assert.equal(await page.locator('.client-card').count(),1);
  for(const theme of ['Claro','Oscuro']){
    await page.getByRole('button',{name:theme,exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  if(width===390) await page.screenshot({path:'clientes-update/clientes-movil.png',fullPage:true});
}
fallar=true;
await page.getByRole('button',{name:'Actualizar clientes'}).click();
await page.getByRole('alert').filter({hasText:'Falta activar'}).waitFor();
fallar=false;
await page.getByRole('button',{name:'Actualizar clientes'}).click();
await page.getByRole('alert').waitFor({state:'hidden'});
assert.deepEqual(errors,[]);
await browser.close();
console.log('OK: navegación, búsqueda sin tildes/teléfono, historial y saldo, filtro, error y reintento; 320/390/1440px sin desbordes en ambos temas. Datos simulados.');
