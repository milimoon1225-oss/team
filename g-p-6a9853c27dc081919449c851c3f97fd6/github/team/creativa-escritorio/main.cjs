const { app, BrowserWindow, Menu, protocol, session, shell, dialog } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { APP_ORIGIN, CSP, esLocal, enlaceExternoPermitido, archivoLocal } = require('./seguridad.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

app.setName('Creativa Impresos');
// Una actualización o reinstalación mantiene la sesión y los registros locales.
app.setPath('userData', !app.isPackaged && process.env.CREATIVA_TEST_USER_DATA
  ? process.env.CREATIVA_TEST_USER_DATA
  : path.join(app.getPath('appData'), 'Creativa-Impresos'));

const esPrueba = !app.isPackaged && process.env.CREATIVA_TEST_USER_DATA;
const bloqueo = esPrueba || app.requestSingleInstanceLock();
let ventana;

async function abrirExterno(url) {
  if (!enlaceExternoPermitido(url)) return;
  try { await shell.openExternal(url); }
  catch { if (ventana) await dialog.showMessageBox(ventana, { type: 'info', title: 'Abrir enlace', message: 'Windows no pudo abrir el enlace.', detail: 'Comprueba que tengas un navegador o una aplicación de llamadas configurada.' }); }
}

async function registrarProtocolo() {
  const raiz = path.join(__dirname, 'web');
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
  protocol.handle('app', async request => {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Método no permitido', { status: 405 });
    const archivo = archivoLocal(request.url, raiz);
    if (!archivo) return new Response('No permitido', { status: 403 });
    try {
      const real = await fs.realpath(archivo);
      const relativa = path.relative(await fs.realpath(raiz), real);
      if (relativa.startsWith('..') || path.isAbsolute(relativa)) return new Response('No permitido', { status: 403 });
      const tipo = tipos[path.extname(real).toLowerCase()];
      if (!tipo || !(await fs.stat(real)).isFile()) return new Response('No encontrado', { status: 404 });
      const cuerpo = request.method === 'HEAD' ? null : await fs.readFile(real);
      return new Response(cuerpo, { headers: {
        'Content-Type': tipo,
        'Content-Security-Policy': CSP,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      } });
    } catch { return new Response('No encontrado', { status: 404 }); }
  });
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280, height: 860, minWidth: 760, minHeight: 600,
    title: 'Creativa Impresos', backgroundColor: '#f5f7fa', show: false,
    icon: path.join(__dirname, 'web', 'brand', 'creativa-logo.png'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, allowRunningInsecureContent: false, devTools: !app.isPackaged, spellcheck: false }
  });
  ventana.once('ready-to-show', () => { if (!esPrueba) ventana.show(); });
  ventana.webContents.setWindowOpenHandler(({ url }) => { void abrirExterno(url); return { action: 'deny' }; });
  ventana.webContents.on('will-navigate', (event, url) => {
    if (!esLocal(url)) { event.preventDefault(); void abrirExterno(url); }
  });
  ventana.webContents.on('will-redirect', (event, url) => { if (!esLocal(url)) event.preventDefault(); });
  ventana.webContents.on('will-attach-webview', event => event.preventDefault());
  ventana.on('closed', () => { ventana = null; });
  void ventana.loadURL(`${APP_ORIGIN}/`);
}

if (!bloqueo) app.quit();
else {
  app.on('second-instance', () => { if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); } });
  app.whenReady().then(async () => {
    // Copiar resúmenes de pedidos es la única capacidad extra que requiere la interfaz.
    session.defaultSession.setPermissionRequestHandler((contents, permiso, responder) => responder(contents === ventana?.webContents && esLocal(contents.getURL()) && permiso === 'clipboard-sanitized-write'));
    session.defaultSession.setPermissionCheckHandler((contents, permiso, origen) => contents === ventana?.webContents && esLocal(origen) && permiso === 'clipboard-sanitized-write');
    await registrarProtocolo();
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Archivo', submenu: [{ role: 'quit', label: 'Salir de Creativa' }] },
      { label: 'Edición', submenu: [{ role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' }, { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' }] },
      { label: 'Vista', submenu: [{ role: 'resetZoom', label: 'Tamaño normal' }, { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' }] },
      { label: 'Ayuda', submenu: [{ label: 'Acerca de Creativa', click: () => dialog.showMessageBox(ventana, { type: 'info', title: 'Creativa Impresos', message: `Creativa Impresos · ${app.getVersion()}`, detail: 'Aplicación de escritorio del equipo. Usa las mismas cuentas y pedidos de la versión web. La sincronización con el equipo necesita internet.' }) }] }
    ]));
    crearVentana();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) crearVentana(); });
  }).catch(error => { console.error('No se pudo iniciar Creativa:', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
