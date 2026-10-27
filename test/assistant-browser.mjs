import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true });
const output = new URL('../test-output/', import.meta.url);
const checks = [], errors = [];
const click = async (page, name) => { if(name === 'Abrir asistente' && await page.getByRole('button', {name:'Minimizar chat',exact:true}).isVisible()) return; return page.getByRole('button', { name, exact: true }).last().click(); };
async function vault(page) { return page.evaluate(() => new Promise((resolve, reject) => { const open = indexedDB.open('creativa-operaciones-v2', 1); open.onsuccess = () => { const db = open.result; const get = db.transaction('vault').objectStore('vault').get('main'); get.onsuccess = () => { resolve(get.result); db.close(); }; get.onerror = reject; }; open.onerror = reject; })); }
try {
  await mkdir(output, { recursive: true });
  const context = await browser.newContext(); await context.route('https://**/*', route => route.abort());
  let hang = false, requests = 0;
  await context.route('http://127.0.0.1:11434/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' } });
    if (route.request().url().endsWith('/tags')) return route.fulfill({ json: { models: [{ name: 'qwen3.5:4b' }] } });
    requests++; const body = route.request().postDataJSON(); assert.equal(body.model, 'qwen3.5:4b'); assert.equal(body.messages.length, 2); assert.ok(!JSON.stringify(body).includes('Cliente real'));
    if (hang) await new Promise(r => setTimeout(r, 1000));
    try { await route.fulfill({ json: { done: true, message: { content: JSON.stringify({ tool: 'pending', term: '', day: 'any' }) } } }); } catch { /* Cancelación al bloquear. */ }
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message)); await page.goto('http://127.0.0.1:5177/');
  await page.getByLabel('Nombre del responsable').fill('Ana Torres');
  await page.getByLabel('Elige un PIN local (6 a 12 dígitos)').fill('31415926'); await page.getByLabel('Repite el PIN').fill('31415926'); await click(page, 'Preparar y comenzar');
  await click(page, 'Nuevo pedido'); await page.getByLabel('Cliente', { exact: true }).fill('Cliente real'); await page.getByLabel('Tipo de trabajo').fill('Invitaciones florales'); await page.getByLabel('Precio total (S/)').fill('100'); await click(page, 'Guardar pedido'); await page.locator('.w-order').waitFor();
  await click(page, 'Abrir asistente'); await page.getByText('Hola, Ana 👋', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Pedidos', exact: true }).waitFor();
  await click(page, '¿Qué falta para imprimir?'); await page.getByText('Falta adjuntar el archivo de impresión.', { exact: true }).last().waitFor(); assert.equal(requests, 0);
  await click(page, 'Adjuntar diseño'); const order = page.getByRole('dialog', { name: 'Cliente real' }); await order.waitFor();
  assert.equal(await order.getByRole('button', { name: 'Diseños', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.assistantFocus), 'design-upload');
  await order.locator('input[type=file]').setInputFiles({ name: 'diseño.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nArchivo de prueba\n%%EOF') }); await order.getByText('Versión 1: diseño.pdf').waitFor();
  await click(page, 'Abrir asistente'); await page.getByLabel('Tu pregunta').fill('¿Qué falta?'); await click(page, 'Consultar al asistente');
  await click(page, 'Revisar aprobación'); await order.waitFor(); assert.equal(await page.evaluate(() => document.activeElement.dataset.assistantFocus), 'design-approval');
  await order.getByLabel('Nombre del cliente que confirmó').fill('Cliente real'); await order.getByRole('button', { name: 'Registrar aprobación de la última versión' }).click(); await order.getByText(/Última versión aprobada/).waitFor(); await click(page, 'Cerrar pedido');
  checks.push('chat contextual sin cambiar la página; acciones abren Diseños y Aprobación y enfocan el campo correcto');
  await click(page, 'Reportes'); await click(page, 'Abrir asistente'); await page.getByText('Estás en Reportes', { exact: true }).waitFor();
  await page.getByLabel('Tu pregunta').fill('Llévame a caja'); await click(page, 'Consultar al asistente'); await page.getByRole('heading', { name: 'Caja', exact: true }).waitFor();
  await click(page, 'Abrir asistente'); assert.match(await page.getByRole('log').innerText(), /Llévame a caja/);
  await page.getByLabel('Tu pregunta').fill('¿Cuáles debería entregar según tus registros?'); await click(page, 'Consultar al asistente'); await page.getByText('Qwen3.5 · IA local · Ver detalle', { exact: true }).waitFor(); assert.equal(requests, 1);
  checks.push('conversación conservada entre pantallas y navegación escrita a Caja; IA local simulada recibe solo la pregunta');
  hang = true; await page.getByLabel('Tu pregunta').fill('¿Cuáles serían los encargos aún por entregar?'); await click(page, 'Consultar al asistente'); await page.getByRole('button', { name: 'Cancelar consulta' }).waitFor();
  await click(page, 'Bloquear espacio'); await page.getByLabel('PIN local', { exact: true }).waitFor(); await page.reload(); await page.getByLabel('PIN local', { exact: true }).fill('31415926'); await click(page, 'Abrir espacio de trabajo'); await click(page, 'Abrir asistente');
  assert.equal(await page.getByLabel('Tu pregunta').inputValue(), ''); assert.equal(await page.getByLabel('Resultado del asistente').count(), 0);
  await context.setOffline(true); await click(page, 'Ver pendientes'); await page.getByRole('heading', { name: /1 pedido pendiente/ }).waitFor(); await click(page, 'Minimizar chat');
  checks.push('cancelación y borrado de conversación al bloquear; consultas rápidas sin internet');
  const beforeDemo = await vault(page); await click(page, 'Configuración'); await click(page, 'Explorar demostración'); await page.getByText('Modo demostración · Datos ficticios', { exact: true }).waitFor(); assert.equal(await page.locator('.w-order').count(), 19);
  for (const name of ['Producción', 'Clientes', 'Caja', 'Reportes', 'Sincronización', 'Configuración', 'Nuevo pedido', 'Pedidos']) {
    await click(page, name); await page.getByRole('heading', { name, exact: true }).waitFor();
    if (name === 'Clientes') assert.ok(await page.locator('main details').count() >= 7);
    if (name === 'Caja') assert.ok(await page.locator('main .w-row').count() > 5);
    if (name === 'Reportes') assert.equal(await page.locator('tbody tr').count(), 18); // El reporte excluye el pedido anulado.
    if (name === 'Nuevo pedido') assert.equal(await page.getByLabel('Cliente', { exact: true }).inputValue(), 'Cliente de demostración');
  }
  await page.locator('.w-order').filter({ hasText: 'Valeria Mamani' }).first().click(); await page.getByRole('dialog').getByRole('button', { name: 'Presentación 3D', exact: true }).click();
  await page.getByLabel('Versión 3D guardada').getByRole('option', { name: /Versión 3D 1/ }).waitFor({ state: 'attached' });
  await page.locator('.p3-stage[data-status=ready]').waitFor(); await page.screenshot({ path: new URL('demo-vista3d.png', output).pathname }); await click(page, 'Cerrar pedido');
  await click(page, 'Abrir asistente'); await click(page, '¿Qué falta para imprimir?'); await page.getByRole('heading', { name: /bloqueos registrados/ }).waitFor();
  await page.screenshot({ path: new URL('chat-creativa.png', output).pathname });
  await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: new URL('chat-creativa-movil.png', output).pathname }); await click(page, 'Minimizar chat');
  await click(page, 'Salir de demostración'); await page.getByLabel('PIN local', { exact: true }).waitFor(); assert.deepEqual(await vault(page), beforeDemo);
  await page.getByLabel('PIN local', { exact: true }).fill('31415926'); await click(page, 'Abrir espacio de trabajo'); await page.getByRole('heading', { name: 'Pedidos', exact: true }).waitFor(); assert.equal(await page.locator('.w-order').count(), 1); assert.ok(!(await page.locator('body').innerText()).includes('Valeria Mamani'));
  checks.push('demostración con diecinueve pedidos, caja, reportes, clientes y 3D precargado; móvil sin desbordamiento; copia real intacta al salir');
  const emptyContext = await browser.newContext(); const empty = await emptyContext.newPage(); empty.on('pageerror', e => errors.push(e.message)); await empty.goto('http://127.0.0.1:5177/'); await click(empty, 'Explorar demostración'); await empty.locator('.w-order').first().waitFor();
  assert.equal(await vault(empty), undefined); await click(empty, 'Salir de demostración'); await empty.getByRole('heading', { name: 'Preparar esta computadora', exact: true }).waitFor(); await emptyContext.close();
  checks.push('demostración desde el inicio sin PIN ni creación de una copia persistente');
  assert.deepEqual(errors, []); await writeFile(new URL('assistant-result.json', output), JSON.stringify({ result: 'PASS', checks }, null, 2)); console.log(checks.join('\n')); await context.close();
} catch (error) {
  console.error('Errores de página:', errors);
  for (const ctx of browser.contexts()) for (const page of ctx.pages()) console.error('Estado de la prueba:', (await page.locator('body').innerText()).slice(-3500));
  throw error;
} finally { await browser.close(); }
