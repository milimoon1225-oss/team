import { materialize } from '../../domain/operations.js';
import { canReadOrder, validateQuery, validateQuestion } from '../../domain/assistant/query-policy.js';
import { resolveAssistantAction } from './navigation.js';

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[¿?¡!.,]/g, '').trim();
const destinations = { pedidos: 'orders', produccion: 'production', clientes: 'clients', caja: 'cash', reportes: 'reports', configuracion: 'settings', 'nuevo pedido': 'new-order' };
export const SCREEN_HELP = {
  Pedidos: 'Encuentra un trabajo o revisemos qué necesita atención hoy.',
  'Nuevo pedido': 'Completa el cliente, el trabajo, la fecha de entrega y el precio. Puedes consultar pedidos anteriores para recordar un encargo.',
  Producción: 'Revisemos los archivos y las aprobaciones antes de pasar un trabajo a impresión.',
  Clientes: 'Busca por nombre para recuperar trabajos anteriores del mismo cliente.',
  Caja: 'Aquí registras cobros, salidas y el cierre de la jornada. Los costos del trabajo se consultan dentro de cada pedido.',
  Reportes: 'Revisa los costos y saldos registrados. El resultado depende de los costos que hayas ingresado.',
  Configuración: 'Aquí puedes descargar un respaldo o preparar una demostración para recorrer la app.',
};

export function conversationContext(state, context = {}) {
  if (!['administracion','disenador'].includes(state.profile?.rol)) throw new Error('La cuenta no tiene acceso al asistente.');
  const page = Object.hasOwn(SCREEN_HELP, context.page) ? context.page : 'Pedidos';
  const order = context.orderId ? materialize(state)[context.orderId] : null;
  if (context.orderId && (!order || !canReadOrder(state.profile, order))) throw new Error('El pedido de esta conversación ya no está disponible para tu cuenta.');
  return { page, order };
}

