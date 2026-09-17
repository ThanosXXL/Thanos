const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studioAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  importImages: (auftragId) => ipcRenderer.invoke('import-images', auftragId),
  pickMusic: (auftragId) => ipcRenderer.invoke('pick-music', auftragId),
  saveEditedImage: (payload) => ipcRenderer.invoke('save-edited-image', payload),
  createSlideshowVideo: (payload) => ipcRenderer.invoke('create-slideshow-video', payload),
  openMediaPath: (filePath) => ipcRenderer.invoke('open-media-path', filePath),
  revealMediaPath: (filePath) => ipcRenderer.invoke('reveal-media-path', filePath),
  deleteMediaFile: (filePath) => ipcRenderer.invoke('delete-media-file', filePath)
});
