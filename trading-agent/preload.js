const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('freshTradesAPI', {
  saveAs: (content) => ipcRenderer.invoke('save-as', content)
});