export function planConversation(state, question, context = {}) {
  const original = validateQuestion(question), text = normalize(original).replace(/\s+/g, ' ').replace(/ por favor$/, ''), current = conversationContext(state, context);
  const day = /\bmanana\b/.test(text) ? 'tomorrow' : /\bhoy\b/.test(text) ? 'today' : /\b(atrasad\w*|vencid\w*)\b/.test(text) ? 'overdue' : 'any';
  // Los seguimientos se reciben como estado efímero, no como instrucciones del modelo.
  if (context.pendingTask === 'brief' && !/^(cancela|cancelar|olvidalo|otra cosa|hola|busca|buscar|abre|abrir|llevame|que |como |prepara|compara|revisa)/.test(text)) {
    if (state.profile.rol !== 'administracion') throw new Error('Esa herramienta corresponde a administración.');
    return { workflow: { task: 'brief', input: { message: original } } };
  }
  if (/^(cancela|cancelar|olvidalo|otra cosa)$/.test(text)) return { reply: 'De acuerdo. ¿Qué necesitas ahora?' };
  if (context.attachment) return { workflow: { task: 'review', input: { file: context.attachment, reference: original, visualOnly: true } } };
  if (/^(que (me )?falta( aqui| en este pedido| para imprimir| para terminar( este pedido| esta invitacion)?)?|por que no puedo imprimir|revisar este pedido|ayudame a continuar|como (sigo|continuo)|que sigue|siguiente paso)$/.test(text)) {
    return current.order ? { inspect: current.order.id } : { query: { tool: 'blocked', term: '', day: 'any' } };
  }
  if (/^(prepara|preparar|redacta|escribe)(me)? (un |el )?mensaje( para (el )?cliente| al cliente| de confirmacion)?$/.test(text)) {
    return current.order ? { workflow: { task: 'message', input: { orderId: current.order.id } } } : { reply: '¿Para qué pedido? Busca al cliente o abre su trabajo y preparo el mensaje.' };
  }
  if (/^(ya (confirmo|aprobo)|el cliente (ya )?(confirmo|aprobo)|registrar (la )?confirmacion)$/.test(text)) {
    if (!current.order) return { reply: 'Abre el pedido del cliente para registrar la confirmación sobre su versión actual.' };
    return { reply: 'Comprueba la versión y escribe el nombre de quien confirmó. El registro se guarda al pulsar el botón de aprobación del pedido.', actions: [{ label: 'Registrar confirmación del cliente', action: resolveAssistantAction(state, { target: 'design-approval', orderId: current.order.id }) }] };
  }
  const briefMessage = original.match(/^(?:prepara(?:r)?|crea(?:r)?|convierte|convertir)\s+(?:(?:un|el|este)\s+)?(?:encargo|pedido|mensaje en pedido)\s*[:\n]\s*([\s\S]+)$/i);
  if (briefMessage) {
    if (state.profile.rol !== 'administracion') throw new Error('Esa herramienta corresponde a administración.');
    return { workflow: { task: 'brief', input: { message: briefMessage[1] } } };
  }
  const toolIntents = [
    ['brief', /^(prepara|preparar|crea|crear|convertir) (un |el |este )?(encargo|pedido|mensaje en pedido)/],
    ['review', /^(revisa|revisar|analiza) (el |este |un )?(diseno|invitacion|archivo)/],
    ['compare', /^(compara|comparar) (las |estas |dos )?(versiones|disenos)/],
    ['knowledge', /^(consulta|consultar|busca en) (el |mis |los )?(manual|manuales|documentos)/],
    ['approval', /^(prepara|preparar|redacta) (un |el )?mensaje (para|al) (el )?cliente/],
    ['quote', /^(compara|comparar|calcula|calcular) (los |las |dos )?(precios|costos|alternativas)/],
    ['capacity', /^(planifica|planificar|simula|simular|revisa) (la |las )?(capacidad|prioridades|entregas)/],
    ['search', /^(busca|buscar) (un |el )?diseno por (color|estilo|descripcion)/],
  ];
  const intent = toolIntents.find(([,pattern])=>pattern.test(text));
  if (intent) {
    if (['brief','quote'].includes(intent[0]) && state.profile.rol !== 'administracion') throw new Error('Esa herramienta corresponde a administración.');
    if (intent[0] === 'brief') return { reply: 'Pega el mensaje del cliente aquí. Prepararé una propuesta para revisar; los datos que no aparezcan quedarán pendientes.', pendingTask: 'brief' };
    if (intent[0] === 'approval') return current.order ? { workflow: { task: 'message', input: { orderId: current.order.id } } } : { reply: 'Abre primero el pedido para preparar su mensaje.' };
    if (['review','compare'].includes(intent[0])) return current.order ? { workflow: { task: intent[0], input: { orderId: current.order.id, reference: original, visualOnly: true } } } : { reply: 'Abre el pedido que quieres revisar o adjunta un PDF o imagen aquí.' };
    return { reply: 'Esta tarea necesita datos adicionales. Puedes abrir sus opciones detalladas sin perder la conversación.', offerTool: intent[0], toolSeed: original };
  }
  if (/^(hola|buenos dias|buenas tardes|buenas noches|ayuda|que puedes hacer|como puedes ayudarme)$/.test(text)) {
    return { reply: `Hola, ${state.profile.nombre.split(' ')[0]}. ${SCREEN_HELP[current.page]}`, actions: [] };
  }
  if (/^(que (necesito|debo|puedo) hacer hoy|que hacemos hoy|como va mi dia|que (pedidos|trabajos|entregas) (tengo|hay)( pendientes)?( para (hoy|manana))?|mis pendientes|ver pendientes|pedidos pendientes|que tengo para (hoy|manana)|que trabajos debo entregar|pendientes( hoy| manana)?|que (pedidos|trabajos) estan (atrasados|vencidos))$/.test(text)) return { query: { tool: 'pending', term: '', day: /hoy|dia/.test(text) ? 'today' : day } };
  if (/^(pedidos |trabajos |entregas )?(atrasados|vencidos)$/.test(text)) return { query: { tool: 'pending', term: '', day: 'overdue' } };
  if (/^(y )?(manana|para manana|hoy|para hoy|los atrasados|atrasados)$/.test(text) && context.lastQuery) {
    const previous = validateQuery(context.lastQuery);
    return { query: { ...previous, day: text.includes('manana') ? 'tomorrow' : text.includes('atrasados') ? 'overdue' : 'today' } };
  }
  const search = text.match(/^(?:busca(?:r)?|encuentra|encuentrame|muestrame|abre|abrir)\s+(?:(?:el|los|las|un|las)\s+)?(?:(?:pedidos?|trabajos?|invitaciones|tarjetas)\s+)?(?:de\s+)?(.+)$/);
  if (search && !/^(pedidos|produccion|clientes|caja|reportes|configuracion|nuevo pedido|diseno|archivo|aprobacion|vista 3d)$/.test(search[1]) && !/^(el |la )?(diseno|archivo|aprobacion|vista 3d|produccion)$/.test(search[1])) {
    if (search[1].length > 150) return { reply: 'Escribe el nombre del cliente, el código o unas palabras del trabajo para buscarlo.' };
    return { query: { tool: 'search', term: search[1], day: 'any' }, chooseOrder: true };
  }
  if (/^(abre|abrir|llevame a|ir a|quiero ir a) /.test(text)) {
    const destination = text.replace(/^(abre|abrir|llevame a|ir a|quiero ir a) (la |los |las |el )?/, '');
    if (destinations[destination]) {
      const action = resolveAssistantAction(state, { target: destinations[destination] });
      return { reply: `Te llevo a ${destination}.`, navigation: action, actions: [] };
    }
  }
  if (current.order && (/^(abre|abrir|muestrame|ver) (el |la )?(diseno|archivo|aprobacion|vista 3d|produccion)$/.test(text) || /^donde esta (el )?(diseno|archivo)$/.test(text))) {
    const target = text.includes('aprobacion') ? 'design-approval' : text.includes('3d') ? 'order-preview' : text.includes('produccion') ? 'order-production' : 'design-upload';
    const action = resolveAssistantAction(state, { target, orderId: current.order.id });
    return { reply: `Continuemos con ${current.order.code}.`, navigation: action, actions: [] };
  }
  return { question: validateQuestion(question) };
}
