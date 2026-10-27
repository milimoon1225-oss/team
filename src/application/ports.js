/**
 * Contratos estructurales de los adaptadores. El dominio y la aplicación no importan sus implementaciones.
 * @typedef {Object} LocalRepository
 * @property {function(): Promise<object|null>} readEnvelope
 * @property {function(): Promise<function>} exclusive
 * @property {function(string,object): Promise<object>} create
 * @property {function(object,string): Promise<object>} decrypt
 * @property {function(object,object): Promise<object>} save
 * @property {function(object,string): Promise<object>} restore
 *
 * @typedef {Object} FileGateway
 * @property {function(object): Promise<object>} prepareDesign
 * @property {function(string): Promise<Blob>} toBlob
 * @property {function(Blob,string=): Promise<object>} inspect
 * @property {function(object): Promise<object>} readBackup
 * @property {function(object): Promise<object>} preparePreview
 * @property {function(string): Promise<object>} demoPreview
 * @property {function(string): Promise<object>} dimensions Dimensiones de una imagen local, sin modificar sus bytes.
 *
 * @typedef {Object} CustomerPresenter
 * @property {function(object): Promise<void>} open Recibe únicamente geometría, materiales e imágenes autorizadas para presentar.
 * @property {function(): Promise<object>} read Disponible en la presentación, sin acceso al repositorio.
 */
export {};
