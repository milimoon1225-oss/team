// Integración con el paquete real. --real-model exige Ollama y Qwen3.5:4b reales.
import { _electron as electron, chromium } from 'playwright';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { sampleImage } from '../tool-fixtures.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const executable=process.env.CREATIVA_PACKAGED_EXE || path.join(root,'release',process.platform==='win32'?'win-unpacked/Creativa Operaciones.exe':'linux-unpacked/creativa-operaciones');
const real=process.argv.includes('--real-model');
const output=path.join(root,'test-output',`paquete-${process.platform}-${Date.now()}`);
await mkdir(output,{recursive:true});
const profile=path.join(output,'perfil-temporal');
const env={...process.env,CREATIVA_TEST_USER_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
const args=['--creativa-autoprueba',...(process.platform==='linux'?['--no-sandbox','--ozone-platform=headless','--enable-unsafe-swiftshader']:[])];
const report={at:new Date().toISOString(),platform:process.platform,executable,realModel:real,checks:[]};
let app;
const portable=/-Portable[.]exe$/i.test(executable);
async function launch() {
  if(!portable)return electron.launch({executablePath:executable,args,env,timeout:60000});
  await mkdir(profile,{recursive:true});
  for(const name of ['DevToolsActivePort','creativa-autoprueba.json'])await rm(path.join(profile,name),{force:true});
  let logs='',failure;
  const child=spawn(executable,[...args,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1'],{env,stdio:['ignore','pipe','pipe']});
  child.on('error',error=>{failure=error;});
  for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{logs=(logs+data.toString()).slice(-8000);});
  let browser,identity;
  for(let attempt=0;attempt<240;attempt++) {
    if(failure)throw failure;
    try {
      const port=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];
      identity=JSON.parse(await readFile(path.join(profile,'creativa-autoprueba.json'),'utf8'));
      browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:1000});break;
    }catch{await delay(250);}
  }
  if(!browser){child.kill();throw new Error(`El portable no abrió su sesión de prueba. ${logs}`);}
  return {
    identity,
    context:()=>browser.contexts()[0],
    firstWindow:async()=>{for(let i=0;i<120;i++){const page=browser.contexts()[0]?.pages().find(p=>p.url().startsWith('app://creativa'));if(page)return page;await delay(250);}throw new Error('El portable no abrió su ventana.');},
    close:async()=>{
      for(const page of browser.contexts()[0]?.pages()||[]){try{await page.evaluate(()=>window.close());}catch{/* La ventana ya puede haberse cerrado. */}}
      await browser.close();
      for(let i=0;i<40&&child.exitCode===null;i++)await delay(250);
      if(child.exitCode===null)child.kill();
    },
  };
}
try {
  app=await launch();
  const identity=app.identity || await app.evaluate(({app})=>({packaged:app.isPackaged,version:app.getVersion(),appPath:app.getAppPath(),profile:app.getPath('userData')}));
  assert.equal(identity.packaged,true);assert.equal(path.resolve(identity.profile),path.resolve(profile));assert.match(identity.appPath,/app\.asar$/);
  report.app=identity;report.executableSha256=createHash('sha256').update(await readFile(executable)).digest('hex');report.asarSha256=createHash('sha256').update(await readFile(identity.appPath)).digest('hex');
  const page=await app.firstWindow();page.setDefaultTimeout(30000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await app.context().setOffline(true); // Sin internet en las pantallas; Ollama se consulta desde el proceso principal.
  await page.getByRole('heading',{name:'Preparar esta computadora',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  await page.getByLabel('Elige un PIN local (6 a 12 dígitos)').fill('31415926');await page.getByLabel('Repite el PIN').fill('31415926');
  await page.getByRole('button',{name:'Preparar y comenzar',exact:true}).click();await page.getByRole('heading',{name:'Pedidos',exact:true}).waitFor();
  await page.getByRole('button',{name:'Abrir asistente',exact:true}).click();
  await page.getByRole('button',{name:'Ver pendientes',exact:true}).click();await page.getByRole('heading',{name:/0 pedidos pendientes/}).last().waitFor();
  report.checks.push('Paquete real, perfil aislado, sandbox y consulta rápida sin internet');
  if(real) {
    const start=Date.now();
    await page.locator('.a-engine summary').click();await page.getByRole('button',{name:'Comprobar modelo local',exact:true}).click();
    await page.getByText(/Qwen3\.5:4b respondió correctamente/).first().waitFor({timeout:180000});
    report.checks.push({test:'Diagnóstico visible con inferencia real mediante IPC',milliseconds:Date.now()-start});console.log('PASS: diagnóstico visible con respuesta real.');
    const interpreted=await page.evaluate(async()=>window.creativaAssistant.request({id:crypto.randomUUID(),action:'interpret',question:'Pedidos pendientes de mañana',model:'qwen3.5:4b'}));
    assert.equal(interpreted.ok,true,interpreted.error);assert.equal(interpreted.value.tool,'pending');assert.equal(interpreted.value.day,'tomorrow');
    report.checks.push({test:'Clasificación real de pregunta',result:interpreted.value});
    await page.getByLabel('Tu pregunta').fill('Crea un encargo: Soy Rosa Mamani. Necesito 150 invitaciones florales. Todavía no confirmé fecha ni precio.');
    await page.getByRole('button',{name:'Consultar al asistente',exact:true}).click();
    await page.getByRole('heading',{name:'Propuesta de encargo',exact:true}).waitFor({timeout:180000});
    const proposed={client:await page.getByLabel('Propuesta: Cliente',{exact:true}).inputValue(),qty:await page.getByLabel('Propuesta: Cantidad',{exact:true}).inputValue(),delivery:await page.getByLabel('Propuesta: Entrega (AAAA-MM-DDTHH:mm)',{exact:true}).inputValue()};
    assert.match(proposed.client,/Rosa/i);assert.equal(proposed.qty,'150');assert.equal(proposed.delivery,'');
    report.checks.push({test:'Mensaje ficticio convertido en propuesta sin inventar fecha',result:proposed});
    console.log('PASS: diagnóstico, clasificación y encargo con Qwen real en app.asar.');
    const image=await sampleImage(page,'MARIA Y JOSE','20/12/2025');
    await page.getByLabel('Archivo para el asistente',{exact:true}).setInputFiles({name:'invitacion-de-prueba.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
    await page.getByLabel('Tu pregunta').fill('Revisa este diseño');await page.getByRole('button',{name:'Consultar al asistente',exact:true}).click();
    await page.getByRole('heading',{name:'Revisión antes de imprimir',exact:true}).waitFor({timeout:180000});
    const visual=page.getByLabel('Resultado de herramienta').filter({has:page.getByRole('heading',{name:'Revisión antes de imprimir',exact:true})});
    const observed=await visual.locator('textarea').first().inputValue();assert.match(observed,/2025/,'La lectura visual debe recuperar la fecha de la imagen.');
    report.checks.push({test:'Revisión visual real de imagen adjunta',observed});
    await page.screenshot({path:path.join(output,'asistente-real.png'),timeout:5000}).catch(error=>{report.screenshotNote=error.message;});
    console.log('PASS: imagen de prueba leída por Qwen real dentro del paquete.');
  }
  await assert.rejects(()=>page.evaluate(()=>window.creativaAssistant.request({id:crypto.randomUUID(),action:'verify',url:'https://example.com'})),/no válida/);
  assert.deepEqual(errors,[]);await app.close();app=null;
  app=await launch();const reopened=await app.firstWindow();
  await reopened.getByRole('heading',{name:'Abrir mi espacio de trabajo',exact:true}).waitFor();
  await reopened.getByLabel('PIN local',{exact:true}).fill('31415926');await reopened.getByRole('button',{name:'Abrir espacio de trabajo',exact:true}).click();
  await reopened.getByRole('heading',{name:'Pedidos',exact:true}).waitFor();
  report.checks.push('Reinicio del paquete y reapertura del perfil cifrado');report.result='PASS';
  console.log('PASS: paquete real y persistencia tras reinicio.');
} catch(error) {
  report.result='FAIL';report.error=error.stack;
  if(app) {try {const page=await app.firstWindow();report.visibleError=(await page.locator('body').innerText()).slice(-5000);await page.screenshot({path:path.join(output,'fallo.png'),timeout:5000}).catch(()=>{});}catch{/* El proceso podría haber terminado. */}}
  process.exitCode=1;console.error(error);
} finally {
  if(app)await app.close();
  await writeFile(path.join(output,'resultado.json'),JSON.stringify(report,null,2));
  console.log('Evidencia:',output);
}
