const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const PREFS_PATH = path.join(app.getPath('userData'), 'freshtrades-prefs.json');

function loadPrefs() {
  try {
    return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 720,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('save-as', async (event, content) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Seite speichern unter',
    defaultPath: 'freshtrades-frage.txt',
    filters: [{ name: 'Textdatei', extensions: ['txt'] }]
  });

  if (canceled || !filePath) {
    return { saved: false };
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { saved: true, filePath };
});

ipcMain.handle('capture-sniping-screenshot', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const image = await win.webContents.capturePage();

  const prefs = loadPrefs();
  let targetDir = prefs.snipingFolder;

  if (!targetDir || !fs.existsSync(targetDir)) {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Ordner für Sniping-Screenshots wählen',
      properties: ['openDirectory', 'createDirectory']
    });

    if (canceled || filePaths.length === 0) {
      return { saved: false };
    }
    targetDir = filePaths[0];

    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Immer in diesem Ordner speichern', 'Nur dieses Mal'],
      defaultId: 0,
      cancelId: 1,
      title: 'Ordner merken?',
      message: 'Zukünftige Sniping-Screenshots automatisch in diesem Ordner speichern?'
    });

    if (response === 0) {
      prefs.snipingFolder = targetDir;
      savePrefs(prefs);
    }
  }

  const filePath = path.join(targetDir, `freshtrades-sniping-${Date.now()}.png`);
  fs.writeFileSync(filePath, image.toPNG());

  return { saved: true, filePath };
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
