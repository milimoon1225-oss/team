import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import seguridad from '../seguridad.cjs';
const { archivoLocal, enlaceExternoPermitido, esLocal, CSP } = seguridad;

test('solo sirve archivos dentro de la interfaz empaquetada', () => {
  const raiz = path.resolve('web');
  assert.equal(archivoLocal('app://creativa/', raiz), path.join(raiz, 'index.html'));
  assert.equal(archivoLocal('app://creativa/assets/app.js', raiz), path.join(raiz, 'assets', 'app.js'));
  for (const url of ['file:///C:/Windows/win.ini', 'app://otro/index.html', 'app://usuario@creativa/', 'app://creativa:55/', 'app://creativa/%2e%2e%5csecret.txt', 'app://creativa/%2e%2e%2fsecret.txt', 'app://creativa/C%3a/Windows/win.ini', 'app://creativa/%00']) assert.equal(archivoLocal(url, raiz), null, url);
});

test('enlaces externos limitados a WhatsApp, adjuntos firmados y teléfonos', () => {
  for (const url of ['https://wa.me/51987654321?text=Hola%20Mila', 'https://chat.whatsapp.com/abc', 'tel:+51987654321', 'https://mtsvbkncnnvzqnkhzrwz.supabase.co/storage/v1/object/sign/referencias/a?token=public']) assert.equal(enlaceExternoPermitido(url), true, url);
  for (const url of ['javascript:alert(1)', 'file:///C:/Windows/notepad.exe', 'cmd://calc', 'http://wa.me/1', 'https://wa.me.ejemplo.com/', 'https://wa.me@ejemplo.com/', 'https://example.com/', 'https://wa.me:8443/', 'tel:+51?foo=x', 'tel:+51\ncalc', 'https://mtsvbkncnnvzqnkhzrwz.supabase.co/rest/v1/trabajos']) assert.equal(enlaceExternoPermitido(url), false, url);
});

test('política de contenido impide scripts remotos e inserciones', () => {
  assert.equal(esLocal('https://creativa/'), false);
  assert.ok(CSP.includes("script-src 'self'"));
  assert.ok(!CSP.includes('unsafe-eval'));
  assert.ok(CSP.includes("object-src 'none'"));
  assert.ok(CSP.includes("frame-src 'none'"));
});
