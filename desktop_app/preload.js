const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose APIs to the renderer process here
  // e.g., onUpdateCounter: (callback) => ipcRenderer.on('update-counter', callback)
});
