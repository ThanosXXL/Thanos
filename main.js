const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const ROOT = path.join(app.getPath('userData'), 'MusicHeaven');
const UPLOADS_DIR = path.join(ROOT, 'uploads');
const LIBRARY_DIR = path.join(ROOT, 'library');
const UPLOADS_META = path.join(ROOT, 'uploads.json');
const LIBRARY_META = path.join(ROOT, 'library.json');

function ensureDirs() {
  for (const dir of [ROOT, UPLOADS_DIR, LIBRARY_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

const loadUploads = () => readJson(UPLOADS_META, []);
const saveUploads = (list) => writeJson(UPLOADS_META, list);
const loadLibrary = () => readJson(LIBRARY_META, []);
const saveLibrary = (list) => writeJson(LIBRARY_META, list);

function safeExt(ext) {
  const clean = (ext || 'webm').replace(/[^a-z0-9]/gi, '').toLowerCase();
  return clean || 'webm';
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'musicheaven',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true }
  }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1020,
    minHeight: 680,
    backgroundColor: '#05100a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  ensureDirs();

  protocol.handle('musicheaven', (request) => {
    const url = new URL(request.url);
    const kind = url.hostname;
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const baseDir = kind === 'uploads' ? UPLOADS_DIR : kind === 'library' ? LIBRARY_DIR : null;
    if (!baseDir || rel.includes('..')) {
      return new Response('Not found', { status: 404 });
    }
    const filePath = path.join(baseDir, rel);
    if (!filePath.startsWith(baseDir)) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- Ordner 1: hochgeladene Musik ----

ipcMain.handle('uploads:list', () => loadUploads());

ipcMain.handle('uploads:choose', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Musik hochladen',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'webm', 'aac'] }]
  });
  if (canceled || !filePaths.length) return loadUploads();

  const list = loadUploads();
  for (const src of filePaths) {
    const id = crypto.randomUUID();
    const ext = path.extname(src) || '.mp3';
    const storedName = `${id}${ext}`;
    fs.copyFileSync(src, path.join(UPLOADS_DIR, storedName));
    list.push({
      id,
      name: path.basename(src, ext),
      file: storedName,
      url: `musicheaven://uploads/${storedName}`,
      addedAt: Date.now()
    });
  }
  saveUploads(list);
  return list;
});

ipcMain.handle('uploads:delete', (event, id) => {
  const list = loadUploads();
  const idx = list.findIndex((item) => item.id === id);
  if (idx >= 0) {
    const [removed] = list.splice(idx, 1);
    try { fs.unlinkSync(path.join(UPLOADS_DIR, removed.file)); } catch (err) { /* already gone */ }
    saveUploads(list);
  }
  return list;
});

// ---- gespeicherte Mixe & eigene Musikstücke ----

ipcMain.handle('library:list', () => loadLibrary());

ipcMain.handle('library:save', (event, { name, type, ext, bytes }) => {
  const list = loadLibrary();
  const id = crypto.randomUUID();
  const extension = safeExt(ext);
  const storedName = `${id}.${extension}`;
  fs.writeFileSync(path.join(LIBRARY_DIR, storedName), Buffer.from(bytes));
  const entry = {
    id,
    name: name && name.trim() ? name.trim() : `Music Heaven ${new Date().toLocaleString()}`,
    type,
    file: storedName,
    url: `musicheaven://library/${storedName}`,
    createdAt: Date.now()
  };
  list.unshift(entry);
  saveLibrary(list);
  return list;
});

ipcMain.handle('library:delete', (event, id) => {
  const list = loadLibrary();
  const idx = list.findIndex((item) => item.id === id);
  if (idx >= 0) {
    const [removed] = list.splice(idx, 1);
    try { fs.unlinkSync(path.join(LIBRARY_DIR, removed.file)); } catch (err) { /* already gone */ }
    saveLibrary(list);
  }
  return list;
});

// ---- extern speichern ----

ipcMain.handle('export:save-as', async (event, { name, ext, bytes }) => {
  const extension = safeExt(ext);
  const safeName = (name || 'music-heaven-export').replace(/[\\/:*?"<>|]/g, '_');
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Musik extern speichern',
    defaultPath: `${safeName}.${extension}`,
    filters: [{ name: 'Audio', extensions: [extension] }]
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, Buffer.from(bytes));
  return { ok: true, path: filePath };
});
