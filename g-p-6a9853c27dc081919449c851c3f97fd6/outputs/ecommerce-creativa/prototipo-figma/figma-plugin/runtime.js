/* Creativa Impresos — importador local para Figma Design.
 * code.js contiene primero const DESIGN = {...}; seguido de este archivo.
 * No requiere paquetes, red, claves, terminal ni acceso a páginas existentes.
 */
(function () {
  'use strict';
  let busy = false;
  let completed = false;
  let createdPage = null;
  const nodeTypes = ['rect', 'ellipse', 'text', 'image', 'group'];
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const message = (type, detail) => figma.ui.postMessage(Object.assign({ type: type }, detail || {}));

  function positive(value, label) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(label + ' debe ser mayor que cero.');
    return value;
  }

  function paint(value) {
    if (!value || value === 'transparent' || value === 'none') return [];
    let hex = String(value).replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(character => character + character).join('');
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) throw new Error('Color no válido: ' + value);
    return [{ type: 'SOLID', color: {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255
    }, opacity: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 }];
  }

  function validateDesign() {
    if (typeof DESIGN !== 'object' || !Array.isArray(DESIGN.screens) || !DESIGN.screens.length) {
      throw new Error('Faltan las pantallas del prototipo en code.js.');
    }
    const ids = new Set();
    let nodes = 0;
    let links = 0;
    DESIGN.screens.forEach(screen => {
      if (!screen.id || ids.has(screen.id)) throw new Error('ID de pantalla ausente o repetido: ' + screen.id);
      ids.add(screen.id);
      positive(screen.width, 'Ancho de ' + screen.id);
      positive(screen.height, 'Alto de ' + screen.id);
      if (screen.device && ['reference', 'desktop', 'mobile'].indexOf(screen.device) < 0) {
        throw new Error('Dispositivo no admitido en ' + screen.id + ': ' + screen.device);
      }
      if (!Array.isArray(screen.nodes)) throw new Error('Faltan las capas de ' + screen.id);
    });
    if (DESIGN.start && !ids.has(DESIGN.start)) throw new Error('No existe la pantalla inicial: ' + DESIGN.start);
    function visit(node, screenId) {
      nodes += 1;
      if (nodeTypes.indexOf(node.type) < 0) throw new Error('Tipo de capa no admitido: ' + node.type);
      positive(node.w, 'Ancho de capa en ' + screenId);
      positive(node.h, 'Alto de capa en ' + screenId);
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new Error('Posición de capa no válida en ' + screenId);
      if (node.fill) paint(node.fill);
      if (node.stroke) paint(node.stroke);
      if (node.opacity !== undefined && (!Number.isFinite(node.opacity) || node.opacity < 0 || node.opacity > 1)) {
        throw new Error('Opacidad no válida en ' + screenId);
      }
      if (node.type === 'text') {
        positive(node.fontSize || 16, 'Tamaño de texto');
        paint(node.color || '#18253D');
      }
      if (node.target) {
        links += 1;
        if (!ids.has(node.target)) throw new Error('Destino inexistente: ' + node.target);
      }
      if (node.type === 'image' && (!DESIGN.assets || !has(DESIGN.assets, node.asset))) {
        throw new Error('Falta la imagen: ' + node.asset);
      }
      (node.children || []).forEach(child => visit(child, screenId));
    }
    DESIGN.screens.forEach(screen => screen.nodes.forEach(node => visit(node, screen.id)));
    return { screens: DESIGN.screens.length, nodes: nodes, links: links };
  }

  async function loadFonts() {
    const families = ['Arial', 'Inter', 'Roboto'];
    for (const family of families) {
      try {
        const regular = { family: family, style: 'Regular' };
        const bold = { family: family, style: 'Bold' };
        await figma.loadFontAsync(regular);
        await figma.loadFontAsync(bold);
        return { regular: regular, bold: bold, fallback: family !== 'Arial' };
      } catch (error) { /* Try the next available editor font. */ }
    }
    const available = await figma.listAvailableFontsAsync();
    for (const item of available) {
      if (!item.fontName || !/^(Regular|Book|Normal)$/i.test(item.fontName.style)) continue;
      try {
        await figma.loadFontAsync(item.fontName);
        const match = available.find(candidate => candidate.fontName.family === item.fontName.family && candidate.fontName.style === 'Bold');
        let bold = item.fontName;
        if (match) {
          try { await figma.loadFontAsync(match.fontName); bold = match.fontName; } catch (error) { /* Use the loaded regular face. */ }
        }
        return { regular: item.fontName, bold: bold, fallback: true };
      } catch (error) { /* Continue through editor-provided font names. */ }
    }
    throw new Error('Figma no pudo cargar una fuente. Habilita Arial o Inter y vuelve a ejecutar el plugin.');
  }

  function loadImages() {
    const images = Object.create(null);
    Object.keys(DESIGN.assets || {}).forEach(key => {
      const data = DESIGN.assets[key];
      if (typeof data !== 'string' || !/^data:image\/png;base64,/.test(data)) {
        throw new Error('La imagen ' + key + ' debe ser un PNG incrustado.');
      }
      images[key] = figma.createImage(figma.base64Decode(data.slice(data.indexOf(',') + 1))).hash;
    });
    return images;
  }

  function applyBox(node, spec, parent) {
    parent.appendChild(node);
    node.name = spec.name || spec.text || spec.type;
    node.resize(positive(spec.w, 'Ancho'), positive(spec.h, 'Alto'));
    node.x = spec.x;
    node.y = spec.y;
    node.opacity = spec.opacity === undefined ? 1 : spec.opacity;
    if ('strokes' in node) {
      node.strokes = paint(spec.stroke);
      if (spec.stroke) node.strokeWeight = spec.strokeWidth === undefined ? 1 : spec.strokeWidth;
    }
    if ('cornerRadius' in node && spec.radius !== undefined) node.cornerRadius = spec.radius;
  }

  function makeNode(spec, parent, fonts, images, links) {
    let node;
    if (spec.type === 'group') {
      node = figma.createFrame();
      node.layoutMode = 'NONE';
      node.clipsContent = false;
      node.fills = paint(spec.fill);
    } else if (spec.type === 'text') {
      node = figma.createText();
      node.fontName = Number(spec.weight || 400) >= 600 ? fonts.bold : fonts.regular;
      node.fontSize = spec.fontSize || 16;
      node.characters = String(spec.text === undefined ? '' : spec.text);
      node.textAutoResize = 'NONE';
      node.textAlignHorizontal = String(spec.align || 'left').toUpperCase();
      node.textAlignVertical = 'TOP';
      node.lineHeight = { unit: 'PIXELS', value: spec.lineHeight || (spec.fontSize || 16) * 1.35 };
      node.paragraphSpacing = 0;
      node.fills = paint(spec.color || '#18253D');
    } else if (spec.type === 'ellipse') {
      node = figma.createEllipse();
      node.fills = paint(spec.fill);
    } else {
      node = figma.createRectangle();
      node.fills = spec.type === 'image'
        ? [{ type: 'IMAGE', imageHash: images[spec.asset], scaleMode: 'FIT' }]
        : paint(spec.fill);
    }
    applyBox(node, spec, parent);
    if (spec.target) links.push({ node: node, target: spec.target });
    if (spec.type === 'group') (spec.children || []).forEach(child => makeNode(child, node, fonts, images, links));
    return node;
  }

  function viewportHeight(screen) {
    if (screen.device === 'reference') return screen.height;
    return Math.min(screen.height, screen.device === 'mobile' ? 844 : 900);
  }

  function canvasPositions() {
    const positions = Object.create(null);
    let y = 0;
    ['reference', 'desktop', 'mobile'].forEach(device => {
      const screens = DESIGN.screens.filter(screen => (screen.device || 'desktop') === device);
      const columns = device === 'mobile' ? 5 : (device === 'reference' ? 2 : 3);
      for (let offset = 0; offset < screens.length; offset += columns) {
        const row = screens.slice(offset, offset + columns);
        let x = 0;
        let height = 0;
        row.forEach(screen => {
          positions[screen.id] = { x: x, y: y };
          x += screen.width + 120;
          height = Math.max(height, viewportHeight(screen));
        });
        y += height + 160;
      }
      if (screens.length) y += 80;
    });
    return positions;
  }

  async function generate() {
    if (busy || completed) return;
    busy = true;
    try {
      const counts = validateDesign();
      message('progress', { percent: 2, text: 'Preparando las fuentes y los logotipos…' });
      const fonts = await loadFonts();
      const images = loadImages();
      const page = figma.createPage();
      createdPage = page;
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      page.name = 'Creativa · e-commerce · ' + stamp;
      await figma.setCurrentPageAsync(page);
      page.backgrounds = paint('#E9EEF5');
      page.prototypeBackgrounds = paint('#E9EEF5');
      page.setPluginData('description', String(DESIGN.description || 'Prototipo de e-commerce de Creativa Impresos'));
      const frames = Object.create(null);
      const content = Object.create(null);
      const links = [];
      const positions = canvasPositions();

      // Create every destination before adding interactions.
      DESIGN.screens.forEach(screen => {
        const frame = figma.createFrame();
        page.appendChild(frame);
        frame.name = screen.name || screen.id;
        frame.layoutMode = 'NONE';
        frame.resize(screen.width, viewportHeight(screen));
        frame.x = positions[screen.id].x;
        frame.y = positions[screen.id].y;
        frame.fills = paint(screen.fill || '#FFFFFF');
        frame.clipsContent = true;
        frame.overflowDirection = screen.height > frame.height ? 'VERTICAL' : 'NONE';
        frame.setPluginData('screenId', screen.id);
        frames[screen.id] = frame;
        const body = figma.createFrame();
        frame.appendChild(body);
        body.name = 'Contenido editable · ' + screen.width + ' × ' + screen.height;
        body.layoutMode = 'NONE';
        body.resize(screen.width, screen.height);
        body.x = 0;
        body.y = 0;
        body.fills = [];
        body.clipsContent = false;
        content[screen.id] = body;
      });

      for (let i = 0; i < DESIGN.screens.length; i += 1) {
        const screen = DESIGN.screens[i];
        screen.nodes.forEach(spec => makeNode(spec, content[screen.id], fonts, images, links));
        message('progress', {
          percent: 5 + Math.round((i + 1) / DESIGN.screens.length * 70),
          text: 'Creando ' + (i + 1) + '/' + DESIGN.screens.length + ': ' + (screen.name || screen.id)
        });
        // Let Figma update the canvas and progress UI between screens.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      for (let i = 0; i < links.length; i += 1) {
        const link = links[i];
        await link.node.setReactionsAsync([{
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', destinationId: frames[link.target].id, navigation: 'NAVIGATE', transition: null, resetScrollPosition: true }]
        }]);
        if (i % 25 === 0 || i === links.length - 1) {
          message('progress', { percent: 75 + Math.round((i + 1) / links.length * 23), text: 'Conectando botones y recorridos…' });
        }
      }
      const startId = DESIGN.start || DESIGN.screens.find(screen => screen.device !== 'reference').id;
      const startScreens = DESIGN.screens.filter(screen => screen.id === startId || screen.flowStart);
      startScreens.sort((a, b) => a.id === startId ? -1 : (b.id === startId ? 1 : 0));
      page.flowStartingPoints = startScreens.map(screen => ({
        nodeId: frames[screen.id].id,
        name: typeof screen.flowStart === 'string' ? screen.flowStart :
          (screen.device === 'mobile' ? 'Móvil' : (screen.device === 'desktop' ? 'Escritorio' : (screen.name || screen.id)))
      }));
      page.selection = [frames[startId]];
      figma.viewport.scrollAndZoomIntoView([frames[startId]]);
      figma.commitUndo();
      completed = true;
      message('success', {
        text: counts.screens + ' pantallas y ' + counts.links + ' enlaces creados. Cierra esta ventana y pulsa Presentar (▶).',
        font: fonts.regular.family,
        warning: fonts.fallback ? 'Arial no estaba disponible. Se usó ' + fonts.regular.family + '; revisa los saltos de línea antes de entregar.' : '',
        page: page.name
      });
      figma.notify('Prototipo Creativa creado. Pulsa Presentar (▶) para recorrerlo.');
    } catch (error) {
      const reason = error && error.message ? error.message : String(error);
      if (createdPage) createdPage.name += ' · generación incompleta';
      message('error', { text: reason + (createdPage ? ' La página creada quedó marcada como incompleta; las páginas anteriores están intactas.' : '') });
      figma.notify('No se completó la generación: ' + reason, { error: true });
    } finally {
      busy = false;
    }
  }

  figma.showUI(__html__, { width: 440, height: 560, title: 'Creativa · Prototipo e-commerce' });
  figma.ui.onmessage = async payload => {
    if (!payload || typeof payload.type !== 'string') return;
    if (payload.type === 'generate') await generate();
    if (payload.type === 'close' && !busy) figma.closePlugin();
    if (payload.type === 'ready') {
      try { message('ready', validateDesign()); }
      catch (error) { message('error', { text: error.message }); }
    }
  };
}());
