/* Verifica la generación con una API simulada. No ejecuta Figma real. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'figma-plugin', 'runtime.js'), 'utf8');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const sample = {
  title: 'Prueba', description: 'Prueba del importador', start: 'desktop', assets: { logo: png },
  screens: [
    { id: 'cover', name: 'Portada', device: 'reference', width: 1440, height: 1024, nodes: [] },
    { id: 'desktop', name: 'Inicio escritorio', device: 'desktop', width: 1440, height: 1500, flowStart: 'Compra escritorio', nodes: [
      { type: 'image', name: 'Logo', x: 20, y: 10, w: 200, h: 80, asset: 'logo' },
      { type: 'group', name: 'Botón móvil', x: 20, y: 100, w: 200, h: 48, radius: 8, fill: '#05d', target: 'mobile', children: [
        { type: 'text', text: 'Ir al móvil', x: 8, y: 8, w: 184, h: 32, fontSize: 16, weight: 700, color: '#ffffff' }
      ] }
    ] },
    { id: 'mobile', name: 'Inicio móvil', device: 'mobile', width: 390, height: 1200, flowStart: 'Compra móvil', nodes: [
      { type: 'ellipse', name: 'Volver', x: 20, y: 20, w: 40, h: 40, fill: '#f0f0f0', stroke: '#aaaaaa', target: 'desktop' },
      { type: 'rect', name: 'Fondo', x: 20, y: 100, w: 350, h: 500, fill: '#f2f8ff', opacity: .7 },
      { type: 'text', text: 'Texto normal\nSegunda línea', x: 30, y: 120, w: 330, h: 50, fontSize: 16, weight: 400 }
    ] }
  ]
};
function makeMock(options = {}) {
  let serial = 0;
  const messages = [];
  const nodes = [];
  const loaded = new Set();
  const fonts = font => font.family + ':' + font.style;
  const makeNode = type => {
    const node = {
      type, id: 'mock:' + (++serial), name: type, parent: null, children: [], width: 100, height: 100,
      fills: [], strokes: [], cornerRadius: 0, pluginData: {},
      resize(w, h) { assert.ok(w > 0 && h > 0); this.width = w; this.height = h; },
      appendChild(child) {
        if (child.parent) child.parent.children = child.parent.children.filter(item => item !== child);
        this.children.push(child); child.parent = this;
      },
      setPluginData(key, value) { this.pluginData[key] = value; },
      async setReactionsAsync(reactions) {
        if (options.rejectReactions) throw new Error('Reacciones no disponibles');
        reactions.forEach(reaction => {
          assert.equal(reaction.trigger.type, 'ON_CLICK');
          assert.ok(Array.isArray(reaction.actions) && reaction.actions.length);
          reaction.actions.forEach(action => {
            assert.equal(action.type, 'NODE'); assert.equal(action.navigation, 'NAVIGATE');
            assert.ok(nodes.some(candidate => candidate.id === action.destinationId && candidate.type === 'FRAME' && candidate.parent.type === 'PAGE'));
          });
        });
        this.reactions = reactions;
      }
    };
    if (type === 'TEXT') {
      let fontName;
      let chars;
      Object.defineProperty(node, 'fontName', {
        get() { return fontName; },
        set(value) { assert.ok(loaded.has(fonts(value)), 'Fuente debe cargarse antes de usarla'); fontName = value; }
      });
      Object.defineProperty(node, 'characters', {
        get() { return chars; },
        set(value) { assert.ok(fontName); chars = value; }
      });
    }
    nodes.push(node); return node;
  };
  const document = makeNode('DOCUMENT');
  let currentPage = makeNode('PAGE');
  currentPage.name = 'Página existente que debe conservarse';
  currentPage.appendChild(makeNode('RECTANGLE'));
  document.appendChild(currentPage);
  const originalPage = currentPage;
  const figma = {
    root: document, viewport: { scrollAndZoomIntoView(selection) { assert.equal(selection.length, 1); } },
    ui: { postMessage(value) { messages.push(value); } },
    showUI() {}, closePlugin() {}, notify() {}, commitUndo() {},
    async setCurrentPageAsync(page) { currentPage = page; },
    async loadFontAsync(font) {
      if (options.rejectFonts || (options.rejectArial && font.family === 'Arial')) throw new Error('Fuente ausente');
      loaded.add(fonts(font));
    },
    async listAvailableFontsAsync() { return []; },
    createPage() { const page = makeNode('PAGE'); document.appendChild(page); return page; },
    createImage(bytes) { assert.ok(bytes.length > 8); return { hash: 'image:' + bytes.length }; },
    base64Decode(value) { return new Uint8Array(Buffer.from(value, 'base64')); }
  };
  Object.defineProperty(figma, 'currentPage', { get() { return currentPage; } });
  for (const [method, type] of [['createFrame', 'FRAME'], ['createText', 'TEXT'], ['createEllipse', 'ELLIPSE'], ['createRectangle', 'RECTANGLE']]) {
    figma[method] = () => { const node = makeNode(type); currentPage.appendChild(node); return node; };
  }
  return { figma, document, messages, nodes, originalPage };
}
async function run(design, options = {}) {
  const mock = makeMock(options);
  const context = vm.createContext({ figma: mock.figma, __html__: '<html></html>', setTimeout, Uint8Array, console });
  vm.runInContext('const DESIGN = ' + JSON.stringify(design) + ';\n' + runtime, context, { filename: 'plugin-mock.js' });
  await mock.figma.ui.onmessage({ type: 'ready' });
  await Promise.all([mock.figma.ui.onmessage({ type: 'generate' }), mock.figma.ui.onmessage({ type: 'generate' })]);
  return mock;
}
function checkSuccess(mock, design) {
  const success = mock.messages.find(message => message.type === 'success');
  assert.ok(success, JSON.stringify(mock.messages.slice(-2)));
  assert.equal(mock.document.children.length, 2, 'Debe agregar exactamente una página');
  assert.equal(mock.originalPage.name, 'Página existente que debe conservarse');
  assert.equal(mock.originalPage.children.length, 1, 'Debe conservar las capas previas');
  const page = mock.document.children[1];
  const frames = page.children;
  assert.equal(frames.length, design.screens.length);
  assert.equal(page.flowStartingPoints[0].nodeId, frames.find(frame => frame.pluginData.screenId === design.start).id);
  for (const screen of design.screens.filter(screen => screen.flowStart === true)) {
    const flow = page.flowStartingPoints.find(item => item.nodeId === frames.find(frame => frame.pluginData.screenId === screen.id).id);
    assert.equal(flow.name, screen.device === 'mobile' ? 'Móvil' : 'Escritorio');
  }
  design.screens.forEach(screen => {
    const frame = frames.find(item => item.pluginData.screenId === screen.id);
    const expectedHeight = screen.device === 'reference' ? screen.height : Math.min(screen.height, screen.device === 'mobile' ? 844 : 900);
    assert.equal(frame.height, expectedHeight);
    assert.equal(frame.children[0].height, screen.height);
    assert.equal(frame.overflowDirection, screen.height > expectedHeight ? 'VERTICAL' : 'NONE');
    assert.equal(frame.children[0].children.length, screen.nodes.length);
  });
  const walk = nodes => nodes.reduce((n, node) => n + (node.target ? 1 : 0) + walk(node.children || []), 0);
  const expectedLinks = design.screens.reduce((n, screen) => n + walk(screen.nodes), 0);
  assert.equal(mock.nodes.filter(node => node.reactions).length, expectedLinks);
  return { screens: frames.length, links: expectedLinks, nodes: mock.nodes.length, font: success.font, flows: page.flowStartingPoints.map(flow => flow.name) };
}
(async () => {
  const result = [];
  const basic = await run(sample);
  result.push({ test: 'generación, enlaces, scroll, fuentes, conservación y bloqueo de doble clic', ...checkSuccess(basic, sample) });
  await basic.figma.ui.onmessage({ type: 'generate' });
  assert.equal(basic.document.children.length, 2);
  const fallback = await run(sample, { rejectArial: true });
  result.push({ test: 'sustitución de Arial por Inter', ...checkSuccess(fallback, sample) });
  assert.ok(fallback.messages.some(message => message.type === 'success' && message.warning));
  const broken = JSON.parse(JSON.stringify(sample));
  broken.screens[1].nodes[1].target = 'no-existe';
  const invalid = await run(broken);
  assert.equal(invalid.document.children.length, 1);
  assert.ok(invalid.messages.some(message => message.type === 'error'));
  result.push({ test: 'destino inexistente se rechaza antes de crear páginas', passed: true });
  const nofont = await run(sample, { rejectFonts: true });
  assert.equal(nofont.document.children.length, 1);
  assert.ok(nofont.messages.some(message => message.type === 'error'));
  result.push({ test: 'error de fuentes conserva documento', passed: true });
  const partial = await run(sample, { rejectReactions: true });
  assert.ok(partial.document.children[1].name.includes('incompleta'));
  assert.ok(partial.messages.some(message => message.type === 'error'));
  assert.equal(partial.originalPage.children.length, 1);
  result.push({ test: 'error de API informa página parcial sin borrar contenido', passed: true });
  const designPath = process.argv[2];
  if (designPath) {
    const fullDesign = JSON.parse(fs.readFileSync(path.resolve(designPath), 'utf8'));
    const full = await run(fullDesign);
    result.push({ test: 'diseño completo', ...checkSuccess(full, fullDesign) });
  }
  console.log(JSON.stringify({ scope: 'API simulada; no ejecutado en Figma real', results: result }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
