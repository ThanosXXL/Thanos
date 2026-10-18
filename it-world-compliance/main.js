const { app, BrowserWindow, ipcMain, Menu, dialog, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const dataFilePath = path.join(app.getPath('userData'), 'it-world-compliance-data.json');

// Großzügige, aber endliche Obergrenze gegen eine fehlerhafte/böswillige
// Payload, die die Datenablage unbegrenzt wachsen lässt (Dienst-Härtung).
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_REPORT_BYTES = 8 * 1024 * 1024; // 8 MB

function emptyState() {
  return { firma: {}, nis2Check: {}, items: {}, vorfaelle: [] };
}

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return emptyState();
  }
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isValidState(data) {
  if (!isPlainObject(data)) return false;
  if (!isPlainObject(data.firma)) return false;
  if (!isPlainObject(data.nis2Check)) return false;
  if (!isPlainObject(data.items)) return false;
  if (!Array.isArray(data.vorfaelle)) return false;
  return data.vorfaelle.every((v) => isPlainObject(v) && typeof v.id === 'string');
}

function saveData(data) {
  if (!isValidState(data)) {
    throw new Error('Ungültige Datenstruktur – Speichern abgelehnt.');
  }
  const serialized = JSON.stringify(data, null, 2);
  if (Buffer.byteLength(serialized, 'utf-8') > MAX_PAYLOAD_BYTES) {
    throw new Error('Datenmenge überschreitet das zulässige Limit.');
  }
  // Atomar schreiben (temp + rename), damit ein Absturz mitten im Schreibvorgang
  // die bestehende Datendatei nicht beschädigt; 0600, da Firmen- und
  // Vorfallsdaten nur für den aktuellen Benutzer lesbar sein sollen.
  const tmpPath = `${dataFilePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, serialized, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, dataFilePath);
  try {
    fs.chmodSync(dataFilePath, 0o600);
  } catch (err) {
    // Manche Dateisysteme (z. B. FAT/exFAT) unterstützen keine Unix-Rechte.
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#050403',
    title: 'IT-WORLD Compliance-Assistent',
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

  // Keine Navigation weg von der lokal geladenen Oberfläche und keine neuen
  // Fenster/Popups – die App spricht zur Laufzeit mit keinem Netzwerk.
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', () => loadData());

// Das Logo wird für den exportierten Bericht als data:-URI eingebettet, damit
// Bericht (HTML/PDF) eine einzelne, portable Datei ohne Nachladen bleibt.
ipcMain.handle('get-logo', () => {
  const buf = fs.readFileSync(path.join(__dirname, 'renderer', 'assets', 'logo.png'));
  return 'data:image/png;base64,' + buf.toString('base64');
});

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
    title: 'Daten exportieren',
    defaultPath: 'it-world-compliance-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { exported: false };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { exported: true, filePath };
});

// Datensicherung wieder einlesen. Die Auswahl und Validierung passieren hier im
// Hauptprozess; der Renderer bekommt nur den geprüften Zustand zurück.
ipcMain.handle('import-data', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Datensicherung importieren',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePaths[0]) return { imported: false };
  const stat = fs.statSync(filePaths[0]);
  if (stat.size > MAX_PAYLOAD_BYTES) {
    throw new Error('Die Datei ist zu groß für einen Import.');
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  } catch (err) {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  if (!isValidState(parsed)) {
    throw new Error('Die Datei enthält keine gültige Compliance-Datensicherung.');
  }
  return { imported: true, data: parsed };
});

ipcMain.handle('export-report-html', async (event, html) => {
  if (typeof html !== 'string' || Buffer.byteLength(html, 'utf-8') > MAX_REPORT_BYTES) {
    throw new Error('Ungültiger Bericht – Export abgelehnt.');
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Compliance-Bericht speichern',
    defaultPath: 'IT-WORLD-Compliance-Bericht.html',
    filters: [{ name: 'HTML', extensions: ['html'] }]
  });
  if (canceled || !filePath) return { exported: false };
  fs.writeFileSync(filePath, html, 'utf-8');
  return { exported: true, filePath };
});

// PDF wird in einem unsichtbaren, komplett isolierten Fenster gerendert
// (ohne Preload, ohne JavaScript, ohne Netzwerkzugriff über die CSP des Berichts).
ipcMain.handle('export-report-pdf', async (event, html) => {
  if (typeof html !== 'string' || Buffer.byteLength(html, 'utf-8') > MAX_REPORT_BYTES) {
    throw new Error('Ungültiger Bericht – Export abgelehnt.');
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Compliance-Bericht als PDF speichern',
    defaultPath: 'IT-WORLD-Compliance-Bericht.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return { exported: false };

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      javascript: false,
      devTools: false
    }
  });
  // Über eine temporäre Datei laden statt über eine data:-URL (Chromium begrenzt
  // data:-URLs auf ca. 2 MB, große Berichte würden sonst scheitern).
  const tmpHtml = path.join(os.tmpdir(), `it-world-bericht-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(tmpHtml, html, { encoding: 'utf-8', mode: 0o600 });
  try {
    await printWin.loadFile(tmpHtml);
    const pdf = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' }
    });
    fs.writeFileSync(filePath, pdf);
  } finally {
    printWin.destroy();
    try { fs.unlinkSync(tmpHtml); } catch (err) { /* bereits entfernt */ }
  }
  return { exported: true, filePath };
});

// Nachweise werden nur als Dateipfad verknüpft, nie kopiert oder hochgeladen.
ipcMain.handle('pick-evidence-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Nachweis-Datei verknüpfen',
    properties: ['openFile']
  });
  if (canceled || !filePaths[0]) return { picked: false };
  return { picked: true, filePath: filePaths[0] };
});

ipcMain.handle('open-evidence-file', async (event, filePath) => {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || !fs.existsSync(filePath)) {
    return { opened: false, reason: 'missing' };
  }
  // Nur im Dateimanager anzeigen, nicht ausführen: ein verknüpfter Pfad aus einer
  // importierten Datensicherung darf nie direkt starten (z. B. .exe/.bat).
  shell.showItemInFolder(filePath);
  return { opened: true };
});

app.whenReady().then(() => {
  // Diese App braucht keine Berechtigungen (Kamera, Mikrofon, Standort, …).
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
