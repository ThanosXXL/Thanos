const { app, BrowserWindow, ipcMain, dialog, session, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

// Datenschutz: keine Hintergrundverbindungen, nur eine Instanz
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('disable-features', 'SpellcheckService,OptimizationHints,MediaRouter');
if (!app.requestSingleInstanceLock()) app.quit();

const dataFilePath = path.join(app.getPath('userData'), 'patienten-welt-data.json');
const MAX_BYTES = 256 * 1024 * 1024;
const trusted = (event) => !!event.senderFrame && String(event.senderFrame.url).startsWith('file://');

// Gesundheitsdaten werden mit dem Schlüsselbund des Betriebssystems (safeStorage) verschlüsselt, soweit verfügbar.
// Alte, unverschlüsselte Dateien werden weiter gelesen und beim nächsten Speichern verschlüsselt.
function loadData() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    if (parsed && typeof parsed.enc === 'string' && safeStorage.isEncryptionAvailable()) {
      return JSON.parse(safeStorage.decryptString(Buffer.from(parsed.enc, 'base64')));
    }
    return parsed && parsed.enc ? null : parsed;
  } catch (err) {
    return null; // Renderer legt Beispieldaten an
  }
}

// Atomar schreiben (Temp-Datei + Umbenennen), nur für den eigenen Benutzer lesbar
function saveData(data) {
  const text = JSON.stringify(data);
  if (text.length > MAX_BYTES) throw new Error('Daten zu groß');
  const out = safeStorage.isEncryptionAvailable() ? JSON.stringify({ enc: safeStorage.encryptString(text).toString('base64') }) : text;
  const tmp = dataFilePath + '.tmp';
  fs.writeFileSync(tmp, out, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmp, dataFilePath);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#0b1f4b',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: !app.isPackaged
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', (event) => (trusted(event) ? loadData() : null));

ipcMain.handle('save-data', (event, data) => {
  if (!trusted(event) || !data || typeof data !== 'object') return false;
  saveData(data);
  return true;
});

ipcMain.handle('export-backup', async (event, data) => {
  if (!trusted(event)) return false;
  const result = await dialog.showSaveDialog({
    title: 'Datensicherung speichern',
    defaultPath: 'patienten-welt-backup.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
  return true;
});

ipcMain.handle('import-backup', async (event) => {
  if (!trusted(event)) return null;
  const result = await dialog.showOpenDialog({
    title: 'Datensicherung laden',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;
  try {
    return JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
  } catch (err) {
    return null;
  }
});

app.whenReady().then(() => {
  const ses = session.defaultSession;
  // Die App braucht kein Netzwerk: jede Web-Anfrage wird blockiert
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (details, callback) => callback({ cancel: true }));
  ses.setPermissionRequestHandler((wc, permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.setSpellCheckerEnabled(false);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (e) => e.preventDefault());
  contents.on('will-attach-webview', (e) => e.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
