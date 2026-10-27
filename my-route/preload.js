const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('myRouteAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  exportData: (data) => ipcRenderer.invoke('export-data', data),
  importData: () => ipcRenderer.invoke('import-data'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  geocode: (query) => ipcRenderer.invoke('geocode', query)
});
