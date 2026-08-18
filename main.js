const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(app.getPath('userData'), 'dozenten-data.json');

function loadData() {
  let raw;
  try {
    raw = fs.readFileSync(dataFilePath, 'utf-8');
  } catch (err) {
    return { dozenten: [] };
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    // Datei ist vorhanden, aber kaputt: Original sichern statt kommentarlos zu verwerfen,
    // damit der Nutzer sie manuell wiederherstellen kann.
    try {
      fs.copyFileSync(dataFilePath, `${dataFilePath}.corrupt-${Date.now()}.bak`);
    } catch (backupErr) {
      // Backup fehlgeschlagen - dann kann auch nichts wiederhergestellt werden, egal.
    }
    return { dozenten: [] };
  }
}

function saveData(data) {
  const tmpPath = `${dataFilePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, dataFilePath);
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
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Sicherheitshärtung: Renderer läuft nur die lokale UI, daher keine Navigation
  // zu fremden URLs und kein Öffnen neuer Fenster zulassen.
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  try {
    saveData(data);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
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
