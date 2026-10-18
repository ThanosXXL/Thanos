const { contextBridge, ipcRenderer } = require('electron');

// Einzige Brücke zwischen Oberfläche und Hauptprozess. Jede Funktion ist ein fest
// verdrahteter Kanal – der Renderer kann keine beliebigen Kanäle ansprechen.
const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

function listen(channel, cb) {
  if (typeof cb !== 'function') return () => {};
  const l = (event, payload) => cb(payload);
  ipcRenderer.on(channel, l);
  return () => ipcRenderer.removeListener(channel, l);
}

contextBridge.exposeInMainWorld('complianceAPI', {
  vaultStatus: call('vault-status'),
  loadData: call('load-data'),
  saveData: call('save-data'),
  unlock: call('unlock'),
  lock: call('lock'),
  setPassword: call('set-password'),
  changePassword: call('change-password'),
  removePassword: call('remove-password'),
  wipeData: call('wipe-data'),
  getInfo: call('get-info'),
  getLogo: call('get-logo'),
  exportData: call('export-data'),
  importData: call('import-data'),
  importDecrypt: call('import-decrypt'),
  importCancel: call('import-cancel'),
  exportReportHtml: call('export-report-html'),
  exportReportPdf: call('export-report-pdf'),
  saveText: call('save-text'),
  copyText: call('copy-text'),
  pickEvidenceFile: call('pick-evidence-file'),
  openEvidenceFile: call('open-evidence-file'),
  onMenu: (cb) => listen('menu', cb),
  onLocked: (cb) => listen('locked', cb)
});
