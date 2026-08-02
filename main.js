const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(app.getPath('userData'), 'buchhaltung-data.json');

let mainWindow = null;
let tray = null;
let isQuitting = false;

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { administratoren: [], einstellungen: {} };
  }
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#fff4e0',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  const notifyHidden = () => mainWindow.webContents.send('app-visibility-changed', 'hidden');
  const notifyVisible = () => mainWindow.webContents.send('app-visibility-changed', 'visible');

  // Chromium's document.visibilitychange does not fire reliably for a hidden/minimized
  // Electron BrowserWindow, so the PIN auto-lock relies on these window-level events instead.
  mainWindow.on('hide', notifyHidden);
  mainWindow.on('minimize', notifyHidden);
  mainWindow.on('blur', notifyHidden);
  mainWindow.on('show', notifyVisible);
  mainWindow.on('restore', notifyVisible);
  mainWindow.on('focus', notifyVisible);
}

function createTray() {
  const trayIconPath = path.join(__dirname, 'assets', 'tray.png');
  const image = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip('Buchhaltung!');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Öffnen',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Beenden',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || 'Buchhaltung!',
      body: body || '',
      icon: path.join(__dirname, 'build', 'icon.png')
    });
    notification.show();
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
  return true;
});

ipcMain.handle('get-autostart', () => {
  const settings = app.getLoginItemSettings();
  return !!settings.openAtLogin;
});

ipcMain.handle('set-autostart', (event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: !!enabled });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('export-csv', async (event, { defaultName, csvContent }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'CSV exportieren',
    defaultPath: defaultName,
    filters: [{ name: 'CSV-Datei', extensions: ['csv'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, csvContent, 'utf-8');
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('export-backup', async (event, { jsonContent }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Datensicherung exportieren',
    defaultPath: `buchhaltung-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON-Datei', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, jsonContent, 'utf-8');
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('import-backup', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Datensicherung importieren',
    properties: ['openFile'],
    filters: [{ name: 'JSON-Datei', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const data = JSON.parse(raw);
    return { canceled: false, data };
  } catch (err) {
    return { canceled: true, error: 'Datei konnte nicht gelesen werden.' };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // App bleibt im Tray aktiv (für tägliche Erinnerungen), außer auf macOS-Konvention
});
