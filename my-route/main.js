const { app, BrowserWindow, ipcMain, Menu, dialog, session, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');

const dataFilePath = path.join(app.getPath('userData'), 'my-route-data.json');

// Obergrenze gegen eine fehlerhafte Payload, die die Datenablage unbegrenzt wachsen lässt.
const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024; // 50 MB – Favoriten sind praktisch unbegrenzt

// Nur diese Karten-Dienste dürfen über „Route fahren“ im Systembrowser geöffnet werden.
const ALLOWED_LINK_HOSTS = new Set([
  'www.google.com',
  'maps.apple.com',
  'www.openstreetmap.org'
]);

function emptyState() {
  return { favorites: [], routes: [] };
}

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return emptyState();
  }
}

function isValidState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!Array.isArray(data.favorites) || !Array.isArray(data.routes)) return false;
  const favsOk = data.favorites.every(
    (f) => f && typeof f === 'object' && typeof f.id === 'string' && typeof f.name === 'string'
  );
  const routesOk = data.routes.every(
    (r) =>
      r &&
      typeof r === 'object' &&
      typeof r.id === 'string' &&
      typeof r.name === 'string' &&
      Array.isArray(r.stops)
  );
  return favsOk && routesOk;
}

function saveData(data) {
  if (!isValidState(data)) {
    throw new Error('Ungültige Datenstruktur – Speichern abgelehnt.');
  }
  const serialized = JSON.stringify(data, null, 2);
  if (Buffer.byteLength(serialized, 'utf-8') > MAX_PAYLOAD_BYTES) {
    throw new Error('Datenmenge überschreitet das zulässige Limit.');
  }
  // Atomar schreiben (temp + rename) und nur für den aktuellen Benutzer lesbar (0600):
  // Adressen und Fahrtziele sind personenbezogene Daten.
  const tmpPath = `${dataFilePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, serialized, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, dataFilePath);
  try {
    fs.chmodSync(dataFilePath, 0o600);
  } catch (err) {
    // Manche Dateisysteme (z. B. FAT/exFAT) kennen keine Unix-Rechte.
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#050403',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });

  win.setMenuBarVisibility(false);
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', () => loadData());

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('export-data', async (event, data) => {
  if (!isValidState(data)) {
    throw new Error('Ungültige Datenstruktur – Export abgelehnt.');
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Favoriten & Routen sichern',
    defaultPath: 'my-route-sicherung.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { exported: false };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { exported: true, filePath };
});

ipcMain.handle('import-data', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Sicherung einlesen',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePaths.length) return { imported: false };
  const stat = fs.statSync(filePaths[0]);
  if (stat.size > MAX_PAYLOAD_BYTES) throw new Error('Datei ist zu groß.');
  const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  if (!isValidState(data)) throw new Error('Das ist keine gültige My-Route-Sicherung.');
  return { imported: true, data };
});

// „Route fahren“: nur https-Links zu den erlaubten Karten-Diensten.
ipcMain.handle('open-external', async (event, url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    return { opened: false, reason: 'invalid-url' };
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_LINK_HOSTS.has(parsed.hostname)) {
    return { opened: false, reason: 'host-not-allowed' };
  }
  await shell.openExternal(parsed.toString());
  return { opened: true };
});

// Optionale Adresssuche – läuft ausschließlich auf ausdrücklichen Klick des Nutzers.
// Es wird nur der eingegebene Suchtext an Nominatim (OpenStreetMap) gesendet.
ipcMain.handle('geocode', async (event, query) => {
  if (typeof query !== 'string' || !query.trim() || query.length > 200) return null;
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
    encodeURIComponent(query.trim());
  const res = await net.fetch(url, {
    headers: { 'User-Agent': 'MyRoute-Desktop/1.0 (IT-WORLD)', 'Accept-Language': 'de' }
  });
  if (!res.ok) return null;
  const list = await res.json();
  if (!Array.isArray(list) || !list.length) return null;
  const lat = Number(list[0].lat);
  const lon = Number(list[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, label: String(list[0].display_name || '') };
});

// Live-Routenoptionen: nur Start/Ziel-Koordinaten (Zahlen) gehen an den OSRM-Dienst.
ipcMain.handle('route-options', async (event, req) => {
  const ok = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
  if (!req || !ok(req.from) || !ok(req.to)) return null;
  const url =
    `https://router.project-osrm.org/route/v1/driving/${req.from.lon},${req.from.lat};${req.to.lon},${req.to.lat}` +
    '?alternatives=3&overview=simplified&geometries=geojson';
  const res = await net.fetch(url, { headers: { 'User-Agent': 'MyRoute-Desktop/1.0 (IT-WORLD)' } });
  if (!res.ok) throw new Error('Routing-Dienst antwortet nicht');
  return res.json();
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });

  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
