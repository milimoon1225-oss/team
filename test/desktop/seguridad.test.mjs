import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import seguridad from '../../desktop/seguridad.cjs';
const { archivoLocal, enlaceExternoPermitido, esLocal, CSP } = seguridad;

test('solo sirve archivos dentro de la interfaz empaquetada', () => {
  const raiz = path.resolve('web');
  assert.equal(archivoLocal('app://creativa/', raiz), path.join(raiz, 'index.html'));
  assert.equal(archivoLocal('app://creativa/assets/app.js', raiz), path.join(raiz, 'assets', 'app.js'));
  for (const url of ['file:///C:/Windows/win.ini', 'app://otro/index.html', 'app://usuario@creativa/', 'app://creativa:55/', 'app://creativa/%2e%2e%5csecret.txt', 'app://creativa/%2e%2e%2fsecret.txt', 'app://creativa/C%3a/Windows/win.ini', 'app://creativa/%00']) assert.equal(archivoLocal(url, raiz), null, url);
});

test('edición local no abre enlaces ni ejecutables externos', () => {
  for (const url of ['https://wa.me/51987654321', 'tel:+51987654321', 'javascript:alert(1)', 'file:///C:/Windows/notepad.exe', 'cmd://calc', 'https://example.com/']) assert.equal(enlaceExternoPermitido(url), false, url);
});

test('política de contenido impide scripts remotos e inserciones', () => {
  assert.equal(esLocal('https://creativa/'), false);
  assert.ok(CSP.includes("script-src 'self'"));
  assert.ok(!CSP.includes('unsafe-eval'));
  assert.ok(CSP.includes("object-src 'none'"));
  assert.ok(CSP.includes("frame-src 'none'"));
});
