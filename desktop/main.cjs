const { app, BrowserWindow, Menu, protocol, session, shell, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { validarPresentacion } = require('./presentaciones.cjs');
const { crearAsistente } = require('./asistente.cjs');
const presentaciones = new Map();
const { APP_ORIGIN, CSP, esLocal, enlaceExternoPermitido, archivoLocal } = require('./seguridad.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

app.setName('Creativa Operaciones');
// Una actualización o reinstalación mantiene la sesión y los registros locales.
app.setPath('userData', !app.isPackaged && process.env.CREATIVA_TEST_USER_DATA
  ? process.env.CREATIVA_TEST_USER_DATA
  : path.join(app.getPath('appData'), 'Creativa-Operaciones'));

const esPrueba = !app.isPackaged && process.env.CREATIVA_TEST_USER_DATA;
const bloqueo = esPrueba || app.requestSingleInstanceLock();
let ventana;
const asistente = crearAsistente({
  autorizado: event => event.sender === ventana?.webContents && event.senderFrame === event.sender.mainFrame && esLocal(event.sender.getURL()),
  getClient: async () => (await import('../src/infrastructure/assistant/ollama-client.js')).createOllamaClient(),
});

async function abrirExterno(url) {
  if (!enlaceExternoPermitido(url)) return;
  try { await shell.openExternal(url); }
  catch { if (ventana) await dialog.showMessageBox(ventana, { type: 'info', title: 'Abrir enlace', message: 'Windows no pudo abrir el enlace.', detail: 'Comprueba que tengas un navegador o una aplicación de llamadas configurada.' }); }
}

async function registrarProtocolo(sesion = session.defaultSession) {
  const raiz = path.join(__dirname, '..', 'dist');
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };
  sesion.protocol.handle('app', async request => {
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

async function abrirPresentacion(event, value) {
  if(event.sender!==ventana?.webContents || event.senderFrame!==event.sender.mainFrame || !esLocal(event.sender.getURL()))throw new Error('Ventana no autorizada.');
  validarPresentacion(value);
  const sesion=session.fromPartition(`creativa-presentacion-${randomUUID()}`);
  sesion.setPermissionRequestHandler((_contents,_permission,answer)=>answer(false));
  sesion.setPermissionCheckHandler(()=>false);
  sesion.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,answer)=>answer({cancel:true}));
  await registrarProtocolo(sesion);
  const customer=new BrowserWindow({width:1200,height:860,minWidth:640,minHeight:500,title:'Creativa · Presentación',backgroundColor:'#eef2eb',show:!esPrueba,
    webPreferences:{session:sesion,preload:path.join(__dirname,'customer-preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true,devTools:!app.isPackaged}});
  presentaciones.set(customer.webContents.id,{window:customer,value});
  customer.removeMenu();customer.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  customer.webContents.on('will-navigate',event=>event.preventDefault());
  customer.webContents.on('will-redirect',event=>event.preventDefault());
  customer.webContents.on('will-attach-webview',event=>event.preventDefault());
  const id=customer.webContents.id;customer.on('closed',()=>{presentaciones.delete(id);void sesion.clearStorageData();});
  try{await customer.loadURL(`${APP_ORIGIN}/?presentacion=local#cliente`);}catch(error){customer.destroy();throw error;}
  return true;
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280, height: 860, minWidth: 760, minHeight: 600,
    title: 'Creativa Impresos', backgroundColor: '#f5f7fa', show: false,
    icon: path.join(__dirname, '..', 'dist', 'brand', 'app-512.png'),
    webPreferences: { preload: path.join(__dirname,'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, allowRunningInsecureContent: false, devTools: !app.isPackaged, spellcheck: false }
  });
  ventana.once('ready-to-show', () => { if (!esPrueba) ventana.show(); });
  ventana.webContents.setWindowOpenHandler(({ url }) => { void abrirExterno(url); return { action: 'deny' }; });
  ventana.webContents.on('will-navigate', (event, url) => {
    if (!esLocal(url)) { event.preventDefault(); void abrirExterno(url); }
  });
  ventana.webContents.on('will-redirect', (event, url) => { if (!esLocal(url)) event.preventDefault(); });
  ventana.webContents.on('will-attach-webview', event => event.preventDefault());
  ventana.webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => { if (isMainFrame) asistente.cancelAll(); });
  ventana.webContents.on('render-process-gone', () => asistente.cancelAll());
  ventana.on('closed', () => { asistente.cancelAll(); ventana = null; for(const p of presentaciones.values())p.window.destroy(); });
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
    ipcMain.handle('creativa:presentacion:abrir',abrirPresentacion);
    ipcMain.handle('creativa:asistente:consultar', (event, value) => asistente.request(event, value));
    ipcMain.handle('creativa:asistente:cancelar', (event, id) => asistente.cancel(event, id));
    ipcMain.handle('creativa:presentacion:leer',event=>{
      const entry=presentaciones.get(event.sender.id);
      if(!entry || event.senderFrame!==event.sender.mainFrame || !esLocal(event.sender.getURL()))throw new Error('Presentación no disponible.');
      return entry.value;
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Archivo', submenu: [{ role: 'quit', label: 'Salir de Creativa' }] },
      { label: 'Edición', submenu: [{ role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' }, { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' }] },
      { label: 'Vista', submenu: [{ role: 'resetZoom', label: 'Tamaño normal' }, { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' }] },
      { label: 'Ayuda', submenu: [{ label: 'Acerca de Creativa', click: () => dialog.showMessageBox(ventana, { type: 'info', title: 'Creativa Impresos', message: `Creativa Impresos · ${app.getVersion()}`, detail: 'Aplicación de escritorio con datos locales cifrados. Incluye pedidos, caja, muestras 3D y asistente local opcional.' }) }] }
    ]));
    crearVentana();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) crearVentana(); });
  }).catch(error => { console.error('No se pudo iniciar Creativa:', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
