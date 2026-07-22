const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data)
});

contextBridge.exposeInMainWorld('reportAPI', {
  storageGet: (key) => ipcRenderer.invoke('report-storage-get', key),
  storageSet: (key, value) => ipcRenderer.invoke('report-storage-set', key, value),
  storageDelete: (key) => ipcRenderer.invoke('report-storage-delete', key),
  storageList: (prefix) => ipcRenderer.invoke('report-storage-list', prefix)
});
