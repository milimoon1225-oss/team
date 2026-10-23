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
const jobs=[{id:'a',codigo:'TR-001',cliente:'Cliente Álvarez',tipo:'Tarjetas',cantidad:100,estado:'Pendiente',entrega:'2026-09-20T17:00:00',descripcion:'Logo azul. Revisar ortografía.',archivos:[]},{id:'b',codigo:'TR-002',cliente:'Cliente B',tipo:'Banner',estado:'En diseño',entrega:'2026-10-05T12:00:00',archivos:[]},{id:'c',codigo:'TR-003',cliente:'Cliente C',tipo:'Volantes',estado:'Listo',archivos:[]}];
jobs.push({id:'libre',codigo:'TR-004',cliente:'Cliente Libre',tipo:'Sublimado',estado:'Pendiente',disponible:true,archivos:[]});
await context.route('**/rest/v1/rpc/creativa_enlace_listos',r=>r.fulfill({json:'https://chat.whatsapp.com/GrupoPrueba123'}));
await context.route('**/rest/v1/rpc/creativa_tomar_trabajo',r=>{const t=jobs.find(t=>t.id===r.request().postDataJSON().p_trabajo);t.disponible=false;t.estado='En diseño';t.telefono='987654321';return r.fulfill({json:null});});
await context.route('**/rest/v1/rpc/creativa_cargar_pedidos',r=>r.fulfill({json:{perfil:{nombre:'Leydy Milagros',rol:'disenador'},trabajos:jobs,categorias:[],tipos:[],disenadores:[]}}));
let calls=0;let fail=true;
await context.route('**/rest/v1/rpc/creativa_cambiar_estado',r=>{calls++;if(fail){fail=false;return r.fulfill({status:400,json:{code:'P0001',message:'Intenta nuevamente'}});}const p=r.request().postDataJSON();jobs.find(t=>t.id===p.p_trabajo).estado=p.p_estado;return r.fulfill({json:null});});
await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5174');await page.getByRole('heading',{name:'Hola, Leydy Milagros'}).waitFor();
assert.equal(await page.locator('.design-job').count(),2);assert.equal(await page.getByText('Entrega vencida',{exact:true}).count(),1);
await page.getByLabel('Buscar pedido').fill('alvarez');assert.equal(await page.locator('.design-job').count(),1);await page.getByLabel('Buscar pedido').fill('');
await page.getByRole('button',{name:'Iniciar diseño',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(jobs[0].estado,'Pendiente');
await page.getByRole('button',{name:'Iniciar diseño',exact:true}).click();await page.getByText('Diseño iniciado. ¡Manos a la obra!').waitFor();await page.getByRole('button',{name:'Iniciar diseño',exact:true}).waitFor({state:'hidden'});assert.equal(jobs[0].estado,'En diseño');
assert.equal(await page.locator('.design-job').filter({hasText:'TR-001'}).getByRole('button',{name:'Marcar listo',exact:true}).isDisabled(),true);
await page.locator('.design-job').filter({hasText:'TR-001'}).getByRole('checkbox').check();
await page.locator('.design-job').filter({hasText:'TR-001'}).getByRole('button',{name:'Marcar listo',exact:true}).click();await page.getByText('Diseño marcado como listo. Recepción ya puede ver el nuevo estado.').waitFor();await page.locator('.design-job').filter({hasText:'TR-001'}).waitFor({state:'hidden'});assert.equal(jobs[0].estado,'Listo');assert.equal(calls,3);
await page.getByRole('group',{name:'Filtrar trabajos'}).getByRole('button',{name:'Todos',exact:true}).click();assert.equal(await page.locator('.design-job').count(),3);
assert.equal(await page.getByRole('link',{name:'Abrir grupo TRABAJOS LISTOS'}).first().getAttribute('href'),'https://chat.whatsapp.com/GrupoPrueba123');
await page.getByRole('navigation',{name:'Navegación de diseñador',exact:true}).getByRole('button',{name:'Disponibles',exact:false}).click();assert.equal(await page.locator('.design-job').count(),1);assert.equal(await page.getByRole('link',{name:'Contactar al cliente por WhatsApp'}).count(),0);
await page.getByRole('button',{name:'Tomar trabajo',exact:true}).click();await page.getByText('El pedido ya es tuyo y está en diseño. Ahora puedes contactar al cliente.').waitFor();
await page.getByRole('link',{name:'Contactar al cliente por WhatsApp'}).waitFor();assert.ok((await page.getByRole('link',{name:'Contactar al cliente por WhatsApp'}).getAttribute('href')).startsWith('https://wa.me/51987654321?text='));
await page.getByRole('group',{name:'Filtrar trabajos'}).getByRole('button',{name:'Todos',exact:true}).click();
assert.equal(await page.getByText('Importe pagado',{exact:false}).count(),0);assert.equal(await page.getByRole('button',{name:'Marcar entregado',exact:false}).count(),0);
await page.screenshot({path:'caja-config-app/disenadores-desktop.png',fullPage:true});
for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
await page.setViewportSize({width:390,height:900});await page.getByRole('button',{name:'Oscuro',exact:false}).click();await page.screenshot({path:'caja-config-app/disenadores-movil.png',fullPage:true});
await page.getByRole('navigation',{name:'Navegación móvil de diseñador'}).getByRole('button',{name:'Ajustes'}).click(); await page.getByRole('heading',{name:'Configuración',exact:true}).waitFor(); assert.equal(await page.locator('.design-settings').getByRole('button',{name:'Cerrar sesión'}).isVisible(),true); await page.locator('.design-settings').getByRole('button',{name:'Cerrar sesión'}).click(); await page.getByRole('button',{name:'Entrar a mi espacio'}).waitFor(); assert.deepEqual(errors,[]);await browser.close();console.log('PASS: búsqueda, filtros, inicio/listo, error recuperable, límites del rol y tamaños 320/390/1440.');
