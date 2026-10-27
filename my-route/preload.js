'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Einzige Brücke zwischen Oberfläche und Hauptprozess: nur diese Funktionen, keine Rohzugriffe auf ipcRenderer.
contextBridge.exposeInMainWorld(
  'myRouteAPI',
  Object.freeze({
    loadData: () => ipcRenderer.invoke('load-data'),
    saveData: (data) => ipcRenderer.invoke('save-data', data),
    wipeData: () => ipcRenderer.invoke('wipe-data'),
    exportData: (data) => ipcRenderer.invoke('export-data', data),
    importData: () => ipcRenderer.invoke('import-data'),
    openExternal: (url) => ipcRenderer.invoke('open-external', String(url)),
    routeOptions: (req) => ipcRenderer.invoke('route-options', req),
    geocode: (query) => ipcRenderer.invoke('geocode', String(query)),
    getAppInfo: () => ipcRenderer.invoke('app-info'),
    getUpdateStatus: () => ipcRenderer.invoke('update-status'),
    checkUpdates: () => ipcRenderer.invoke('update-check'),
    installUpdate: () => ipcRenderer.invoke('update-install'),
    onUpdateStatus: (cb) => {
      if (typeof cb !== 'function') return () => {};
      const listener = (event, status) => cb(status && typeof status === 'object' ? { ...status } : { state: 'idle' });
      ipcRenderer.on('update-status', listener);
      return () => ipcRenderer.removeListener('update-status', listener);
    }
  })
);
