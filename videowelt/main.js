const { app, BrowserWindow, ipcMain, dialog, shell, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { probeMedia, generateThumbnail, runExport, extractStillFrame, SAMPLES_DIR } = require('./ffmpeg-export');

const DEMO_MUSIC_PATH = path.join(SAMPLES_DIR, 'demo-musik.mp3');
const INTRO_LOGO_PATH = path.join(SAMPLES_DIR, 'intro-logo.mp4');

const thumbDir = path.join(app.getPath('userData'), 'videowelt-thumbnails');
const settingsFile = path.join(app.getPath('userData'), 'videowelt-settings.json');

function ensureThumbDir() {
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  } catch (err) {
    return { lastProjectPath: null };
  }
}

function saveSettings(settings) {
  // Atomar (temp + rename) und 0600, analog zur Dozenten-Dashboard-Härtung,
  // damit ein Absturz mitten im Schreiben nicht die Einstellungen beschädigt.
  const tmpPath = `${settingsFile}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, settingsFile);
  try {
    fs.chmodSync(settingsFile, 0o600);
  } catch (err) {
    // Manche Dateisysteme (z. B. FAT/exFAT) unterstützen keine Unix-Rechte.
  }
}

const MAX_PROJECT_BYTES = 200 * 1024 * 1024; // 200 MB – Projekte referenzieren nur Medienpfade, kein Rohmaterial.

function isValidProjectState(data) {
  return (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Array.isArray(data.mediaLibrary) &&
    typeof data.timeline === 'object' &&
    data.timeline !== null
  );
}

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'];

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
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
  return win;
}

let mainWindow = null;

async function probeToMediaItem(filePath, displayName) {
  const id = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  try {
    const meta = await probeMedia(filePath);
    let thumbnail = null;
    if (meta.hasVideo) {
      ensureThumbDir();
      const thumbPath = path.join(thumbDir, id + '.jpg');
      try {
        await generateThumbnail(filePath, thumbPath, Math.min(1, meta.duration / 2));
        thumbnail = thumbPath;
      } catch (err) {
        thumbnail = null;
      }
    }
    return {
      id,
      path: filePath,
      name: displayName || path.basename(filePath),
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      hasAudio: meta.hasAudio,
      hasVideo: meta.hasVideo,
      thumbnail
    };
  } catch (err) {
    return {
      id,
      path: filePath,
      name: displayName || path.basename(filePath),
      duration: 0,
      width: 0,
      height: 0,
      fps: 30,
      hasAudio: false,
      hasVideo: false,
      thumbnail: null,
      error: 'Datei konnte nicht gelesen werden'
    };
  }
}

ipcMain.handle('import-media', async (event, { kind }) => {
  const extensions = kind === 'audio' ? AUDIO_EXTENSIONS : VIDEO_EXTENSIONS;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: kind === 'audio' ? 'Audio importieren' : 'Videos importieren',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: kind === 'audio' ? 'Audiodateien' : 'Videodateien', extensions }]
  });
  if (result.canceled) return [];

  const items = [];
  for (const filePath of result.filePaths) {
    items.push(await probeToMediaItem(filePath));
  }
  return items;
});

ipcMain.handle('import-demo-music', async () => {
  if (!fs.existsSync(DEMO_MUSIC_PATH)) {
    return { error: 'Die eingebaute Demo-Musik wurde nicht gefunden.' };
  }
  const item = await probeToMediaItem(DEMO_MUSIC_PATH, 'Demo-Musik (VideoWelt)');
  if (item.error) return { error: item.error };
  return { item };
});

ipcMain.handle('import-intro-logo', async () => {
  if (!fs.existsSync(INTRO_LOGO_PATH)) {
    return { error: 'Das eingebaute VideoWelt-Intro wurde nicht gefunden.' };
  }
  const item = await probeToMediaItem(INTRO_LOGO_PATH, 'VideoWelt-Intro');
  if (item.error) return { error: item.error };
  return { item };
});

ipcMain.handle('export-video', async (event, { state, settings }) => {
  const format = settings.format || 'mp4';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Video exportieren',
    defaultPath: (settings.suggestedName || 'VideoWelt-Export') + '.' + format,
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const outputPath = result.filePath;
  const sender = event.sender;

  try {
    await runExport(state, settings, outputPath, (progress) => {
      if (!sender.isDestroyed()) sender.send('export-progress', progress);
    });
    return { canceled: false, path: outputPath };
  } catch (err) {
    return { canceled: false, error: err.message || String(err) };
  }
});

ipcMain.handle('export-frame', async (event, { mediaPath, sourceTime, effects, suggestedName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Standbild exportieren',
    defaultPath: (suggestedName || 'VideoWelt-Standbild') + '.png',
    filters: [{ name: 'PNG-Bild', extensions: ['png'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    await extractStillFrame(mediaPath, sourceTime, effects, result.filePath);
    return { canceled: false, path: result.filePath };
  } catch (err) {
    return { canceled: false, error: err.message || String(err) };
  }
});

ipcMain.handle('save-project', async (event, { state, filePath }) => {
  let targetPath = filePath;
  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Projekt speichern',
      defaultPath: (state.projectName || 'VideoWelt-Projekt') + '.vwproj',
      filters: [{ name: 'VideoWelt Projekt', extensions: ['vwproj'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    targetPath = result.filePath;
  }
  if (!isValidProjectState(state)) {
    return { canceled: false, error: 'Ungültige Projektdatenstruktur – Speichern abgelehnt.' };
  }
  const serialized = JSON.stringify(state, null, 2);
  if (Buffer.byteLength(serialized, 'utf-8') > MAX_PROJECT_BYTES) {
    return { canceled: false, error: 'Projektdatei überschreitet das zulässige Limit.' };
  }
  // Atomar schreiben (temp + rename), damit ein Absturz mitten im Schreiben
  // nicht die bestehende Projektdatei beschädigt.
  const tmpPath = `${targetPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, serialized, 'utf-8');
  fs.renameSync(tmpPath, targetPath);
  const settings = loadSettings();
  settings.lastProjectPath = targetPath;
  saveSettings(settings);
  return { canceled: false, path: targetPath };
});

