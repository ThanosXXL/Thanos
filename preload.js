const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  hasPin: () => ipcRenderer.invoke('has-pin'),
  setPin: (pin) => ipcRenderer.invoke('set-pin', pin),
  verifyPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
  removePin: (currentPin) => ipcRenderer.invoke('remove-pin', currentPin),

  getLicense: () => ipcRenderer.invoke('get-license'),
  activateLicense: (key) => ipcRenderer.invoke('activate-license', key),
  setAutoRenew: (value) => ipcRenderer.invoke('set-auto-renew', value),
  cancelLicense: () => ipcRenderer.invoke('cancel-license'),

  listBackups: () => ipcRenderer.invoke('list-backups'),
  restoreBackup: (file) => ipcRenderer.invoke('restore-backup', file)
});
