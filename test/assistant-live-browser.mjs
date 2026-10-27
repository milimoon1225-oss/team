// Prueba optativa del navegador contra Ollama real; no usa registros del usuario.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5177/');
  await page.getByLabel('Elige un PIN local (6 a 12 dígitos)').fill('31415926');
  await page.getByLabel('Repite el PIN').fill('31415926');
  await page.getByRole('button', { name: 'Preparar y comenzar' }).click();
  await page.getByRole('button', { name: 'Abrir asistente', exact: true }).click();
  await page.getByLabel('Tu pregunta').fill('¿Cuáles pedidos debería entregar hoy según tus registros?');
  await page.getByRole('button', { name: 'Consultar al asistente' }).click();
  await page.getByRole('heading', { name: /0 pedidos pendientes/ }).waitFor({ timeout: 100000 });
  await page.getByText('Qwen3.5 · IA local · Ver detalle', { exact: true }).waitFor();
  await page.getByText('Qwen3.5 · IA local · Ver detalle', { exact: true }).click();
  assert.match(await page.getByLabel('Resultado del asistente').innerText(), /Entrega hoy/);
  console.log('PASS: navegador → Ollama Qwen3.5:4b real → consulta autorizada con evidencia; sin API cloud.');
} finally { await browser.close(); }
