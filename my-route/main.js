'use strict';
const { app, BrowserWindow, ipcMain, Menu, dialog, session, shell, net, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { createStore, emptyState } = require('./lib/store');
const { createUpdater } = require('./lib/updater');
const { isAllowedExternalUrl, isTrustedSender, isCoord, readLimitedText, sanitizeOsrm } = require('./lib/security');

// ---- Grundhärtung vor dem Start --------------------------------------------------------------------
// Hinweis: Das Fenster läuft mit sandbox: true (siehe createWindow). Ein globales app.enableSandbox() wird bewusst nicht
// verwendet, damit Linux-Systeme mit eingeschränkten Benutzer-Namensräumen die Notlösung --no-sandbox weiter nutzen können.
app.commandLine.appendSwitch('disable-background-networking'); // keine Hintergrund-Verbindungen von Chromium
app.commandLine.appendSwitch('no-pings');
app.setAppUserModelId('de.itworld.myroute');

// Obergrenze gegen eine fehlerhafte Payload, die die Datenablage unbegrenzt wachsen lässt.
// Favoriten selbst sind unbegrenzt – 50 MB reichen für viele Zehntausend Einträge.
const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;
const NET_TIMEOUT_MS = 10000;

let mainWindow = null;
let store = null;
let updater = null;
let current = emptyState(); // zuletzt geladener/gespeicherter Zustand (für Update-Einstellung)

function isValidState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!Array.isArray(data.favorites) || !Array.isArray(data.routes)) return false;
  const favsOk = data.favorites.every((f) => f && typeof f === 'object' && typeof f.id === 'string' && typeof f.name === 'string');
  const routesOk = data.routes.every((r) => r && typeof r === 'object' && typeof r.id === 'string' && typeof r.name === 'string' && Array.isArray(r.stops));
  return favsOk && routesOk;
}

// Jeder IPC-Aufruf wird geprüft: nur vom Hauptframe des eigenen Fensters.
function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || !isTrustedSender(event, mainWindow.webContents)) throw new Error('Aufruf nicht erlaubt.');
    return fn(event, ...args);
  });
}

