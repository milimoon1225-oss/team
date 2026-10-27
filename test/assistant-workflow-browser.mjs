import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { samplePdf } from './tool-fixtures.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true}),checks=[],errors=[],calls=[];
const output=new URL('../test-output/',import.meta.url);
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
try {
  await mkdir(output,{recursive:true});const context=await browser.newContext({viewport:{width:1440,height:960}});
  await context.route('https://**/*',route=>route.abort());
  let slow=false;
  await context.route('http://127.0.0.1:11434/**',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type'}});
    const body=route.request().postDataJSON();calls.push(body);assert.equal(body.model,'qwen3.5:4b');
    if(slow)await new Promise(resolve=>setTimeout(resolve,800));
    const properties=body.format.properties;
    const answer=properties.client?{client:'María',product:'Invitaciones',qty:150,delivery:'',description:'Diseño floral.'}
      :properties.items?{...(properties.visibleText?{visibleText:'MARIA Y JOSE 20/12/2026'}:{}),summary:'Revisión de las versiones indicadas.',items:[]}
        :{tool:'pending',term:'',day:'any'};
    try{await route.fulfill({json:{done:true,message:{content:JSON.stringify(answer)}}});}catch{/* Cancelación al cambiar datos o bloquear. */}
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:5177/');
  await page.getByLabel('Nombre del responsable').fill('Ana');await page.getByLabel('Elige un PIN local (6 a 12 dígitos)').fill('31415926');await page.getByLabel('Repite el PIN').fill('31415926');await click(page,'Preparar y comenzar');
  for(const product of ['Invitaciones florales','Tarjetas de presentación']){
    await click(page,'Nuevo pedido');await page.getByLabel('Cliente',{exact:true}).fill('María');await page.getByLabel('Tipo de trabajo').fill(product);await page.getByLabel('Precio total (S/)').fill('200');await click(page,'Guardar pedido');await page.locator('.w-order').first().waitFor();
  }
  assert.equal(await page.getByRole('button',{name:'Abrir asistente',exact:true}).count(),1);assert.equal(await page.locator('.w-sidebar').getByRole('button',{name:'Asistente',exact:true}).count(),0);
  await click(page,'Abrir asistente');await page.getByLabel('Tu pregunta').fill('Busca trabajos de María');await click(page,'Consultar al asistente');await page.getByRole('heading',{name:/2 trabajos coincidentes/}).waitFor();
  assert.equal(await page.getByRole('dialog').count(),0);assert.equal(calls.length,0);
  const chosen=page.getByLabel('Resultado del asistente').last().locator('.a-evidence').filter({hasText:'Invitaciones florales'});
  await chosen.getByRole('button',{name:'Ver pedido',exact:true}).click();
  const order=page.getByRole('dialog',{name:'María'});await order.waitFor();
  await order.getByRole('button',{name:'Pagos',exact:true}).click();await order.getByLabel('Importe (S/)',{exact:true}).fill('12.34');
  await click(page,'Minimizar chat');assert.equal(await order.getByRole('button',{name:'Abrir asistente',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Abrir asistente',exact:true}).count(),1);
  await order.locator('.w-order-checklist summary').click();await order.getByText('Falta adjuntar el archivo de impresión.',{exact:true}).waitFor();assert.equal(await page.getByRole('complementary',{name:'Asistente Creativa'}).count(),0);assert.equal(calls.length,0);
  await order.getByRole('button',{name:'Ir a Diseños',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.dataset.assistantFocus),'design-upload');
  await order.getByRole('button',{name:'Pagos',exact:true}).click();assert.equal(await order.getByLabel('Importe (S/)',{exact:true}).inputValue(),'12.34');
  await click(page,'Abrir asistente');await page.getByLabel('Tu pregunta').fill('Consulta por escribir');await page.getByLabel('Tu pregunta').press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'creativa-assistant-launcher');
  await click(page,'Abrir asistente');assert.equal(await page.getByLabel('Tu pregunta').inputValue(),'Consulta por escribir');await click(page,'¿Qué falta aquí?');await page.getByRole('log').getByText('Falta adjuntar el archivo de impresión.',{exact:true}).waitFor();
  checks.push('un solo acceso al chat; revisión y navegación en el pedido sin abrir chat ni llamar IA; Escape devuelve el foco y conserva el texto');
  assert.equal(await order.getByRole('button',{name:'Pagos',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await order.getByLabel('Importe (S/)',{exact:true}).inputValue(),'12.34');
  const left=await order.boundingBox(),right=await page.getByRole('complementary',{name:'Asistente Creativa'}).boundingBox();assert.ok(left.x+left.width<=right.x+1);assert.ok(left.width>400);
  checks.push('búsqueda ambigua sin IA; pedido y chat visibles sin solaparse; ayuda conserva pestaña e importe escrito');
  await page.getByRole('log').getByRole('button',{name:'Adjuntar diseño',exact:true}).click();
  assert.equal(await order.getByRole('button',{name:'Diseños',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.assistantFocus),'design-upload');
  for(const name of ['version-1.pdf','version-2.pdf']){await order.locator('input[type=file]').setInputFiles({name,mimeType:'application/pdf',buffer:samplePdf()});await order.getByText(new RegExp(`Versión .*${name}`)).waitFor();}
  assert.match(await page.getByRole('log').innerText(),/Busca trabajos de María/);assert.match(await page.getByRole('log').innerText(),/los datos cambiaron/);
  const before=await page.getByRole('log').innerText();await page.getByLabel('Tu pregunta').fill('Prepara el mensaje');await click(page,'Consultar al asistente');await page.getByLabel('Mensaje propuesto al cliente').waitFor();
  assert.match(await page.getByLabel('Mensaje propuesto al cliente').inputValue(),/versión 2: version-2.pdf/);assert.equal(calls.length,0);
  await page.getByLabel('Tu pregunta').fill('Ya confirmó');await click(page,'Consultar al asistente');await page.getByRole('log').getByRole('button',{name:'Registrar confirmación del cliente',exact:true}).last().click();await order.getByLabel('Nombre del cliente que confirmó').fill('María');
  await order.getByRole('button',{name:'Registrar aprobación de la última versión'}).click();await order.getByText(/Última versión aprobada/).waitFor();
  assert.ok((await page.getByRole('log').innerText()).includes(before.split('\n')[0]));
  await order.getByRole('button',{name:'Producción',exact:true}).click();await order.getByRole('button',{name:'Diseño',exact:true}).click();await order.getByRole('heading',{name:'Etapa actual: Diseño',exact:true}).waitFor();
  await page.getByLabel('Tu pregunta').fill('¿Qué falta aquí?');await click(page,'Consultar al asistente');await page.getByText(/La versión actual tiene aprobación registrada/).waitFor();
  await order.getByRole('button',{name:'Pagos',exact:true}).click();assert.equal(await order.getByLabel('Importe (S/)',{exact:true}).inputValue(),'12.34');
  await page.screenshot({path:new URL('asistente-integrado-escritorio.png',output).pathname});
  checks.push('navegación enfoca Diseños sin remontar el pedido; mensaje usa última versión sin modelo; aprobación explícita conserva conversación y campos');
  await page.getByLabel('Tu pregunta').fill('Compara las versiones');await click(page,'Consultar al asistente');await page.getByRole('heading',{name:'Comparación de versiones',exact:true}).waitFor();assert.equal(calls.length,1);assert.equal(calls[0].messages[1].images.length,2);
  const payload=JSON.parse(calls[0].messages[1].content);assert.match(payload.first.name,/version-1/);assert.match(payload.second.name,/version-2/);
  assert.equal(await page.locator('.t-tabs').count(),0);
  checks.push('comparación conversacional carga PDF e IA solo al pedirlo y selecciona automáticamente las dos últimas versiones');
  await page.getByLabel('Archivo para el asistente').setInputFiles({name:'consulta.pdf',mimeType:'application/pdf',buffer:samplePdf()});assert.equal(calls.length,1);
  await page.getByLabel('Tu pregunta').fill('Revisa este archivo');await click(page,'Consultar al asistente');await page.getByRole('heading',{name:'Revisión antes de imprimir',exact:true}).waitFor();assert.equal(calls.length,2);assert.equal(calls.at(-1).messages[1].images.length,1);
  assert.match(await page.getByLabel('Resultado de herramienta').last().innerText(),/no se confirmaron las medidas/);
  checks.push('adjunto directo en el chat sin análisis automático ni medidas inventadas; procesamiento solo al enviar');
  await click(page,'Cerrar pedido');await page.getByLabel('Tu pregunta').fill('Prepara un encargo');await click(page,'Consultar al asistente');await page.getByText(/Pega el mensaje del cliente aquí/).waitFor();
  await page.getByLabel('Tu pregunta').fill('Soy María, necesito 150 invitaciones florales.');await click(page,'Consultar al asistente');await page.getByLabel('Propuesta: Cliente').waitFor();assert.equal(calls.length,3);
  assert.equal(JSON.parse(calls.at(-1).messages[1].content).message,'Soy María, necesito 150 invitaciones florales.');
  await click(page,'Usar como borrador de pedido');await page.getByRole('heading',{name:'Nuevo pedido',exact:true}).waitFor();assert.equal(await page.getByLabel('Cliente',{exact:true}).inputValue(),'María');assert.equal(await page.getByLabel('Precio total (S/)').inputValue(),'');
  checks.push('encargo continúa en el mismo chat, conserva el mensaje y guarda únicamente una propuesta revisada como borrador');
  await click(page,'Pedidos');await page.locator('.w-order').filter({hasText:'Invitaciones florales'}).click();await order.getByRole('button',{name:'Pagos',exact:true}).click();await order.getByLabel('Importe (S/)',{exact:true}).fill('8.50');
  await page.setViewportSize({width:390,height:844});await click(page,'¿Qué falta aquí?');await page.getByRole('button',{name:'Volver al pedido',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:new URL('asistente-integrado-movil.png',output).pathname});await click(page,'Volver al pedido');
  assert.equal(await order.getByLabel('Importe (S/)',{exact:true}).inputValue(),'8.50');await click(page,'Cerrar pedido');await click(page,'Abrir asistente');
  await context.setOffline(true);await page.getByLabel('Tu pregunta').fill('Mis pendientes');await click(page,'Consultar al asistente');await page.getByRole('heading',{name:/2 pedidos pendientes/}).last().waitFor();assert.equal(calls.length,3);await context.setOffline(false);
  await page.setViewportSize({width:1440,height:960});slow=true;await page.getByLabel('Tu pregunta').fill('Ayúdame a localizar lo más importante del taller');await click(page,'Consultar al asistente');await page.getByRole('button',{name:'Cancelar consulta'}).waitFor();await click(page,'Bloquear espacio');await page.getByLabel('PIN local',{exact:true}).waitFor();
  await page.getByLabel('PIN local',{exact:true}).fill('31415926');await click(page,'Abrir espacio de trabajo');await click(page,'Abrir asistente');assert.equal(await page.getByRole('log').locator('.a-user-message').count(),0);assert.equal(await page.getByLabel('Tu pregunta').inputValue(),'');
  checks.push('móvil sin desbordamiento conserva campos al volver; consultas sin internet ni modelo; bloqueo limpia conversación y cancela tareas');
  assert.deepEqual(errors,[]);await writeFile(new URL('assistant-workflow-result.json',output),JSON.stringify({result:'PASS',checks,modelRequests:calls.length},null,2));console.log(checks.join('\n'));await context.close();
}catch(error){console.error('Errores:',errors);for(const ctx of browser.contexts())for(const page of ctx.pages())console.error((await page.locator('body').innerText()).slice(-5000));throw error;}finally{await browser.close();}
