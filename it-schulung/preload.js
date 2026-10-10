const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('schulungAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  exportData: (data) => ipcRenderer.invoke('export-data', data),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
