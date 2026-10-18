'use strict';
const { app, BrowserWindow, ipcMain, Menu, dialog, session, shell, protocol, powerMonitor, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { sanitizeState, emptyState } = require('./lib/validate');
const vault = require('./lib/vault');

// ---------------------------------------------------------------------------
// Härtung vor dem Start: Sandbox für alle Renderer, kein Netzwerk, ein Prozess.
// ---------------------------------------------------------------------------
// Globale Sandbox für alle Renderer (jedes eigene Fenster setzt sandbox:true zusätzlich selbst).
// Nur wenn ein Entwickler/Test ausdrücklich --no-sandbox übergibt (z. B. als root in Containern),
// wird die globale Sperre ausgelassen, weil Electron sonst auch Hilfsprozesse nicht mehr starten kann.
if (!process.argv.includes('--no-sandbox')) app.enableSandbox();
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true } }]);

// Die Anwendung braucht zur Laufzeit kein Netzwerk. Zusätzlich zur Sperre im
// Request-Filter (unten) wird die DNS-Auflösung gekappt und Chromiums
// Hintergrunddienste (Komponenten-Updates, Pings …) abgeschaltet.
app.commandLine.appendSwitch('host-resolver-rules', 'MAP * ~NOTFOUND , EXCLUDE localhost , EXCLUDE 127.0.0.1');
for (const sw of ['disable-background-networking', 'disable-component-update', 'disable-domain-reliability', 'no-pings', 'disable-sync']) {
  app.commandLine.appendSwitch(sw);
}

const RENDERER_DIR = path.join(__dirname, 'renderer');
const APP_ORIGIN = 'app://app/';
const dataFilePath = path.join(app.getPath('userData'), 'it-world-compliance-data.json');
const backupFilePath = dataFilePath + '.bak';

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // Obergrenze für Datendatei/Import
const MAX_REPORT_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

// Strenge CSP – wird als HTTP-Header des app://-Protokolls ausgeliefert (zusätzlich zum
// <meta>-Tag in index.html) und enthält dabei auch frame-ancestors, was per <meta> nicht geht.
const CSP = [
  "default-src 'none'", "script-src 'self'", "style-src 'self'", "img-src 'self'", "font-src 'self'",
  "connect-src 'none'", "base-uri 'none'", "form-action 'none'", "object-src 'none'",
  "frame-ancestors 'none'", "require-trusted-types-for 'script'"
].join('; ');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ttf': 'font/ttf'
};

let mainWindow = null;

// ---------------------------------------------------------------------------
// Datenablage: Klartext oder verschlüsselter Tresor (Passwort), atomar, 0600.
// ---------------------------------------------------------------------------
let mode = 'plain'; // 'plain' | 'locked' | 'unlocked'
let vaultKey = null; // Buffer, nur im Hauptprozess, nur solange entsperrt
let vaultKdf = null;
let pendingImport = null;
let backedUp = false;
let failedAttempts = 0;
let lockedUntil = 0;

function readStoredFile() {
  let raw;
  try {
    const st = fs.statSync(dataFilePath);
    if (st.size > MAX_PAYLOAD_BYTES * 2) return { kind: 'corrupt' };
    raw = fs.readFileSync(dataFilePath, 'utf-8');
  } catch (err) {
    return { kind: 'none' };
  }
  try {
    const obj = JSON.parse(raw);
    const env = vault.parseEnvelope(obj);
    if (env) return { kind: 'vault', env };
    if (obj && obj.format === 'it-world-vault') return { kind: 'corrupt' };
    return { kind: 'plain', obj };
  } catch (err) {
    return { kind: 'corrupt' };
  }
}

// Eine beschädigte Datei wird zur Seite gelegt statt überschrieben, damit
// Daten im Zweifel noch gerettet werden können.
function quarantineCorrupt() {
  try {
    fs.renameSync(dataFilePath, `${dataFilePath}.corrupt-${Date.now()}`);
  } catch (err) {
    /* nichts zu retten */
  }
}

function detectMode() {
  const s = readStoredFile();
  mode = s.kind === 'vault' ? 'locked' : 'plain';
}

