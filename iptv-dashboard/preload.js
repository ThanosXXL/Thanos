const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('iptvAPI', {
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  fetchM3U: (url) => ipcRenderer.invoke('fetch-m3u', url),
});
