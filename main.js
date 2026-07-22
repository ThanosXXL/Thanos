const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  session,
  dialog
} = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const dataFilePath = path.join(app.getPath('userData'), 'dozenten-data.json');
const settingsFilePath = path.join(app.getPath('userData'), 'dashboard-settings.json');

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

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function saveSettings(settings) {
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
}

// Lädt den kompletten Bildschirm als Screenshot (Basis für den Sniping-Zuschnitt).
async function captureScreen() {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.size;
  const scaleFactor = primary.scaleFactor || 1;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(width * scaleFactor),
      height: Math.round(height * scaleFactor)
    }
  });
  const source = sources[0];
  return source && !source.thumbnail.isEmpty() ? source.thumbnail.toDataURL() : null;
}

// Lädt ein PNG (Buffer) per Multipart-Upload in Google Drive hoch.
// Benötigt einen gültigen OAuth-Access-Token mit Drive-Berechtigung.
function uploadToGoogleDrive(buffer, filename) {
  return new Promise((resolve) => {
    const settings = loadSettings();
    const token = settings.googleDriveToken;
    if (!token) {
      resolve({ ok: false, reason: 'no-token' });
      return;
    }

    const boundary = '----drive-boundary-' + Date.now();
    const metadata = JSON.stringify({ name: filename });
    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
      ),
      Buffer.from(`--${boundary}\r\nContent-Type: image/png\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const req = https.request(
      {
        hostname: 'www.googleapis.com',
        path: '/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartBody.length
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            let file = null;
            try {
              file = JSON.parse(body);
            } catch (err) {
              /* Antwort ohne JSON-Body ignorieren */
            }
            resolve({ ok: true, file });
          } else {
            resolve({ ok: false, reason: 'http-' + res.statusCode });
          }
        });
      }
    );

    req.on('error', (err) => resolve({ ok: false, reason: err.message }));
    req.write(multipartBody);
    req.end();
  });
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

ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (event, settings) => {
  saveSettings(settings);
  return true;
});

ipcMain.handle('capture-screen', () => {
  return captureScreen();
});

// Speichert einen Screenshot lokal (Bilder-Ordner) und lädt ihn optional zu Google Drive hoch.
ipcMain.handle('save-screenshot', async (event, payload) => {
  const { dataUrl, toDrive } = payload || {};
  if (!dataUrl) {
    return { ok: false, reason: 'no-data' };
  }
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const filename = `screenshot-${Date.now()}.png`;
  const filePath = path.join(app.getPath('pictures'), filename);

  try {
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    return { ok: false, reason: 'write-failed: ' + err.message };
  }

  let drive = null;
  if (toDrive) {
    drive = await uploadToGoogleDrive(buffer, filename);
  }
  return { ok: true, filePath, filename, drive };
});

// Öffnet den Datei-Dialog des Geräts, um eine Datei aus einem Ordner zur Freigabe auszuwählen.
ipcMain.handle('open-file-dialog', async () => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const result = await dialog.showOpenDialog(win, {
    title: 'Datei zur Freigabe auswählen',
    properties: ['openFile', 'multiSelections']
  });
  if (result.canceled || !result.filePaths.length) {
    return { canceled: true, files: [] };
  }
  const files = result.filePaths.map((fp) => {
    let size = 0;
    try {
      size = fs.statSync(fp).size;
    } catch (err) {
      /* Größe optional */
    }
    return { path: fp, name: path.basename(fp), size };
  });
  return { canceled: false, files };
});

app.whenReady().then(() => {
  // Kamera-/Mikrofon-Zugriff für den Video-Live-Chat erlauben.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'mediaKeySystem') {
      callback(true);
      return;
    }
    callback(true);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
