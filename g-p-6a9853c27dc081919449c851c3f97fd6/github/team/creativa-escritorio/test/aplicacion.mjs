import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(raiz, 'test-output');
await mkdir(salida, { recursive: true });
const perfil = path.join(salida, `perfil-${Date.now()}`);
const opciones = { executablePath: path.join(raiz, 'node_modules/electron/dist/electron.exe'), args: [raiz], cwd: raiz, env: { ...process.env, CREATIVA_TEST_USER_DATA: perfil }, timeout: 60000 };
let app;
try {
  app = await electron.launch(opciones);
  const contexto = app.context();
  // Ninguna prueba toca cuentas o registros reales.
  await contexto.route('https://**/*', route => route.abort());
  const pagina = await app.firstWindow();
  await pagina.getByRole('heading', { name: '¡Qué bueno verte!' }).waitFor();
  assert.equal(await pagina.evaluate(() => window.isSecureContext), true);
  assert.equal(await pagina.evaluate(() => typeof window.require), 'undefined');
  assert.equal(await pagina.evaluate(() => typeof window.process), 'undefined');
  assert.equal(await pagina.evaluate(() => !!navigator.locks && !!crypto.subtle && !!indexedDB), true);
  assert.equal(await pagina.locator('.mila-brand-logo').evaluate(img => img.complete && img.naturalWidth > 0), true);
  const preferencias = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  assert.equal(preferencias.contextIsolation, true);
  assert.equal(preferencias.sandbox, true);
  assert.equal(preferencias.nodeIntegration, false);
  assert.equal(await pagina.evaluate(() => fetch('app://creativa/%2e%2e%2fpackage.json').then(r => r.status)), 403);
  assert.equal(await pagina.evaluate(() => fetch('app://creativa/package.json').then(r => r.status)), 404);
  await pagina.evaluate(() => { localStorage.setItem('prueba-escritorio', 'conservado'); });
  const pdf = await app.evaluate(async ({ BrowserWindow }) => {
    const datos = await BrowserWindow.getAllWindows()[0].webContents.printToPDF({ printBackground: false, pageSize: 'A4' });
    return datos.toString('base64');
  });
  assert.ok(Buffer.from(pdf, 'base64').subarray(0, 5).toString() === '%PDF-');
  await writeFile(path.join(salida, 'prueba-motor-impresion.pdf'), Buffer.from(pdf, 'base64'));
  await app.close();
  app = await electron.launch(opciones);
  await app.context().route('https://**/*', route => route.abort());
  const segunda = await app.firstWindow();
  await segunda.getByRole('heading', { name: '¡Qué bueno verte!' }).waitFor();
  assert.equal(await segunda.evaluate(() => localStorage.getItem('prueba-escritorio')), 'conservado');
  console.log('PASS: ventana local sin red, aislamiento, rutas restringidas, recursos, persistencia y motor PDF. No se probaron impresoras físicas ni acceso real.');
} finally { if (app) await app.close(); }