ipcMain.handle('load-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Projekt öffnen',
    properties: ['openFile'],
    filters: [{ name: 'VideoWelt Projekt', extensions: ['vwproj', 'json'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  const filePath = result.filePaths[0];
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!isValidProjectState(data)) {
      return { canceled: false, error: 'Projektdatei hat ein ungültiges Format.' };
    }
    const settings = loadSettings();
    settings.lastProjectPath = filePath;
    saveSettings(settings);
    return { canceled: false, path: filePath, data };
  } catch (err) {
    return { canceled: false, error: 'Projektdatei konnte nicht gelesen werden' };
  }
});

ipcMain.handle('get-last-project-path', () => {
  return loadSettings().lastProjectPath || null;
});

ipcMain.handle('load-project-path', async (event, filePath) => {
  // Nur die zuletzt von der App selbst gespeicherte/geöffnete Projektdatei
  // wird so nachgeladen (z. B. beim Start); auf eine .vwproj/.json-Endung
  // beschränkt, damit dieser direkt mit einem Renderer-String aufrufbare
  // IPC-Kanal kein beliebiges Auslesen von Dateien auf der Festplatte erlaubt.
  if (typeof filePath !== 'string' || !/\.(vwproj|json)$/i.test(filePath)) {
    return { canceled: false, error: 'Ungültiger Dateipfad' };
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!isValidProjectState(data)) {
      return { canceled: false, error: 'Projektdatei hat ein ungültiges Format.' };
    }
    return { canceled: false, path: filePath, data };
  } catch (err) {
    return { canceled: false, error: 'Projektdatei konnte nicht gelesen werden' };
  }
});

ipcMain.handle('show-item-in-folder', (event, filePath) => {
  shell.showItemInFolder(filePath);
});

app.whenReady().then(() => {
  // Kein Fenster darf Kamera/Mikrofon/Standort/Benachrichtigungen o.Ä.
  // anfordern können – diese App braucht keine dieser Berechtigungen.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });

  Menu.setApplicationMenu(null);
  mainWindow = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
