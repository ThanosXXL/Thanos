const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  uploadDocument: () => ipcRenderer.invoke('upload-document'),
  openDocument: (fileName) => ipcRenderer.invoke('open-document', fileName),
  deleteDocument: (fileName) => ipcRenderer.invoke('delete-document', fileName)
});
