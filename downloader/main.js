const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Offizielles Repository, aus dem die neueste Version geladen wird.
const REPO = 'ThanosXXL/Thanos';

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 440,
    resizable: false,
    backgroundColor: '#3b2410',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));
  return win;
}

app.whenReady().then(() => {
  mainWindow = createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function sendStatus(status, extra) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-status', Object.assign({ status }, extra));
  }
}

function assetExtensionForPlatform() {
  if (process.platform === 'win32') return '.exe';
  if (process.platform === 'darwin') return '.dmg';
  return '.AppImage';
}

ipcMain.handle('start-download', async () => {
  const headers = { 'User-Agent': 'DozentenDashboard-Downloader' };

  try {
    sendStatus('searching');

    const apiUrl = `https://api.github.com/repos/${REPO}/releases/latest`;
    const apiRes = await fetch(apiUrl, { headers });
    if (!apiRes.ok) {
      throw new Error(`GitHub-API antwortete mit Status ${apiRes.status}. Bitte Internetverbindung prüfen.`);
    }
    const release = await apiRes.json();

    const wantedExt = assetExtensionForPlatform();
    const asset = (release.assets || []).find(
      (a) => a.name.endsWith(wantedExt) && !a.name.toLowerCase().includes('downloader')
    );
    if (!asset) {
      throw new Error(`Im Release '${release.tag_name}' wurde keine passende Installationsdatei (${wantedExt}) gefunden.`);
    }

    sendStatus('downloading', { name: asset.name });

    const destDir = path.join(os.homedir(), 'Desktop');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, asset.name);

    const fileRes = await fetch(asset.browser_download_url, { headers });
    if (!fileRes.ok) {
      throw new Error('Download der Installationsdatei fehlgeschlagen.');
    }
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
      throw new Error('Download war leer oder fehlgeschlagen.');
    }

    sendStatus('launching', { name: asset.name, path: destPath });
    await shell.openPath(destPath);

    sendStatus('done', { name: asset.name, path: destPath });
    return { ok: true, path: destPath };
  } catch (err) {
    sendStatus('error', { message: err.message });
    return { ok: false, message: err.message };
  }
});
