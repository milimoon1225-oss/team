import { materialize, today } from '../../domain/operations.js';
import { canReadOrder } from '../../domain/assistant/query-policy.js';
import { assertWritable, emptyDraft, requireAdmin } from '../../domain/workspace.js';
import { checkedBrief, checkedCitations, compareReferenceText, normalize, quoteSheet, retrievePassages, scheduleStation, technicalReview, text, validateAssistantData } from '../../domain/assistant/tools.js';
import { printBlockers } from '../../domain/production.js';
import { orderActions } from './navigation.js';

export function createAssistantTools({ languageModel, media, designs, runSession, now, newId = () => crypto.randomUUID() }) {
  function visible(state) {
    if (!['administracion','disenador'].includes(state.profile.rol)) throw new Error('La cuenta no tiene acceso.');
    return Object.values(materialize(state)).filter(order => canReadOrder(state.profile, order));
  }
  function orderFor(state, id) {
    const order = visible(state).find(order => order.id === id);
    if (!order) throw new Error('No tienes acceso a ese pedido. Actualiza la consulta.');
    return order;
  }
  function library(state) {
    if (state.assistantData && state.assistantData.ownerId !== state.profile.id) throw new Error('La biblioteca pertenece a otra cuenta. Abre su copia autorizada.');
    if (state.assistantData && (state.assistantData.ownerRole || 'administracion') !== state.profile.rol) throw new Error('La biblioteca corresponde a otro rol. Usa una copia preparada con tus permisos vigentes.');
    return state.assistantData || { version: 1, ownerId: state.profile.id, ownerRole: state.profile.rol, revision: 0, manuals: [], visualIndex: [] };
  }
  async function updateLibrary(session, change) {
    return session.update(state => {
      assertWritable(state, now()); visible(state);
      const current = library(state), next = { ...change(current, state), revision: current.revision + 1 };
      validateAssistantData(next); return { ...state, assistantData: next };
    });
  }
  async function source(session, input, signal) {
    let blob, name, order = null, design = null;
    if (input.file) { blob = input.file; name = input.file.name; }
    else {
      order = orderFor(session.read(), input.orderId);
      design = order.designs.find(item => item.id === input.designId);
      if (!design) throw new Error('Selecciona una versión de diseño disponible.');
      ({ blob, name } = await designs.get(session, order.id, design.id));
    }
    const asset = await media.prepare(blob, { name, page: Number(input.page || 1), signal });
    return { asset, order, design };
  }
  const analyze = (task, payload, images, signal) => {
    if (!languageModel.analyze) throw new Error('Actualiza la integración local del modelo para usar estas herramientas.');
    return languageModel.analyze({ task, payload: JSON.stringify(payload), images, signal });
  };
  return {
    catalog(session) {
      const state = session.read(), orders = visible(state), data = library(state);
      return { admin: state.profile.rol === 'administracion', demonstration: !!state.demonstration,
        orders: orders.slice(0,300).map(order => ({ id: order.id, code: order.code, client: order.client, product: order.product, qty: order.qty, stage: order.stage,
          active: !order.cancelled && order.stage !== 'Entregado', designs: order.designs.map(d => ({ id: d.id, name: d.name, at: d.at })) })),
        totalOrders: orders.length, hasDraft: !!(state.draft?.client || state.draft?.product || state.draft?.description || state.draft?.price), manuals: data.manuals.map(m => ({ id: m.id, title: m.title, pages: m.pages.length })), indexed: data.visualIndex.filter(entry => orders.some(order => order.id === entry.orderId && order.designs.some(d => d.id === entry.designId && d.hash === entry.hash))).length };
    },
    run(session, { task, input = {}, signal }) {
      const snapshot=session.read(), scope={lastSync:snapshot.lastSync,mode:snapshot.mode,stale:false,at:now().toISOString()};
      return runSession(session, signal, async active => {
        const state = session.read(); visible(state);
        if (task === 'brief') {
          requireAdmin(state); const message = text(input.message, 6000);
          const proposal = await analyze('brief', { message, today: today(now()) }, [], active);
          return { kind: 'brief', title: 'Propuesta de encargo', brief: checkedBrief(proposal, message), summary: 'Revisa la propuesta y los datos pendientes antes de usarla como borrador. No se creó ningún pedido.', sourceText: message, model: true };
        }
        if (task === 'review' || task === 'tag') {
          const { asset, order, design } = await source(session, input, active);
          const checks = task !== 'review' ? null : input.visualOnly ? [{ label: 'Alcance de esta revisión', level: 'review', value: 'Revisión visual de una página. No se calcularon resolución efectiva ni sangrado porque no se confirmaron las medidas de impresión. Usa las opciones detalladas para comprobarlas.' }] : technicalReview(asset, input);
          const reference = input.reference ? text(input.reference, 4000) : (order?.description || '').slice(0,4000);
          const analysis = await analyze(task, { page: asset.page, extractedPdfText: asset.text.slice(0,2000) }, [asset.image], active);
          const image = { name: `${asset.name} · página ${asset.page}`, url: asset.previewUrl, hash: asset.hash };
          if (task === 'tag') {
            if (!order || !design) throw new Error('Para recordar un diseño, selecciona una versión de un pedido.');
            return { kind: 'index', title: 'Ficha visual propuesta', summary: analysis.description, tags: analysis.tags, images: [image],
              index: { orderId: order.id, designId: design.id, hash: design.hash, description: analysis.description, tags: analysis.tags }, model: true };
          }
          return { kind: 'review', title: 'Revisión antes de imprimir', summary: analysis.summary, items: analysis.items, model: true, images: [image],
            checks, reference, textComparison:compareReferenceText(reference,asset.text||analysis.visibleText,asset.text?'Texto extraído de la página PDF':'Transcripción propuesta por IA: puede contener errores'),
            note: 'Las observaciones visuales y la transcripción son sugerencias que pueden contener errores. Contrasta con el original y el cliente. Una página analizada no representa el PDF completo.' };
        }
        if (task === 'compare') {
          const first = await source(session, input.first, active), second = await source(session, input.second, active);
          const difference = await media.compare(first.asset, second.asset, active);
          const analysis = await analyze('compare', { first: { name: first.asset.name, page: first.asset.page, text: first.asset.text.slice(0,1500) }, second: { name: second.asset.name, page: second.asset.page, text: second.asset.text.slice(0,1500) } }, [first.asset.image, second.asset.image], active);
          return { kind: 'compare', title: 'Comparación de versiones', summary: analysis.summary, items: analysis.items, difference, model: true,
            images: [{ name: `A · ${first.asset.name} · p. ${first.asset.page}`, url: first.asset.previewUrl, hash: first.asset.hash }, { name: `B · ${second.asset.name} · p. ${second.asset.page}`, url: second.asset.previewUrl, hash: second.asset.hash }], note: 'El mapa de píxeles orienta la revisión; la IA puede omitir cambios de texto pequeño. No altera ni aprueba las versiones.' };
        }
        if (task === 'search') {
          const question = text(input.question, 1000), proposed = input.useAI ? await analyze('search', { question }, [], active) : null;
          const terms = proposed?.terms || normalize(question).match(/[a-z0-9]{3,}/g)?.filter(term => !['busca','buscar','diseno','tarjeta','invitacion','hicimos','para','como','con','una','unas','los','las','que'].includes(term)) || [];
          const current = session.read(), data = library(current);
          const rows = visible(current).map(order => {
            const indexed = data.visualIndex.filter(entry => entry.orderId === order.id && order.designs.some(d => d.id === entry.designId && d.hash === entry.hash));
            const original = `${order.code} ${order.client} ${order.product} ${order.description || ''}`;
            const searchable = normalize(`${original} ${indexed.map(entry => `${entry.description} ${entry.tags.join(' ')}`).join(' ')}`);
            const matched = terms.filter(term => searchable.includes(normalize(term)));
            return { id: order.id, code: order.code, client: order.client, product: order.product, matched, score: matched.length, indexed: indexed.length > 0, actions: orderActions(order, current.profile) };
          }).filter(row => row.score > 0).sort((a,b) => b.score-a.score).slice(0,20);
          return { kind: 'search', title: 'Trabajos que pueden coincidir', summary: `${rows.length} candidatos por coincidencia de palabras y fichas visuales.`, rows, terms,
            note: proposed ? 'La IA amplió los términos; comprueba las coincidencias mostradas.' : 'Búsqueda local por palabras; para colores y motivos de la imagen, guarda primero su ficha visual.' };
        }
        if (task === 'knowledge') {
          const question = text(input.question, 1000), data = library(state);
          const manuals = input.manualId ? data.manuals.filter(m => m.id === input.manualId) : data.manuals;
          const passages = retrievePassages(manuals, question);
          if (!passages.length) return { kind: 'knowledge', title: 'Consulta de manuales', summary: 'No encontré un fragmento relacionado. Importa el manual o prueba palabras más específicas.', sources: [] };
          const analysis = await analyze('knowledge', { question, passages: passages.map(({id,title,page,text}) => ({id,title,page,text})) }, [], active);
          const citations = checkedCitations(analysis, passages);
          return { kind: 'knowledge', title: 'Respuesta apoyada en tus documentos', summary: citations.length ? analysis.answer : 'Los fragmentos recuperados no permiten responder con evidencia. Revisa el manual o reformula la pregunta.', sources: citations, model: true };
        }
        if (task === 'approval') {
          const order = orderFor(state, input.orderId), version = order.designs.length;
          if (!version) throw new Error('Adjunta una versión del diseño antes de preparar su confirmación.');
          const analysis = await analyze('approval', { code: order.code, client: order.client, product: order.product, qty: order.qty, delivery: order.delivery, version,
            approvalCurrent: order.approval?.designId === order.designs.at(-1)?.id, notes: (order.description || '').slice(0,1500) }, [], active);
          return { kind: 'approval', title: `Mensaje propuesto · ${order.code} · V${version}`, summary: 'Revisa el texto antes de copiarlo. No se envió ningún mensaje ni se registró una aprobación.', message: analysis.message, checklist: analysis.checklist, model: true,
            actions: [{ label: 'Abrir aprobación del diseño', action: { target: 'design-approval', orderId: order.id } }] };
        }
        if (task === 'quote') {
          requireAdmin(state);
          return { kind: 'quote', title: 'Comparación de alternativas', quotes: [quoteSheet(input.base), quoteSheet(input.alternative)],
            summary: 'Cálculos a partir de las medidas y costos ingresados. Incluyen margen sobre venta y descuento explícitos.', note: input.example ? 'ESTIMACIÓN DE EJEMPLO: reemplaza estos costos antes de cotizar al cliente.' : 'No es un precio confirmado ni una factura. Revisa costos, merma y alcance de impresión/acabados.' };
        }
        if (task === 'capacity') {
          const orders = visible(state).filter(o => !o.cancelled && o.stage !== 'Entregado');
          if (orders.length > 200) throw new Error('La simulación admite hasta 200 pedidos activos en esta copia.');
          const schedule = scheduleStation(orders.map(o => ({ id: o.id, code: o.code, client: o.client, qty: o.qty, delivery: o.delivery,
            blockers: ['Recepción','Diseño','Impresión'].includes(o.stage) ? printBlockers(o) : [], actions: orderActions(o, state.profile) })), input);
          return { kind: 'capacity', title: 'Prioridades y capacidad de una estación', schedule, summary: 'Orden por fecha de entrega; duración calculada con los tiempos indicados. Los bloqueados o sin tiempos no se programan.',
            note: 'Simulación de una sola estación y jornadas diarias consecutivas, sin feriados ni otras máquinas. No promete entregas y puede faltar información de equipos desconectados.' };
        }
        if (task === 'explain') {
          if (input.kind === 'quote') requireAdmin(state);
          if (!['quote','capacity'].includes(input.kind)) throw new Error('Escenario no válido.');
          if(input.kind==='capacity'&&visible(state).filter(o=>!o.cancelled&&o.stage!=='Entregado').length>200)throw new Error('La simulación admite hasta 200 pedidos activos.');
          const calculated = input.kind === 'quote' ? [quoteSheet(input.data.base), quoteSheet(input.data.alternative)]
            : scheduleStation(visible(state).filter(o=>!o.cancelled&&o.stage!=='Entregado').map(o=>({id:o.id,code:o.code,client:o.client,qty:o.qty,delivery:o.delivery,blockers:['Recepción','Diseño','Impresión'].includes(o.stage)?printBlockers(o):[]})),input.data);
          const analysis = await analyze('explain', { kind: input.kind, calculated: calculated.slice(0,20) }, [], active);
          return { kind: 'explain', title: 'Explicación de los cálculos', summary: analysis.summary, checklist: analysis.notes, model: true,
            ...(input.kind==='quote'?{quotes:calculated}:{schedule:calculated}), note: 'La tabla de cálculo sigue siendo la referencia para importes y fechas.' };
        }
        throw new Error('Herramienta no disponible.');
      }).then(result=>({...result,scope}));
    },
    async importManual(session, file, signal) {
      const manual = await runSession(session, signal, active => media.manual(file, { signal: active }));
      await updateLibrary(session, current => ({ ...current, manuals: [...current.manuals, { ...manual, id: newId() }] }));
      return { title: manual.title, pages: manual.pages.length };
    },
    async removeManual(session, id) { await updateLibrary(session, current => ({ ...current, manuals: current.manuals.filter(m => m.id !== id) })); },
    async saveIndex(session, entry) {
      await updateLibrary(session, (current, state) => {
        const order = orderFor(state, entry.orderId), design = order.designs.find(d => d.id === entry.designId && d.hash === entry.hash);
        if (!design) throw new Error('La versión cambió. Vuelve a describir el archivo vigente.');
        return { ...current, visualIndex: [...current.visualIndex.filter(e => e.orderId !== order.id || e.designId !== design.id), { orderId: order.id, designId: design.id, hash: design.hash, description: text(entry.description,1200), tags: entry.tags }] };
      });
    },
    async applyBrief(session, brief, replace = false) {
      return session.update(state => {
        requireAdmin(state); assertWritable(state, now());
        if (!replace && (state.draft?.client || state.draft?.product || state.draft?.description || state.draft?.price)) throw new Error('Ya existe un borrador. Marca la casilla para reemplazarlo después de revisar la propuesta.');
        const clean = checkedBrief({ ...brief, qty: brief.qty === '' ? 0 : brief.qty }, brief.client || ''), draft = emptyDraft(now());
        const delivery = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean.delivery) && Number.isFinite(Date.parse(`${clean.delivery}:00-05:00`)) && clean.delivery.slice(0,10) >= today(now()) ? clean.delivery : '';
        return { ...state, draft: { ...draft, client: clean.client, product: clean.product, qty: String(clean.qty || ''), price: '', delivery,
          description: `${clean.description}\nPendiente de confirmar: ${clean.missing.join('; ')}.`.trim().slice(0,5000) } };
      });
    },
  };
}
