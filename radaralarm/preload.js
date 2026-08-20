const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('radarAlarmAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  pickImage: () => ipcRenderer.invoke('pick-image'),
  getDemoLimits: () => ipcRenderer.invoke('get-demo-limits'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  exportPdfReport: (html, suggestedName) => ipcRenderer.invoke('export-pdf-report', { html, suggestedName }),
  exportCsvReport: (csv, suggestedName) => ipcRenderer.invoke('export-csv-report', { csv, suggestedName }),
  notify: (title, body) => ipcRenderer.invoke('notify', { title, body })
});
