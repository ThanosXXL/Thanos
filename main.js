const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(app.getPath('userData'), 'dozenten-data.json');
const documentsDir = path.join(app.getPath('userData'), 'documents');

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { dozenten: [] };
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
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('upload-document', async (event, dozentId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'PDF-Dokument auswählen',
    filters: [{ name: 'PDF-Dateien', extensions: ['pdf'] }],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths.length) return null;

  const sourcePath = result.filePaths[0];
  if (path.extname(sourcePath).toLowerCase() !== '.pdf') return null;

  try {
    fs.mkdirSync(documentsDir, { recursive: true });
    const originalName = path.basename(sourcePath);
    const storedFileName = `${uid()}-${originalName}`;
    fs.copyFileSync(sourcePath, path.join(documentsDir, storedFileName));

    return {
      id: uid(),
      name: originalName,
      fileName: storedFileName,
      addedAt: new Date().toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  } catch (err) {
    return null;
  }
});

ipcMain.handle('open-document', (event, fileName) => {
  const safeName = path.basename(fileName);
  return shell.openPath(path.join(documentsDir, safeName));
});

ipcMain.handle('delete-document', (event, fileName) => {
  const safeName = path.basename(fileName);
  try {
    fs.unlinkSync(path.join(documentsDir, safeName));
  } catch (err) {
    // Datei war bereits entfernt oder existiert nicht mehr
  }
  return true;
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
