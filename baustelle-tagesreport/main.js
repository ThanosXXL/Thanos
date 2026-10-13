const { app, BrowserWindow, ipcMain, Menu, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(app.getPath('userData'), 'tagesreport-data.json');

// Großzügige, aber endliche Obergrenze gegen eine fehlerhafte/böswillige
// Payload, die die Datenablage unbegrenzt wachsen lässt (Dienst-Härtung).
// Höher als bei reinen Text-Apps, da hier auch Screenshots (Data-URLs)
// abgelegt werden.
const MAX_PAYLOAD_BYTES = 40 * 1024 * 1024; // 40 MB
const MAX_KEY_LENGTH = 200;

function loadStore() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return isValidStore(parsed) ? parsed : {};
  } catch (err) {
    return {};
  }
}

function isValidStore(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return Object.entries(data).every(
    ([key, value]) => typeof key === 'string' && key.length <= MAX_KEY_LENGTH && typeof value === 'string'
  );
}

function saveStore(data) {
  if (!isValidStore(data)) {
    throw new Error('Ungültige Datenstruktur – Speichern abgelehnt.');
  }
  const serialized = JSON.stringify(data, null, 2);
  if (Buffer.byteLength(serialized, 'utf-8') > MAX_PAYLOAD_BYTES) {
    throw new Error('Datenmenge überschreitet das zulässige Limit.');
  }
  // Atomar schreiben (temp + rename), damit ein Absturz mitten im Schreibvorgang
  // nicht die bestehende Datendatei beschädigt; 0600, da betriebliche Daten
  // (Berichte, Fotos) nur für den aktuellen Benutzer lesbar sein sollen.
  const tmpPath = `${dataFilePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, serialized, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, dataFilePath);
  try {
    fs.chmodSync(dataFilePath, 0o600);
  } catch (err) {
    // Manche Dateisysteme (z. B. FAT/exFAT) unterstützen keine Unix-Rechte.
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 880,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: '#14171c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });

  win.setMenuBarVisibility(false);

  // Keine Navigation weg von der lokal geladenen Oberfläche und keine neuen
  // Fenster/Popups zulassen – die App lädt nie Remote-Inhalte, daher gibt es
  // dafür keinen legitimen Anwendungsfall.
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('report-storage-get', (event, key) => {
  if (typeof key !== 'string') return null;
  const data = loadStore();
  return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
});

ipcMain.handle('report-storage-set', (event, key, value) => {
  if (typeof key !== 'string' || key.length > MAX_KEY_LENGTH || typeof value !== 'string') {
    throw new Error('Ungültiger Schlüssel/Wert – Speichern abgelehnt.');
  }
  const data = loadStore();
  data[key] = value;
  saveStore(data);
  return true;
});

ipcMain.handle('report-storage-delete', (event, key) => {
  if (typeof key !== 'string') return true;
  const data = loadStore();
  delete data[key];
  saveStore(data);
  return true;
});

ipcMain.handle('report-storage-list', (event, prefix) => {
  const safePrefix = typeof prefix === 'string' ? prefix : '';
  const data = loadStore();
  return Object.keys(data).filter((k) => k.startsWith(safePrefix));
});

ipcMain.handle('report-storage-clear', () => {
  saveStore({});
  return true;
});

ipcMain.handle('report-storage-export', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const data = loadStore();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Daten exportieren',
    defaultPath: 'baustelle-tagesreport-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { exported: false };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { exported: true, filePath };
});

app.whenReady().then(() => {
  // Kein Fenster darf Kamera/Mikrofon/Standort/Benachrichtigungen o.Ä.
  // anfordern können – diese App braucht keine dieser Berechtigungen (der
  // Screenshot-Import läuft über einen normalen Datei-Dialog, nicht über
  // Kamera-/Mediazugriff).
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });

  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
