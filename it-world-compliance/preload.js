const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('complianceAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  getLogo: () => ipcRenderer.invoke('get-logo'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  exportData: (data) => ipcRenderer.invoke('export-data', data),
  importData: () => ipcRenderer.invoke('import-data'),
  exportReportHtml: (html) => ipcRenderer.invoke('export-report-html', html),
  exportReportPdf: (html) => ipcRenderer.invoke('export-report-pdf', html),
  pickEvidenceFile: () => ipcRenderer.invoke('pick-evidence-file'),
  openEvidenceFile: (filePath) => ipcRenderer.invoke('open-evidence-file', filePath)
});
