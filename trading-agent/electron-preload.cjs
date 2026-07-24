const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  startAgent: (settings) => ipcRenderer.invoke('start-agent', settings),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  getRunState: () => ipcRenderer.invoke('get-run-state'),
  onLog: (callback) => ipcRenderer.on('agent-log', (_event, line) => callback(line)),
  onRunState: (callback) => ipcRenderer.on('agent-run-state', (_event, running) => callback(running)),
});
