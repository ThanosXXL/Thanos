const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('videoWeltAPI', {
  importVideos: () => ipcRenderer.invoke('import-media', { kind: 'video' }),
  importAudio: () => ipcRenderer.invoke('import-media', { kind: 'audio' }),
  importDemoMusic: () => ipcRenderer.invoke('import-demo-music'),
  exportVideo: (state, settings) => ipcRenderer.invoke('export-video', { state, settings }),
  onExportProgress: (callback) => {
    const listener = (event, progress) => callback(progress);
    ipcRenderer.on('export-progress', listener);
    return () => ipcRenderer.removeListener('export-progress', listener);
  },
  saveProject: (state, filePath) => ipcRenderer.invoke('save-project', { state, filePath }),
  loadProject: () => ipcRenderer.invoke('load-project'),
  getLastProjectPath: () => ipcRenderer.invoke('get-last-project-path'),
  loadProjectByPath: (filePath) => ipcRenderer.invoke('load-project-path', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
