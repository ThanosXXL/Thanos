const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (enabled) => ipcRenderer.invoke('set-autostart', enabled),
  exportCsv: (defaultName, csvContent) => ipcRenderer.invoke('export-csv', { defaultName, csvContent }),
  exportBackup: (jsonContent) => ipcRenderer.invoke('export-backup', { jsonContent }),
  importBackup: () => ipcRenderer.invoke('import-backup'),
  onVisibilityChange: (callback) => {
    ipcRenderer.on('app-visibility-changed', (event, state) => callback(state));
  }
});
