const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('praxisAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data)
});
