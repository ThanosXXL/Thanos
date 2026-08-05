const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('patientenweltAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data)
});
