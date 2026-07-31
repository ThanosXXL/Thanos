const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  saveScreenshot: (payload) => ipcRenderer.invoke('save-screenshot', payload),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options)
});
