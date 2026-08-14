const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'iptv-dashboard-settings.json');

async function loadSettings() {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { lastM3uUrl: '' };
  }
}

async function saveSettings(settings) {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

function createWindow() {
  // Many public IPTV streaming hosts omit CORS headers, which blocks hls.js
  // (running in the renderer) from reading playlist/segment responses. Since
  // this app only ever talks to the M3U/stream URLs the user supplies,
  // relaxing CORS on responses for this session is safe and is the standard
  // approach for Electron-based IPTV players.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    headers['Access-Control-Allow-Origin'] = ['*'];
    callback({ responseHeaders: headers });
  });

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#08132b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-settings', () => loadSettings());
ipcMain.handle('save-settings', (_event, settings) => saveSettings(settings));

const M3U_FETCH_TIMEOUT_MS = 20000;

ipcMain.handle('fetch-m3u', async (_event, url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'Die eingegebene Adresse ist keine gültige URL.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Nur http(s)-Links werden unterstützt.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), M3U_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
    if (!response.ok) {
      return { ok: false, error: `Server antwortete mit Status ${response.status}` };
    }
    const text = await response.text();
    return { ok: true, text };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, error: `Zeitüberschreitung beim Laden der Playlist (${M3U_FETCH_TIMEOUT_MS / 1000}s).` };
    }
    return { ok: false, error: err.message || 'Unbekannter Fehler beim Laden der M3U-Playlist.' };
  } finally {
    clearTimeout(timeout);
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
