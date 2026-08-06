const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('patientenweltAPI', {
  hasAccount: () => ipcRenderer.invoke('auth:has-account'),
  listUsers: () => ipcRenderer.invoke('auth:list-users'),
  setup: (name, password) => ipcRenderer.invoke('auth:setup', name, password),
  login: (userId, password) => ipcRenderer.invoke('auth:login', userId, password),
  lock: () => ipcRenderer.invoke('auth:lock'),
  addUser: (name, password, role) => ipcRenderer.invoke('auth:add-user', name, password, role),
  removeUser: (userId) => ipcRenderer.invoke('auth:remove-user', userId),
  changePassword: (userId, oldPassword, newPassword) =>
    ipcRenderer.invoke('auth:change-password', userId, oldPassword, newPassword),

  saveData: (state) => ipcRenderer.invoke('data:save', state),
  reloadData: () => ipcRenderer.invoke('data:reload'),

  listBackups: () => ipcRenderer.invoke('backups:list'),
  restoreBackup: (filename) => ipcRenderer.invoke('backups:restore', filename),

  exportFile: (defaultName, content, filterName, filterExt) =>
    ipcRenderer.invoke('export:save-file', defaultName, content, filterName, filterExt)
});
