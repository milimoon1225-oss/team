import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true}),output=new URL('../test-output/',import.meta.url),errors=[],checks=[];
const click=(page,name)=>page.getByRole('button',{name,exact:true}).click();
try {
  await mkdir(output,{recursive:true});const context=await browser.newContext({viewport:{width:1440,height:1080}});await context.route('https://**/*',route=>route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:5177/');
  await page.getByLabel('Elige un PIN local (6 a 12 dígitos)').fill('31415926');await page.getByLabel('Repite el PIN').fill('31415926');await click(page,'Preparar y comenzar');
  await click(page,'Nuevo pedido');await page.getByLabel('Cliente',{exact:true}).fill('Muestras de formatos');await page.getByLabel('Tipo de trabajo').fill('Invitaciones');await page.getByLabel('Precio total (S/)').fill('100');await click(page,'Guardar pedido');await page.locator('.w-order').first().click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Presentación 3D',exact:true}).click();
  const models=[['bifold',4,2],['invitation',2,1],['trifold',6,3],['gatefold',6,3]];
  for(const [index,[model,faces,leaves]] of models.entries()) {
    await dialog.getByLabel('Modelo 3D',{exact:true}).selectOption(model);await click(page,'Cargar diseño de ejemplo');await page.locator('.p3-stage[data-status=ready]').waitFor();
    await page.waitForFunction(expected=>document.querySelector('.p3-canvas-host')?.dataset.leafCount===String(expected),leaves);
    await click(page,'Guardar versión 3D');await dialog.getByLabel('Versión 3D guardada').getByRole('option',{name:new RegExp(`Versión 3D ${index+1} ·`)}).waitFor({state:'attached'});
    await page.waitForFunction(()=>!document.querySelector('[aria-label="Modelo 3D"]').disabled);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('.p3-stage[data-status=ready]').waitFor();const revision=await page.locator('.p3-canvas-host').getAttribute('data-texture-revision');
    if(model!=='invitation') {
      await click(page,'Cerrar invitación');await page.waitForFunction(()=>document.querySelector('.p3-stage').dataset.opening==='0');
      await page.locator('.p3-stage').screenshot({path:new URL(`formato-${model}-cerrado.png`,output).pathname});
      await click(page,'Abrir invitación');await page.waitForFunction(()=>document.querySelector('.p3-stage').dataset.opening==='180');
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await page.locator('.p3-canvas-host').getAttribute('data-texture-revision'),revision);
      await page.locator('.p3-stage').screenshot({path:new URL(`formato-${model}-abierto.png`,output).pathname});
    }else assert.equal(await dialog.getByRole('button',{name:'Abrir invitación',exact:true}).count(),0);
    await click(page,'Vista plana');assert.equal(await dialog.locator('.p3-flat img').count(),faces);
    assert.equal(new Set(await dialog.locator('.p3-flat img').evaluateAll(items=>items.map(item=>item.src))).size,faces);
    await click(page,'Vista 3D');await page.locator('.p3-stage[data-status=ready]').waitFor();checks.push(`${model}: ${faces} caras y ${leaves} hojas; guardado, carga y apertura sin reconstruir texturas`);
  }
  await click(page,'Cerrar pedido');await click(page,'Bloquear espacio');await context.setOffline(true);await page.reload();await page.getByLabel('PIN local',{exact:true}).fill('31415926');await click(page,'Abrir espacio de trabajo');await page.locator('.w-order').first().click();await dialog.getByRole('button',{name:'Presentación 3D',exact:true}).click();await page.locator('.p3-stage[data-status=ready]').waitFor();
  await page.waitForFunction(()=>document.querySelector('[aria-label="Modelo 3D"]').value==='gatefold'&&!document.querySelector('[aria-label="Modelo 3D"]').disabled);await page.locator('.p3-stage[data-status=ready]').waitFor();assert.equal(await dialog.getByLabel('Modelo 3D',{exact:true}).inputValue(),'gatefold');await dialog.getByLabel('Versión 3D guardada').selectOption({index:1});await page.waitForFunction(()=>document.querySelector('[aria-label="Modelo 3D"]').value==='bifold');await page.locator('.p3-stage[data-status=ready]').waitFor();
  checks.push('recuperación del respaldo local al reiniciar sin red; versiones anteriores de díptico disponibles');assert.deepEqual(errors,[]);await writeFile(new URL('formats-result.json',output),JSON.stringify({result:'PASS',checks},null,2));console.log(checks.join('\n'));await context.close();
}catch(error){console.error('Errores:',errors);for(const ctx of browser.contexts())for(const page of ctx.pages())console.error((await page.locator('body').innerText()).slice(-3500));throw error;}finally{await browser.close();}