async function fetchLimited(url, expectedHost, headers, maxBytes) {
  const res = await net.fetch(url, { headers, signal: AbortSignal.timeout(NET_TIMEOUT_MS) });
  if (new URL(res.url).hostname !== expectedHost) throw new Error('Unerwartete Weiterleitung');
  if (!res.ok) throw new Error('Dienst antwortet nicht');
  return JSON.parse(await readLimitedText(res, maxBytes));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#050403',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      spellcheck: false, // kein Rechtschreib-Dienst, der Eingaben verarbeitet
      navigateOnDragDrop: false,
      safeDialogs: true,
      devTools: !app.isPackaged
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('did-finish-load', () => {
    if (updater) mainWindow.webContents.send('update-status', updater.getStatus());
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// Für jedes WebContents: keine Webviews, keine Navigation/Weiterleitung weg von der lokalen Oberfläche, keine Popups.
app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault());
  contents.on('will-navigate', (e, url) => { if (url !== contents.getURL()) e.preventDefault(); });
  contents.on('will-redirect', (e) => e.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
app.on('certificate-error', (event, wc, url, error, cert, callback) => { event.preventDefault(); callback(false); });
app.on('select-client-certificate', (event) => event.preventDefault());

function registerIpc() {
  handle('load-data', () => {
    const r = store.load();
    current = r.state;
    return { state: r.state, status: r.status, backupName: r.backupPath ? path.basename(r.backupPath) : null };
  });

  handle('save-data', (event, data) => {
    store.save(data);
    current = data;
    return true;
  });

  // Recht auf Löschung (Art. 17 DSGVO)
  handle('wipe-data', () => {
    store.wipe();
    current = emptyState();
    return true;
  });

  handle('export-data', async (event, data) => {
    if (!isValidState(data)) throw new Error('Ungültige Datenstruktur – Export abgelehnt.');
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Favoriten & Routen sichern',
      defaultPath: 'my-route-sicherung.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { exported: false };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
    return { exported: true };
  });

  handle('import-data', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Sicherung einlesen',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (canceled || !filePaths.length) return { imported: false };
    if (fs.statSync(filePaths[0]).size > MAX_PAYLOAD_BYTES) throw new Error('Datei ist zu groß.');
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
    if (!isValidState(data)) throw new Error('Das ist keine gültige My-Route-Sicherung.');
    return { imported: true, data };
  });

  // „Route fahren“ / „Download-Seite öffnen“: nur https-Links zu den erlaubten Zielen.
  handle('open-external', async (event, url) => {
    if (typeof url !== 'string' || url.length > 4000 || !isAllowedExternalUrl(url)) return { opened: false, reason: 'not-allowed' };
    await shell.openExternal(new URL(url).toString());
    return { opened: true };
  });

  // Optionale Adresssuche – nur auf Klick, nur der Suchtext geht an Nominatim (OpenStreetMap).
  handle('geocode', async (event, query) => {
    if (typeof query !== 'string' || !query.trim() || query.length > 200) return null;
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(query.trim());
    const list = await fetchLimited(url, 'nominatim.openstreetmap.org', { 'User-Agent': 'MyRoute-Desktop/' + app.getVersion() + ' (IT-WORLD)', 'Accept-Language': 'de' }, 200000);
    if (!Array.isArray(list) || !list.length) return null;
    const hit = { lat: Number(list[0].lat), lon: Number(list[0].lon) };
    return isCoord(hit) ? { lat: hit.lat, lon: hit.lon, label: String(list[0].display_name || '').slice(0, 200) } : null;
  });

  // Live-Optionen: nur Start-/Zielkoordinaten (Zahlen) gehen an OSRM; die Antwort wird auf Zahlen reduziert.
  handle('route-options', async (event, req) => {
    if (!req || !isCoord(req.from) || !isCoord(req.to)) return null;
    const url =
      `https://router.project-osrm.org/route/v1/driving/${req.from.lon},${req.from.lat};${req.to.lon},${req.to.lat}` +
      '?alternatives=3&overview=simplified&geometries=geojson';
    return sanitizeOsrm(await fetchLimited(url, 'router.project-osrm.org', { 'User-Agent': 'MyRoute-Desktop/' + app.getVersion() + ' (IT-WORLD)' }, 2 * 1024 * 1024));
  });

  handle('app-info', () => ({
    version: app.getVersion(),
    packaged: app.isPackaged,
    platform: process.platform,
    encrypted: store.isEncrypted(),
    updatesSupported: updater.isSupported()
  }));
  handle('update-status', () => updater.getStatus());
  handle('update-check', () => { updater.check(); return true; });
  handle('update-install', () => updater.installNow());
}

const gotLock = app.requestSingleInstanceLock(); // eine Instanz: schützt die Datendatei vor parallelen Schreibzugriffen
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    const ses = session.defaultSession;
    ses.setPermissionRequestHandler((wc, permission, callback) => callback(false));
    ses.setPermissionCheckHandler(() => false);
    if (typeof ses.setDevicePermissionHandler === 'function') ses.setDevicePermissionHandler(() => false);
    ses.setSpellCheckerEnabled(false);
    // Die Oberfläche selbst hat keinen Netzzugriff: alles Webbasierte aus Renderer-Prozessen wird abgebrochen.
    // (Die Hauptprozess-Anfragen – Adresssuche, Routing, Updates – tragen keine webContentsId.)
    ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (details, callback) => {
      callback({ cancel: !!details.webContentsId });
    });

    store = createStore({
      fs,
      path,
      filePath: path.join(app.getPath('userData'), 'my-route-data.json'),
      safeStorage,
      platform: process.platform,
      isValidState,
      maxBytes: MAX_PAYLOAD_BYTES
    });
    updater = createUpdater({
      app,
      fs,
      path,
      userDataDir: app.getPath('userData'),
      send: (status) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', status); }
    });
    registerIpc();

    Menu.setApplicationMenu(null);
    createWindow();
    // Automatische Updates beim Start (und alle 4 Stunden) – erst nach der Datenschutz-Information und solange nicht abgeschaltet.
    updater.start(() => !!(current.privacy && current.privacy.accepted && current.privacy.autoUpdate !== false));

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
