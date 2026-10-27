const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('creativaPresentations', Object.freeze({ open: value => ipcRenderer.invoke('creativa:presentacion:abrir', value) }));
contextBridge.exposeInMainWorld('creativaAssistant', Object.freeze({
  request: value => ipcRenderer.invoke('creativa:asistente:consultar', value),
  cancel: id => ipcRenderer.invoke('creativa:asistente:cancelar', id),
}));
