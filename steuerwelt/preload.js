const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data)
});

contextBridge.exposeInMainWorld('licenseAPI', {
  status: () => ipcRenderer.invoke('license:status'),
  activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
  deactivate: () => ipcRenderer.invoke('license:deactivate')
});

contextBridge.exposeInMainWorld('documentsAPI', {
  chooseFile: () => ipcRenderer.invoke('documents:choose-file'),
  openFile: (filePath) => ipcRenderer.invoke('documents:open-file', filePath)
});

contextBridge.exposeInMainWorld('invoiceAPI', {
  exportPdf: (html, suggestedName) => ipcRenderer.invoke('invoice:export-pdf', { html, suggestedName })
});
