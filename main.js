const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { getDemoSeed } = require('./demo-data');

// Demo-Modus: `npm run start:demo` bzw. `electron . --demo`. Nutzt eine eigene
// Datendatei mit Beispieldaten, damit echte Nutzerdaten nie überschrieben werden.
const isDemo = process.argv.includes('--demo');
const dataFilePath = path.join(app.getPath('userData'), isDemo ? 'dozenten-data-demo.json' : 'dozenten-data.json');

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (isDemo) {
      const seed = getDemoSeed();
      saveData(seed);
      return seed;
    }
    return { inventar: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
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
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'), isDemo ? { search: 'demo=1' } : undefined);
}

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

app.whenReady().then(() => {
  // Kamera (Fotoerkennung) und Mikrofon (Spracheingabe) für das Inventar-Dashboard erlauben
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media');
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