function wipeKey() {
  if (vaultKey) vaultKey.fill(0);
  vaultKey = null;
  vaultKdf = null;
  pendingImport = null;
}

function writeAtomic(content) {
  const tmp = `${dataFilePath}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, 'w', 0o600);
  try {
    fs.writeSync(fd, content, 0, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, dataFilePath);
  try {
    fs.chmodSync(dataFilePath, 0o600);
  } catch (err) {
    /* FAT/exFAT kennt keine Unix-Rechte */
  }
}

function backupOnce() {
  if (backedUp || !fs.existsSync(dataFilePath)) return;
  try {
    fs.copyFileSync(dataFilePath, backupFilePath);
    fs.chmodSync(backupFilePath, 0o600);
    backedUp = true;
  } catch (err) {
    /* Sicherung ist Zusatz, kein Muss */
  }
}

function secureDelete(file) {
  try {
    const st = fs.statSync(file);
    const fd = fs.openSync(file, 'r+');
    const len = Math.min(st.size, 16 * 1024 * 1024);
    if (len > 0) fs.writeSync(fd, crypto.randomBytes(len), 0, len, 0);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
  } catch (err) {
    /* Datei existiert nicht oder ist nicht überschreibbar */
  }
  try {
    fs.unlinkSync(file);
  } catch (err) {
    /* bereits entfernt */
  }
}

function loadPlainState() {
  const s = readStoredFile();
  if (s.kind === 'plain') return sanitizeState(s.obj);
  if (s.kind === 'corrupt') quarantineCorrupt();
  return emptyState();
}

function persistState(raw) {
  if (mode === 'locked') throw new Error('Die Datenablage ist gesperrt.');
  const state = sanitizeState(raw);
  const json = JSON.stringify(state, null, mode === 'unlocked' ? 0 : 2);
  if (Buffer.byteLength(json, 'utf-8') > MAX_PAYLOAD_BYTES) {
    throw new Error('Datenmenge überschreitet das zulässige Limit.');
  }
  backupOnce();
  if (mode === 'unlocked') {
    writeAtomic(JSON.stringify(vault.seal(Buffer.from(json, 'utf-8'), vaultKey, vaultKdf)));
  } else {
    writeAtomic(json);
  }
}

// Bremse gegen Durchprobieren von Passwörtern.
function throttleWait() {
  return Math.max(0, lockedUntil - Date.now());
}
function registerFailure() {
  failedAttempts += 1;
  lockedUntil = Date.now() + Math.min(60000, 500 * 2 ** Math.min(failedAttempts, 10));
}
function registerSuccess() {
  failedAttempts = 0;
  lockedUntil = 0;
}

function checkPassword(pw, min) {
  if (typeof pw !== 'string' || pw.length > 256) throw new Error('Ungültiges Passwort.');
  if (min && pw.length < 10) throw new Error('Das Passwort muss mindestens 10 Zeichen lang sein.');
  if (min && /^(.)\1+$/.test(pw)) throw new Error('Das Passwort ist zu einfach.');
}

function lockVault() {
  if (mode === 'unlocked') {
    wipeKey();
    mode = 'locked';
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('locked');
  }
}

// ---------------------------------------------------------------------------
// Fenster, Protokoll, Menü
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#050403',
    title: 'IT-WORLD Compliance-Assistent',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      enableWebSQL: false,
      spellcheck: false,
      navigateOnDragDrop: false,
      safeDialogs: true,
      devTools: !app.isPackaged
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    wipeKey();
  });
  mainWindow.loadURL(APP_ORIGIN + 'index.html');
}

function sendMenu(action) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('menu', action);
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const goto = (label, id, key) => ({ label, accelerator: key ? `CmdOrCtrl+${key}` : undefined, click: () => sendMenu('goto:' + id) });
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Datei',
      submenu: [
        { label: 'Datensicherung erstellen …', accelerator: 'CmdOrCtrl+S', click: () => sendMenu('backup') },
        { label: 'Datensicherung laden …', accelerator: 'CmdOrCtrl+O', click: () => sendMenu('restore') },
        { type: 'separator' },
        { label: 'Compliance-Bericht als PDF …', accelerator: 'CmdOrCtrl+P', click: () => sendMenu('report-pdf') },
        { label: 'Compliance-Bericht als HTML …', click: () => sendMenu('report-html') },
        { label: 'Fristen als Kalenderdatei (.ics) …', click: () => sendMenu('ics') },
        { type: 'separator' },
        { label: 'Anwendung sperren', accelerator: 'CmdOrCtrl+L', click: () => sendMenu('lock') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Beenden' }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Rückgängig' }, { role: 'redo', label: 'Wiederholen' }, { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' }, { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einfügen' }, { role: 'selectAll', label: 'Alles auswählen' },
        { type: 'separator' },
        { label: 'Suchen und springen …', accelerator: 'CmdOrCtrl+K', click: () => sendMenu('search') }
      ]
    },
    {
      label: 'Gehe zu',
      submenu: [
        goto('Übersicht', 'dashboard', '1'), goto('Fristenkalender', 'kalender', '2'), { type: 'separator' },
        goto('NIS2', 'nis2', '3'), goto('DSGVO', 'dsgvo', '4'), goto('IT-Sicherheit', 'itsec', '5'), { type: 'separator' },
        goto('Verarbeitungsverzeichnis', 'vvt', '6'), goto('Dienstleister & AV-Verträge', 'dienstleister', '7'),
        goto('Betroffenenanfragen', 'anfragen', '8'), goto('Schulungen & Nachweise', 'schulungen', '9'), { type: 'separator' },
        goto('Vorfälle & Fristen', 'vorfaelle'), goto('Vorlagen', 'vorlagen'), goto('Änderungsprotokoll', 'protokoll'),
        goto('Bericht & Export', 'bericht'), { type: 'separator' },
        goto('Unternehmen', 'firma'), goto('Sicherheit & Datenschutz', 'sicherheit'), goto('Hilfe & Info', 'hilfe')
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'resetZoom', label: 'Zoom zurücksetzen' }, { role: 'zoomIn', label: 'Vergrößern' },
        { role: 'zoomOut', label: 'Verkleinern' }, { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
        ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'toggleDevTools' }])
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        goto('Sicherheit & Datenschutz', 'sicherheit'), goto('Hilfe & Tastenkürzel', 'hilfe'),
        { type: 'separator' },
        {
          label: 'Über IT-WORLD Compliance-Assistent',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Über',
              message: 'IT-WORLD Compliance-Assistent',
              detail: `Version ${app.getVersion()}\nNIS2 · DSGVO · IT-Sicherheitsnachweise für KMU\n\nAlle Daten bleiben lokal auf diesem Gerät. Orientierungshilfe, keine Rechtsberatung.`
            });
          }
        }
      ]
    }
  ];
  return Menu.buildFromTemplate(template);
}

// ---------------------------------------------------------------------------
// IPC: nur für die eigene Oberfläche, jede Eingabe wird geprüft.
// ---------------------------------------------------------------------------
function trusted(event) {
  const frame = event.senderFrame;
  return !!(mainWindow && event.sender === mainWindow.webContents && frame && typeof frame.url === 'string' && frame.url.startsWith(APP_ORIGIN));
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!trusted(event)) throw new Error('Nicht autorisierter Aufruf.');
    return fn(event, ...args);
  });
}

function safeFileName(name, fallback) {
  const cleaned = String(name || '').replace(/[^\p{L}\p{N}._ -]/gu, '').trim().slice(0, 80);
  return cleaned || fallback;
}

handle('vault-status', () => ({ mode, encrypted: mode !== 'plain', waitMs: throttleWait() }));

handle('load-data', () => {
  if (mode === 'locked') return { locked: true };
  return { locked: false, data: mode === 'unlocked' ? loadUnlockedCache() : loadPlainState() };
});

// Im entsperrten Zustand wird die Datei jedes Mal neu entschlüsselt (keine
// zusätzliche Klartextkopie im Hauptprozess).
function loadUnlockedCache() {
  const s = readStoredFile();
  if (s.kind !== 'vault') return emptyState();
  return sanitizeState(JSON.parse(vault.open(s.env, vaultKey).toString('utf-8')));
}

handle('unlock', async (event, pw) => {
  checkPassword(pw, false);
  if (mode !== 'locked') throw new Error('Die Datenablage ist nicht gesperrt.');
  const wait = throttleWait();
  if (wait > 0) return { ok: false, waitMs: wait, message: `Zu viele Fehlversuche. Bitte in ${Math.ceil(wait / 1000)} Sekunden erneut versuchen.` };
  const s = readStoredFile();
  if (s.kind !== 'vault') throw new Error('Keine verschlüsselte Datenablage gefunden.');
  try {
    const { key, plaintext } = await vault.unlock(s.env, pw);
    vaultKey = key;
    vaultKdf = s.env.kdf;
    mode = 'unlocked';
    registerSuccess();
    return { ok: true, data: sanitizeState(JSON.parse(plaintext.toString('utf-8'))) };
  } catch (err) {
    registerFailure();
    return { ok: false, waitMs: throttleWait(), message: 'Passwort falsch.' };
  }
});

handle('lock', () => {
  lockVault();
  return true;
});

handle('save-data', (event, data) => {
  persistState(data);
  return true;
});

handle('set-password', async (event, pw) => {
  checkPassword(pw, true);
  if (mode !== 'plain') throw new Error('Die Verschlüsselung ist bereits aktiv.');
  const state = loadPlainState();
  const kdf = vault.newKdf();
  const key = await vault.deriveKey(pw, kdf);
  const json = JSON.stringify(state);
  writeAtomic(JSON.stringify(vault.seal(Buffer.from(json, 'utf-8'), key, kdf)));
  vaultKey = key;
  vaultKdf = kdf;
  mode = 'unlocked';
  // Frühere Klartext-Sicherungskopie sicher entfernen.
  secureDelete(backupFilePath);
  backedUp = false;
  return true;
});

async function verifyCurrentPassword(pw) {
  checkPassword(pw, false);
  const wait = throttleWait();
  if (wait > 0) throw new Error(`Zu viele Fehlversuche. Bitte in ${Math.ceil(wait / 1000)} Sekunden erneut versuchen.`);
  const probe = await vault.deriveKey(pw, vaultKdf);
  const ok = vault.sameKey(probe, vaultKey);
  probe.fill(0);
  if (!ok) {
    registerFailure();
    throw new Error('Das aktuelle Passwort ist falsch.');
  }
  registerSuccess();
}

handle('change-password', async (event, oldPw, newPw) => {
  if (mode !== 'unlocked') throw new Error('Bitte zuerst entsperren.');
  await verifyCurrentPassword(oldPw);
  checkPassword(newPw, true);
  const state = loadUnlockedCache();
  const kdf = vault.newKdf();
  const key = await vault.deriveKey(newPw, kdf);
  writeAtomic(JSON.stringify(vault.seal(Buffer.from(JSON.stringify(state), 'utf-8'), key, kdf)));
  wipeKey();
  vaultKey = key;
  vaultKdf = kdf;
  // Die alte Sicherungskopie ist noch mit dem alten Passwort verschlüsselt: entfernen.
  secureDelete(backupFilePath);
  backedUp = false;
  return true;
});

handle('remove-password', async (event, pw) => {
  if (mode !== 'unlocked') throw new Error('Bitte zuerst entsperren.');
  await verifyCurrentPassword(pw);
  const state = loadUnlockedCache();
  wipeKey();
  mode = 'plain';
  writeAtomic(JSON.stringify(state, null, 2));
  return true;
});

// Alles entfernen: Datei und Sicherungskopien werden vor dem Löschen überschrieben (Best Effort,
// auf SSDs kann das Dateisystem Kopien zurückhalten – dafür bleibt die Festplattenverschlüsselung).
handle('wipe-data', () => {
  wipeKey();
  secureDelete(dataFilePath);
  secureDelete(backupFilePath);
  try {
    for (const f of fs.readdirSync(app.getPath('userData'))) {
      if (f.startsWith('it-world-compliance-data.json.')) secureDelete(path.join(app.getPath('userData'), f));
    }
  } catch (err) {
    /* Verzeichnis nicht lesbar */
  }
  mode = 'plain';
  backedUp = false;
  registerSuccess();
  return true;
});

handle('get-info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  platform: process.platform,
  dataDir: app.getPath('userData'),
  encrypted: mode !== 'plain'
}));

handle('get-logo', () => {
  const buf = fs.readFileSync(path.join(RENDERER_DIR, 'assets', 'logo.png'));
  return 'data:image/png;base64,' + buf.toString('base64');
});

handle('export-data', async (event, data) => {
  const state = sanitizeState(data);
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Datensicherung erstellen',
    defaultPath: mode === 'unlocked' ? 'it-world-compliance-sicherung.verschluesselt.json' : 'it-world-compliance-sicherung.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { exported: false };
  // Ist die Verschlüsselung aktiv, wird auch die Sicherung verschlüsselt (gleiches Passwort).
  const content = mode === 'unlocked'
    ? JSON.stringify(vault.seal(Buffer.from(JSON.stringify(state), 'utf-8'), vaultKey, vaultKdf))
    : JSON.stringify(state, null, 2);
  fs.writeFileSync(filePath, content, { encoding: 'utf-8', mode: 0o600 });
  return { exported: true, filePath, encrypted: mode === 'unlocked' };
});

handle('import-data', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Datensicherung laden',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePaths[0]) return { imported: false };
  if (fs.statSync(filePaths[0]).size > MAX_PAYLOAD_BYTES * 2) throw new Error('Die Datei ist zu groß für einen Import.');
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  } catch (err) {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const env = vault.parseEnvelope(parsed);
  if (env) {
    pendingImport = env;
    return { imported: false, needsPassword: true };
  }
  return { imported: true, data: sanitizeState(parsed) };
});

handle('import-decrypt', async (event, pw) => {
  checkPassword(pw, false);
  if (!pendingImport) throw new Error('Kein Import ausstehend.');
  const wait = throttleWait();
  if (wait > 0) return { imported: false, message: `Zu viele Fehlversuche. Bitte in ${Math.ceil(wait / 1000)} Sekunden erneut versuchen.` };
  try {
    const { key, plaintext } = await vault.unlock(pendingImport, pw);
    key.fill(0);
    pendingImport = null;
    registerSuccess();
    return { imported: true, data: sanitizeState(JSON.parse(plaintext.toString('utf-8'))) };
  } catch (err) {
    registerFailure();
    return { imported: false, message: 'Passwort falsch.' };
  }
});

handle('import-cancel', () => {
  pendingImport = null;
  return true;
});

handle('export-report-html', async (event, html) => {
  if (typeof html !== 'string' || Buffer.byteLength(html, 'utf-8') > MAX_REPORT_BYTES) throw new Error('Ungültiger Bericht – Export abgelehnt.');
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

// PDF: in einem unsichtbaren, isolierten Fenster ohne JavaScript und Preload rendern.
handle('export-report-pdf', async (event, html) => {
  if (typeof html !== 'string' || Buffer.byteLength(html, 'utf-8') > MAX_REPORT_BYTES) throw new Error('Ungültiger Bericht – Export abgelehnt.');
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Compliance-Bericht als PDF speichern',
    defaultPath: 'IT-WORLD-Compliance-Bericht.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return { exported: false };

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, javascript: false, devTools: false }
  });
  // Temporäre Datei statt data:-URL (Chromium begrenzt diese auf ca. 2 MB).
  const tmpHtml = path.join(os.tmpdir(), `it-world-bericht-${process.pid}-${crypto.randomBytes(6).toString('hex')}.html`);
  fs.writeFileSync(tmpHtml, html, { encoding: 'utf-8', mode: 0o600 });
  try {
    await printWin.loadFile(tmpHtml);
    const pdf = await printWin.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { marginType: 'default' } });
    fs.writeFileSync(filePath, pdf);
  } finally {
    printWin.destroy();
    secureDelete(tmpHtml);
  }
  return { exported: true, filePath };
});

handle('save-text', async (event, opts) => {
  if (!opts || typeof opts !== 'object' || typeof opts.content !== 'string') throw new Error('Ungültige Anfrage.');
  if (Buffer.byteLength(opts.content, 'utf-8') > MAX_TEXT_BYTES) throw new Error('Inhalt zu groß.');
  const ext = ['txt', 'ics', 'md'].includes(opts.ext) ? opts.ext : 'txt';
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Datei speichern',
    defaultPath: `${safeFileName(opts.name, 'IT-WORLD-Dokument')}.${ext}`,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  });
  if (canceled || !filePath) return { saved: false };
  fs.writeFileSync(filePath, opts.content, 'utf-8');
  return { saved: true, filePath };
});

handle('copy-text', (event, text) => {
  if (typeof text !== 'string' || text.length > 200000) throw new Error('Ungültiger Text.');
  clipboard.writeText(text);
  return true;
});

// Nachweisdateien werden nur als Pfad verknüpft, nie kopiert.
handle('pick-evidence-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: 'Nachweis-Datei verknüpfen', properties: ['openFile'] });
  if (canceled || !filePaths[0]) return { picked: false };
  return { picked: true, filePath: filePaths[0] };
});

handle('open-evidence-file', (event, filePath) => {
  if (typeof filePath !== 'string' || filePath.length > 1024 || !path.isAbsolute(filePath)) return { opened: false, reason: 'invalid' };
  // Netzwerkpfade (UNC) würden unter Windows eine SMB-Verbindung aufbauen und dabei
  // Anmeldeinformationen preisgeben können – Pfade aus Sicherungen nie dorthin auflösen.
  if (/^(\\\\|\/\/)/.test(filePath)) return { opened: false, reason: 'network-path' };
  if (!fs.existsSync(filePath)) return { opened: false, reason: 'missing' };
  // Nur im Dateimanager anzeigen, niemals ausführen (z. B. .exe/.bat aus einer Sicherung).
  shell.showItemInFolder(filePath);
  return { opened: true };
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Für JEDE WebContents (auch Druckfenster): keine Popups, keine Webviews, keine Navigation.
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-attach-webview', (e) => e.preventDefault());
    contents.on('will-navigate', (e) => e.preventDefault());
    contents.on('will-redirect', (e) => e.preventDefault());
  });

  app.whenReady().then(() => {
    // Renderer-Dateien über eigenes Protokoll ausliefern: kein file://-Zugriff, Pfad-Traversal
    // ausgeschlossen, nur Dateitypen der Whitelist, Sicherheits-Header an jeder Antwort.
    protocol.handle('app', async (request) => {
      try {
        const url = new URL(request.url);
        if (url.host !== 'app') return new Response('Not found', { status: 404 });
        let rel = decodeURIComponent(url.pathname);
        if (rel === '/' || rel === '') rel = '/index.html';
        const full = path.resolve(RENDERER_DIR, '.' + rel);
        const type = MIME[path.extname(full).toLowerCase()];
        if (!full.startsWith(RENDERER_DIR + path.sep) || !type) return new Response('Not found', { status: 404 });
        const body = await fs.promises.readFile(full);
        return new Response(body, {
          headers: {
            'Content-Type': type,
            'Content-Security-Policy': CSP,
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Resource-Policy': 'same-origin',
            'Cache-Control': 'no-store'
          }
        });
      } catch (err) {
        return new Response('Not found', { status: 404 });
      }
    });

    const ses = session.defaultSession;
    // Jede Netzwerkanfrage nach außen hart abbrechen (die App spricht nie mit dem Internet).
    ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (details, callback) => callback({ cancel: true }));
    ses.setPermissionRequestHandler((wc, permission, callback) => callback(false));
    ses.setPermissionCheckHandler(() => false);
    ses.setDevicePermissionHandler(() => false);

    detectMode();
    Menu.setApplicationMenu(buildMenu());
    createWindow();

    // Bei Sperrung des Betriebssystems den Tresor sofort schließen.
    try {
      powerMonitor.on('lock-screen', lockVault);
      powerMonitor.on('suspend', lockVault);
    } catch (err) {
      /* nicht auf jeder Plattform verfügbar */
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    wipeKey();
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('before-quit', wipeKey);
}
