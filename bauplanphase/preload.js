const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reportAPI', {
  storageGet: (key) => ipcRenderer.invoke('report-storage-get', key),
  storageSet: (key, value) => ipcRenderer.invoke('report-storage-set', key, value),
  storageDelete: (key) => ipcRenderer.invoke('report-storage-delete', key),
  storageList: (prefix) => ipcRenderer.invoke('report-storage-list', prefix),
  storageClear: () => ipcRenderer.invoke('report-storage-clear'),
  exportData: () => ipcRenderer.invoke('report-storage-export')
});
