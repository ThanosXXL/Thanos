const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  uploadDocument: (dozentId) => ipcRenderer.invoke('upload-document', dozentId),
  openDocument: (fileName) => ipcRenderer.invoke('open-document', fileName),
  deleteDocument: (fileName) => ipcRenderer.invoke('delete-document', fileName)
});
