const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const license = require('./license/activation');

const dataFilePath = () => path.join(app.getPath('userData'), 'steuerwelt-data.json');
const backupDir = () => path.join(app.getPath('userData'), 'backups');
const MAX_BACKUPS = 10;

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath(), 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { mandanten: [], fristenVorlagen: [], users: [] };
  }
}

function rotateBackups() {
  try {
    const dir = backupDir();
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(dataFilePath(), path.join(dir, `steuerwelt-data-${stamp}.json`));

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('steuerwelt-data-'))
      .sort();
    while (files.length > MAX_BACKUPS) {
      fs.unlinkSync(path.join(dir, files.shift()));
    }
  } catch (err) {
    // Backup ist ein Sicherheitsnetz, kein kritischer Pfad -> Fehler nicht eskalieren.
  }
}

function saveData(data) {
  if (fs.existsSync(dataFilePath())) rotateBackups();
  fs.writeFileSync(dataFilePath(), JSON.stringify(data, null, 2), 'utf-8');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#041a3d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', () => loadData());

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('license:status', () => license.getStatus(app.getPath('userData')));
ipcMain.handle('license:activate', (event, licenseKey) =>
  license.activate(app.getPath('userData'), licenseKey)
);
ipcMain.handle('license:deactivate', () => license.deactivateThisDevice(app.getPath('userData')));

ipcMain.handle('documents:choose-file', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('documents:open-file', (event, filePath) => {
  if (filePath) shell.openPath(filePath);
});

ipcMain.handle('invoice:export-pdf', async (event, { html, suggestedName }) => {
  const saveResult = await dialog.showSaveDialog({
    defaultPath: suggestedName || 'Rechnung.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (saveResult.canceled || !saveResult.filePath) return { ok: false };

  const printWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' }
    });
    fs.writeFileSync(saveResult.filePath, pdfBuffer);
    return { ok: true, filePath: saveResult.filePath };
  } finally {
    printWin.destroy();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
