const { app, BrowserWindow, ipcMain, Menu, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(app.getPath('userData'), 'dozenten-data.json');

// Großzügige, aber endliche Obergrenze gegen eine fehlerhafte/böswillige
// Payload, die die Datenablage unbegrenzt wachsen lässt (Dienst-Härtung).
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { dozenten: [] };
  }
}

function isValidDashboardState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!Array.isArray(data.dozenten)) return false;
  return data.dozenten.every(
    (d) => d && typeof d === 'object' && typeof d.id === 'string' && typeof d.name === 'string'
  );
}

function saveData(data) {
  if (!isValidDashboardState(data)) {
    throw new Error('Ungültige Datenstruktur – Speichern abgelehnt.');
  }
  const serialized = JSON.stringify(data, null, 2);
  if (Buffer.byteLength(serialized, 'utf-8') > MAX_PAYLOAD_BYTES) {
    throw new Error('Datenmenge überschreitet das zulässige Limit.');
  }
  // Atomar schreiben (temp + rename), damit ein Absturz mitten im Schreibvorgang
  // nicht die bestehende Datendatei beschädigt; 0600, da personenbezogene Daten
  // (Namen, Chat-Notizen) nur für den aktuellen Benutzer lesbar sein sollen.
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
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#ffffff',
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

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('export-data', async (event, data) => {
  if (!isValidDashboardState(data)) {
    throw new Error('Ungültige Datenstruktur – Export abgelehnt.');
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Daten exportieren',
    defaultPath: 'dozenten-dashboard-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { exported: false };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { exported: true, filePath };
});

app.whenReady().then(() => {
  // Kein Fenster darf Kamera/Mikrofon/Standort/Benachrichtigungen o.Ä.
  // anfordern können – diese App braucht keine dieser Berechtigungen.
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
