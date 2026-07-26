const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('musicHeaven', {
  listUploads: () => ipcRenderer.invoke('uploads:list'),
  chooseUploads: () => ipcRenderer.invoke('uploads:choose'),
  deleteUpload: (id) => ipcRenderer.invoke('uploads:delete', id),

  listLibrary: () => ipcRenderer.invoke('library:list'),
  saveToLibrary: (payload) => ipcRenderer.invoke('library:save', payload),
  deleteLibraryItem: (id) => ipcRenderer.invoke('library:delete', id),
  openLibraryFolder: () => ipcRenderer.invoke('library:open-folder'),

  saveExternal: (payload) => ipcRenderer.invoke('export:save-as', payload)
});
