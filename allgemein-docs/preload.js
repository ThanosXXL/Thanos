const { contextBridge, ipcRenderer } = require('electron');

// Einzige Brücke zwischen Oberfläche und Hauptprozess. Die Oberfläche bekommt weder Node noch Dateizugriff.
contextBridge.exposeInMainWorld('docsAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  saveTextFile: (opts) => ipcRenderer.invoke('save-text-file', opts),
  openTextFile: (opts) => ipcRenderer.invoke('open-text-file', opts)
});
