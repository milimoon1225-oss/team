import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { samplePdf } from '../tool-fixtures.mjs';
const require=createRequire(import.meta.url);
const {_electron:electron}=require('playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const output=path.join(root,'test-output');await mkdir(output,{recursive:true});
const environment={...process.env,CREATIVA_TEST_USER_DATA:path.join(output,`perfil-${Date.now()}`)};
delete environment.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({executablePath:require('electron'),args:[...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--enable-unsafe-swiftshader']:[]),root],env:environment,timeout:30000});
try{
 const page=await app.firstWindow();await app.context().route('https://**/*',route=>route.abort());
 await page.getByRole('heading',{name:'Preparar esta computadora'}).waitFor();
 assert.equal(await page.evaluate(()=>typeof window.require),'undefined');assert.equal(await page.evaluate(()=>!!indexedDB&&!!crypto.subtle&&!!navigator.locks),true);
 const prefs=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
 assert.equal(prefs.sandbox,true);assert.equal(prefs.contextIsolation,true);assert.equal(prefs.nodeIntegration,false);
 const header=await page.evaluate(()=>fetch('app://creativa/').then(r=>r.headers.get('Content-Security-Policy')));assert.ok(header.includes("connect-src 'self'"));assert.ok(!header.includes('https:'));
 await page.getByLabel('Elige un PIN local (6 a 12 dígitos)').fill('31415926');await page.getByLabel('Repite el PIN').fill('31415926');await page.getByRole('button',{name:'Preparar y comenzar'}).click();await page.getByRole('heading',{name:'Pedidos',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>typeof window.creativaAssistant.request),'function');
 await assert.rejects(()=>page.evaluate(()=>window.creativaAssistant.request({id:crypto.randomUUID(),action:'interpret',question:'Prueba',model:'cloud:latest'})),/no permitido/);
 await page.getByRole('button',{name:'Abrir asistente',exact:true}).click();await page.getByRole('button',{name:'Ver pendientes',exact:true}).click();await page.getByRole('heading',{name:/0 pedidos pendientes/}).last().waitFor();
 if(process.argv.includes('--assistant-model')){
  await page.getByLabel('Tu pregunta').fill('¿Cuáles deberían entregarse según lo registrado?');await page.getByRole('button',{name:'Consultar al asistente'}).click();
  await page.getByText('Qwen3.5 · IA local · Ver detalle',{exact:true}).waitFor({timeout:100000});await page.getByRole('heading',{name:/0 pedidos pendientes/}).last().waitFor();console.log('PASS: IPC de escritorio → Qwen3.5:4b real → consulta autorizada.');
 }
 await page.getByRole('button',{name:'Minimizar chat',exact:true}).click();
 if(process.argv.includes('--samples')){
  await page.getByRole('button',{name:'Configuración',exact:true}).click();await page.getByRole('button',{name:'Explorar demostración',exact:true}).click();
  await page.locator('.w-order').nth(18).waitFor();assert.equal(await page.locator('.w-order').count(),19);
  await page.getByRole('button',{name:'Ver muestras 3D',exact:true}).click();assert.equal(await page.locator('.w-order').count(),11);
  assert.equal(new Set(await page.locator('.w-sample-image img').evaluateAll(items=>items.map(i=>i.src))).size,11);
  await page.locator('.w-order').filter({hasText:'Valeria Mamani'}).click();await page.locator('.p3-stage[data-status=ready]').waitFor();
  await page.getByRole('dialog').getByRole('button',{name:'Vista plana',exact:true}).click();assert.equal(await page.locator('.p3-flat img').count(),4);
  await page.getByRole('button',{name:'Cerrar pedido',exact:true}).click();
  await page.locator('.w-order').filter({hasText:'Invitación doble puerta'}).click();await page.locator('.p3-stage[data-status=ready]').waitFor();
  assert.equal(await page.locator('.p3-canvas-host').getAttribute('data-leaf-count'),'3');
  const publicWindow=app.waitForEvent('window',{timeout:20000});await page.getByRole('button',{name:'Mostrar al cliente',exact:true}).evaluate(button=>button.click());
  const guest=await publicWindow;await guest.locator('.p3-stage[data-status=ready]').waitFor();
  assert.equal(await guest.locator('.p3-canvas-host').getAttribute('data-leaf-count'),'3');await guest.getByRole('button',{name:'Abrir invitación',exact:true}).click();
  await guest.waitForFunction(()=>document.querySelector('.p3-stage')?.dataset.opening==='180');
  await guest.getByRole('button',{name:'Vista plana',exact:true}).click();assert.equal(await guest.locator('.p3-flat img').count(),6);
  assert.equal(await guest.evaluate(()=>typeof window.creativaAssistant),'undefined');await guest.close();
  console.log('PASS: doble puerta con seis caras presentada al cliente mediante IPC, sin datos privados.');
  await page.getByLabel('PIN local',{exact:true}).fill('31415926');await page.getByRole('button',{name:'Abrir espacio de trabajo',exact:true}).click();
  assert.equal(await page.locator('.w-order').count(),0);console.log('PASS: 19 pedidos, 11 estilos distintos y muestra díptica local en Electron; copia real intacta.');
 }

 await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click();await page.getByLabel('Cliente',{exact:true}).fill('Cliente prueba escritorio');await page.getByLabel('Tipo de trabajo').fill('Tarjetas');await page.getByLabel('Precio total (S/)').fill('25');await page.getByRole('button',{name:'Guardar pedido',exact:true}).click();await page.locator('.w-order').first().click();
 const inspector=page.getByRole('dialog');assert.equal(await page.getByRole('button',{name:'Abrir asistente',exact:true}).count(),1);assert.equal(await inspector.getByRole('button',{name:'Abrir asistente',exact:true}).count(),1);
 await inspector.locator('.w-order-checklist summary').click();await inspector.getByText('Falta adjuntar el archivo de impresión.',{exact:true}).waitFor();assert.equal(await page.getByRole('complementary',{name:'Asistente Creativa'}).count(),0);
 await inspector.getByRole('button',{name:'Ir a Diseños',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.dataset.assistantFocus),'design-upload');
 await inspector.getByRole('button',{name:'Abrir asistente',exact:true}).click();await page.getByLabel('Tu pregunta').fill('Consulta por continuar');await page.getByLabel('Tu pregunta').press('Escape');await page.waitForFunction(()=>document.activeElement.id==='creativa-assistant-launcher');
 await inspector.getByRole('button',{name:'Detalle',exact:true}).click();console.log('PASS: un acceso al asistente, revisión dentro del pedido sin chat y navegación con foco.');
 await page.getByRole('button',{name:'Imprimir recibo / PDF'}).click();assert.equal(await page.getByRole('button',{name:'Abrir asistente',exact:true}).count(),0);
 await page.getByRole('heading',{name:'Recibo de pedido',exact:true}).waitFor();
 const pdf=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.printToPDF({pageSize:'A4'})).toString('base64'));assert.equal(Buffer.from(pdf,'base64').subarray(0,5).toString(),'%PDF-');assert.ok(Buffer.from(pdf,'base64').length>2000);await writeFile(path.join(output,'prueba.pdf'),Buffer.from(pdf,'base64'));
 await page.locator('.w-print-controls').getByRole('button',{name:'Cerrar recibo',exact:true}).click();
 if(process.argv.includes('--tools')){
  await app.evaluate(()=>{
   const original=globalThis.fetch;
   globalThis.fetch=async(url,options)=>{
    if(String(url)==='http://127.0.0.1:11434/api/chat'){
     const data=JSON.parse(options.body);
     if(data.model!=='qwen3.5:4b'||data.messages[1].images?.length!==1)throw new Error('Solicitud multimodal inesperada.');
     return Response.json({done:true,message:{content:JSON.stringify({visibleText:'MARIA Y JOSE 20/12/2026',summary:'Revisión simulada en escritorio.',items:[{detail:'Revisar la fecha.',evidence:'20/12/2026'}]})}});
    }
    return original(url,options);
   };
  });
  await page.getByRole('button',{name:'Cerrar pedido',exact:true}).click();await page.getByRole('button',{name:'Abrir asistente'}).click();await page.locator('.a-engine summary').click();await page.getByRole('button',{name:'Herramientas de la imprenta'}).click();
  await page.getByLabel('Archivo local a revisar (opcional)').setInputFiles({name:'prueba.pdf',mimeType:'application/pdf',buffer:samplePdf()});
  await page.getByLabel('Estas son las medidas de impresión que quiero comprobar').check();await page.getByRole('button',{name:'Revisar antes de imprimir',exact:true}).click();
  await page.getByRole('heading',{name:'Revisión antes de imprimir',exact:true}).waitFor({timeout:30000});
  assert.match(await page.getByLabel('Resultado de herramienta').innerText(),/96\.0 × 56\.0 mm/);console.log('PASS: PDF local y worker bajo app://, revisión multimodal mediante IPC con modelo simulado.');
  await page.getByRole('button',{name:'Volver al chat'}).click();await page.getByRole('button',{name:'Minimizar chat'}).click();await page.locator('.w-order').first().click();
 }
 const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Presentación 3D',exact:true}).click();await dialog.getByRole('button',{name:'Cargar diseño de ejemplo',exact:true}).click();await dialog.getByText('Contiene imágenes de ejemplo.',{exact:true}).waitFor();await dialog.getByLabel('Superficie del papel',{exact:true}).selectOption('textured');await dialog.getByLabel('Acabado general',{exact:true}).selectOption('gloss');await dialog.getByRole('button',{name:'Guardar versión 3D',exact:true}).click();
 await dialog.getByLabel('Versión 3D guardada').getByRole('option',{name:/Versión 3D 1/}).waitFor({state:'attached'});
 console.log('PASS: vista 3D local guardada.');
 assert.equal(await page.evaluate(()=>typeof window.creativaPresentations?.open),'function');
 const newWindow=app.waitForEvent('window',{timeout:20000}).catch(error=>({error}));
 const showButton=dialog.getByRole('button',{name:'Mostrar al cliente',exact:true});
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Mostrar al cliente'&&!b.disabled));
 // La ventana de pruebas es invisible; activar el control evita depender del scroll de una ventana oculta.
 await showButton.evaluate(button=>button.click());
 const customer=await newWindow;
 if(customer.error){console.error('Presentación:',await page.locator('[role=alert]').allTextContents());console.error(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(w=>({id:w.id,url:w.webContents.getURL()}))));throw customer.error;}
 console.log('PASS: ventana de cliente creada.');
 await customer.locator('.p3-stage[data-status=ready]').waitFor();assert.equal(await customer.locator('.p3-stage canvas').count(),1);await page.getByRole('heading',{name:'Abrir mi espacio de trabajo',exact:true}).waitFor();
 const customerText=await customer.locator('body').innerText();assert.equal(customerText.includes('Cliente prueba escritorio'),false);assert.equal(customerText.includes('Caja'),false);
 assert.equal(await customer.evaluate(()=>typeof window.creativaPresentations),'undefined');assert.equal(await customer.evaluate(()=>typeof window.require),'undefined');assert.equal(await customer.evaluate(()=>typeof window.creativaCustomer.read),'function');
 assert.equal(await customer.evaluate(()=>typeof window.creativaAssistant),'undefined');
 assert.deepEqual(await customer.evaluate(async()=> (await indexedDB.databases()).map(d=>d.name)),[]);
 const isolation=await app.evaluate(({BrowserWindow})=>{const windows=BrowserWindow.getAllWindows(),client=windows.find(w=>w.webContents.getURL().includes('presentacion=')),staff=windows.find(w=>!w.webContents.getURL().includes('presentacion='));return {separate:client.webContents.session!==staff.webContents.session,memory:client.webContents.session.getStoragePath()===null,sandbox:client.webContents.getLastWebPreferences().sandbox};});
 assert.deepEqual(isolation,{separate:true,memory:true,sandbox:true});
 await assert.rejects(()=>page.evaluate(()=>window.creativaPresentations.open({schema:1,variants:[],total:25})),/no válida/);
 await customer.close();assert.equal(await page.getByRole('heading',{name:'Abrir mi espacio de trabajo',exact:true}).count(),1);
 // El perfil de prueba mantiene la ventana oculta; PDF y navegación ya verifican el render.
 await writeFile(path.join(output,'resultado.json'),JSON.stringify({result:'PASS',checks:['interfaz local Electron','sin red externa','cifrado y bloqueo de navegador disponibles','aislamiento y sandbox','CSP sin conexiones remotas','preparación local','PDF','vista WebGL con cuatro caras, papel texturado y acabado brillante','ventana de cliente con sesión temporal aislada y sin IndexedDB','rechazo de datos adicionales por IPC','bloqueo del espacio al presentar'],platform:process.platform},null,2));console.log('PASS: Electron local, cifrado, PDF, vista 3D y presentación aislada del cliente.');
}finally{await app.close();}
