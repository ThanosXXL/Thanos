const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('downloaderAPI', {
  start: () => ipcRenderer.invoke('start-download'),
  onStatus: (callback) => {
    ipcRenderer.on('download-status', (event, data) => callback(data));
  }
});
