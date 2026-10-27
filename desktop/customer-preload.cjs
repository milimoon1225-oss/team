const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('creativaCustomer', Object.freeze({ read: () => ipcRenderer.invoke('creativa:presentacion:leer') }));
