/**
 * @typedef {Object} LanguageModel
 * @property {function({signal: AbortSignal}): Promise<{models: string[]}>} status
 * @property {function({question: string, model: string, signal: AbortSignal}): Promise<object>} interpret
 * Devuelve una propuesta {tool,term,day}. No recibe datos de pedidos ni ejecuta herramientas.
 * @property {function({task: string, payload: string, images: string[], signal: AbortSignal}): Promise<object>} analyze
 * Tareas con esquemas fijos: brief, review, compare, tag, knowledge, approval, search y explain.
 * Solo recibe la proyección y las imágenes seleccionadas para esa tarea, nunca el estado completo.
 *
 * @typedef {Object} AssistantMedia
 * @property {function(Blob,object): Promise<object>} prepare Copia de análisis y metadatos originales de imagen o página PDF.
 * @property {function(object,object,AbortSignal): Promise<object>} compare Mapa de diferencias orientativo calculado localmente.
 * @property {function(File,object): Promise<object>} manual Extracción local de páginas de texto TXT, Markdown o PDF.
 *
 * @typedef {Object} AuthorizedDesigns
 * @property {function(object,string,string): Promise<{blob: Blob, name: string}>} get Revalida acceso al pedido y verifica hash.
 *
 * @typedef {Object} AssistantQueries
 * @property {function(object, object, Date): object} query
 * Lee una instantánea autorizada y devuelve una proyección con evidencia; no escribe.
 */
export {};
