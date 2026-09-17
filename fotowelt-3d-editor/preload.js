const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('editorAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  selectImages: () => ipcRenderer.invoke('select-images'),
  selectLogo: () => ipcRenderer.invoke('select-logo'),
  selectMusic: () => ipcRenderer.invoke('select-music'),
  selectExportPath: (defaultName) => ipcRenderer.invoke('select-export-path', defaultName),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),

  saveImage: (defaultName, buffer) => ipcRenderer.invoke('save-image', defaultName, buffer),
  copyImageToClipboard: (buffer) => ipcRenderer.invoke('copy-image-to-clipboard', buffer),
  copyTextToClipboard: (text) => ipcRenderer.invoke('copy-text-to-clipboard', text),

  exportBegin: () => ipcRenderer.invoke('export-begin'),
  exportWriteFrame: (tempDir, imageIndex, subFrameIndex, buffer) =>
    ipcRenderer.invoke('export-write-frame', tempDir, imageIndex, subFrameIndex, buffer),
  exportRenderVideo: (params) => ipcRenderer.invoke('export-render-video', params),
  exportCancel: () => ipcRenderer.invoke('export-cancel'),
  onExportProgress: (callback) => {
    const listener = (event, percent) => callback(percent);
    ipcRenderer.on('export-progress', listener);
    return () => ipcRenderer.removeListener('export-progress', listener);
  }
});
