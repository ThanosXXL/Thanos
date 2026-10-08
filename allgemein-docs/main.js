const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Datenschutz: keine Hintergrundverbindungen (Rechtschreib-Wörterbücher, Komponenten-Updates, Pings)
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('no-pings');
app.commandLine.appendSwitch('disable-features', 'SpellcheckService,OptimizationHints,MediaRouter');

// Nur eine Instanz: verhindert, dass zwei Fenster gleichzeitig dieselbe Datendatei überschreiben
if (!app.requestSingleInstanceLock()) app.quit();

const dataFilePath = path.join(app.getPath('userData'), 'allgemein-docs-data.json');
const MAX_BYTES = 512 * 1024 * 1024;
let lastBackupAt = 0;
let mainWindow = null;

// Die Datei enthält ausschließlich den verschlüsselten Tresor (siehe renderer/vault.js).
function loadData() {
  for (const file of [dataFilePath, dataFilePath + '.bak']) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (err) { /* nächste Datei versuchen */ }
  }
  return null; // Renderer startet den Einrichtungsassistenten
}

// Atomar schreiben (Temp-Datei + Umbenennen), nur für den eigenen Benutzer lesbar, gelegentlich eine Sicherheitskopie
function saveData(data) {
  const text = JSON.stringify(data);
  if (text.length > MAX_BYTES) throw new Error('Daten zu groß');
  const tmp = dataFilePath + '.tmp';
  fs.writeFileSync(tmp, text, { encoding: 'utf-8', mode: 0o600 });
  if (fs.existsSync(dataFilePath) && Date.now() - lastBackupAt > 5 * 60 * 1000) {
    try {
      fs.copyFileSync(dataFilePath, dataFilePath + '.bak');
      fs.chmodSync(dataFilePath + '.bak', 0o600);
      lastBackupAt = Date.now();
    } catch (err) { /* Kopie ist optional */ }
  }
  fs.renameSync(tmp, dataFilePath);
}

const trusted = (event) => !!event.senderFrame && String(event.senderFrame.url).startsWith('file://');
const safeName = (n, fallback) => path.basename(String(n || fallback)).replace(/[^\w.\- äöüÄÖÜß]/g, '_');

function createWindow() {
  mainWindow = new BrowserWindow({
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
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', (event) => {
  if (!trusted(event)) return null;
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  if (!trusted(event) || !data || typeof data !== 'object') return false;
  saveData(data);
  return true;
});

// Datei speichern (Sicherung, Auskunft, Protokoll-Export): Dialog im Hauptprozess, Datei nur für den Benutzer lesbar
ipcMain.handle('save-text-file', async (event, opts) => {
  if (!trusted(event) || !opts || typeof opts.text !== 'string' || opts.text.length > MAX_BYTES) return { ok: false };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: opts.title || 'Datei speichern',
    defaultPath: safeName(opts.defaultName, 'allgemein-docs.txt'),
    filters: Array.isArray(opts.filters) ? opts.filters.slice(0, 4) : [{ name: 'Alle Dateien', extensions: ['*'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };
  fs.writeFileSync(result.filePath, opts.text, { encoding: 'utf-8', mode: 0o600 });
  return { ok: true, name: path.basename(result.filePath) };
});

ipcMain.handle('open-text-file', async (event, opts) => {
  if (!trusted(event)) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: (opts && opts.title) || 'Datei öffnen',
    properties: ['openFile'],
    filters: opts && Array.isArray(opts.filters) ? opts.filters.slice(0, 4) : [{ name: 'Alle Dateien', extensions: ['*'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;
  const file = result.filePaths[0];
  if (fs.statSync(file).size > MAX_BYTES) return null;
  return { name: path.basename(file), text: fs.readFileSync(file, 'utf-8') };
});

app.whenReady().then(() => {
  const ses = session.defaultSession;
  // Die App braucht kein Netzwerk: jede Web-Anfrage wird blockiert (nur lokale Dateien)
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (details, callback) => callback({ cancel: true }));
  ses.setPermissionRequestHandler((wc, permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.setSpellCheckerEnabled(false);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Keine fremden Seiten, keine neuen Fenster, keine Webviews
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (e) => e.preventDefault());
  contents.on('will-attach-webview', (e) => e.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
