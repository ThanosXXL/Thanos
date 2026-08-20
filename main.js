const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const userDataDir = app.getPath('userData');
const dataFilePath = path.join(userDataDir, 'dozenten-data.json');
const securityFilePath = path.join(userDataDir, 'dozenten-security.json');
const licenseFilePath = path.join(userDataDir, 'dozenten-license.json');
const backupsDir = path.join(userDataDir, 'backups');

const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 4x täglich
const BACKUP_KEEP_COUNT = 30;
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // mehrfach täglich
const LICENSE_PERIOD_MS = 365 * 24 * 60 * 60 * 1000; // 1 Jahr
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 30 * 1000;

let mainWindow = null;
let pinFailedAttempts = 0;
let pinLockedUntil = 0;

// ---------- App-Daten ----------

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.dozenten) ? parsed : { dozenten: [] };
  } catch (err) {
    return { dozenten: [] };
  }
}

function isValidItem(item) {
  return (
    item && typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.text === 'string'
  );
}

function isValidData(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.dozenten)) return false;
  return data.dozenten.every((d) => {
    if (!d || typeof d !== 'object') return false;
    if (typeof d.id !== 'string' || typeof d.name !== 'string') return false;
    if (!Array.isArray(d.todos) || !Array.isArray(d.openProjects) ||
        !Array.isArray(d.doneProjects) || !Array.isArray(d.chat)) return false;
    return [...d.todos, ...d.openProjects, ...d.doneProjects].every(isValidItem);
  });
}

function saveData(data) {
  if (!isValidData(data)) {
    throw new Error('Ungültiges Datenformat');
  }
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------- Backups (mehrfach täglich) ----------

function runBackup() {
  try {
    if (!fs.existsSync(dataFilePath)) return;
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(dataFilePath, path.join(backupsDir, `dozenten-data-${stamp}.json`));

    const files = fs.readdirSync(backupsDir)
      .filter((f) => f.startsWith('dozenten-data-') && f.endsWith('.json'))
      .sort();
    while (files.length > BACKUP_KEEP_COUNT) {
      fs.unlinkSync(path.join(backupsDir, files.shift()));
    }
  } catch (err) {
    // Backup-Fehler dürfen die App nicht blockieren
  }
}

function listBackups() {
  if (!fs.existsSync(backupsDir)) return [];
  return fs.readdirSync(backupsDir)
    .filter((f) => f.startsWith('dozenten-data-') && f.endsWith('.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupsDir, f));
      return { file: f, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function restoreBackup(file) {
  const safeName = path.basename(String(file));
  const src = path.join(backupsDir, safeName);
  if (!src.startsWith(backupsDir) || !fs.existsSync(src)) {
    throw new Error('Backup nicht gefunden');
  }
  const parsed = JSON.parse(fs.readFileSync(src, 'utf-8'));
  if (!isValidData(parsed)) {
    throw new Error('Ungültiges Backup');
  }
  runBackup(); // aktuellen Stand vor dem Überschreiben sichern
  saveData(parsed);
  return parsed;
}

// ---------- PIN-Sperre (Hackerschutz) ----------

function loadSecurity() {
  try {
    const raw = fs.readFileSync(securityFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { pinHash: null, pinSalt: null };
  }
}

function saveSecurity(sec) {
  fs.writeFileSync(securityFilePath, JSON.stringify(sec, null, 2), 'utf-8');
}

function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), salt, 64).toString('hex');
}

function setPin(pin) {
  if (typeof pin !== 'string' || pin.length < 4) {
    throw new Error('PIN muss mindestens 4 Zeichen haben');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  saveSecurity({ pinHash: hashPin(pin, salt), pinSalt: salt });
  pinFailedAttempts = 0;
  pinLockedUntil = 0;
}

function verifyPin(pin) {
  const now = Date.now();
  if (now < pinLockedUntil) {
    return { ok: false, lockedForMs: pinLockedUntil - now };
  }
  const sec = loadSecurity();
  if (!sec.pinHash || !sec.pinSalt) return { ok: true };

  const candidate = hashPin(pin, sec.pinSalt);
  const match =
    candidate.length === sec.pinHash.length &&
    crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(sec.pinHash));

  if (match) {
    pinFailedAttempts = 0;
    pinLockedUntil = 0;
    return { ok: true };
  }

  pinFailedAttempts += 1;
  if (pinFailedAttempts >= PIN_MAX_ATTEMPTS) {
    pinLockedUntil = now + PIN_LOCKOUT_MS;
    pinFailedAttempts = 0;
    return { ok: false, lockedForMs: PIN_LOCKOUT_MS };
  }
  return { ok: false, attemptsLeft: PIN_MAX_ATTEMPTS - pinFailedAttempts };
}

function removePin(currentPin) {
  const result = verifyPin(currentPin);
  if (!result.ok) return false;
  saveSecurity({ pinHash: null, pinSalt: null });
  return true;
}

// ---------- Lizenz / Jahres-Abo ----------
// Hinweis: Ohne eigenen Lizenz-/Zahlungsserver kann diese Prüfung nur lokal
// erfolgen (kein Kopierschutz gegen gezielte Manipulation). Sie bildet den
// Abo-Zyklus (Laufzeit, automatische Verlängerung, Kündigung) lokal ab.

function defaultLicense() {
  const now = Date.now();
  return {
    key: null,
    activatedAt: now,
    expiresAt: now + LICENSE_PERIOD_MS,
    autoRenew: true,
    cancelled: false
  };
}

function isValidLicenseKeyFormat(key) {
  if (typeof key !== 'string') return false;
  const m = /^([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(key.trim().toUpperCase());
  if (!m) return false;
  const body = m[1] + m[2] + m[3];
  let hash = 0;
  for (let i = 0; i < body.length; i++) {
    hash = (hash * 31 + body.charCodeAt(i)) >>> 0;
  }
  const checksum = hash.toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return checksum === m[4];
}

function loadLicense() {
  try {
    const raw = fs.readFileSync(licenseFilePath, 'utf-8');
    const lic = JSON.parse(raw);
    return applyRenewal(lic);
  } catch (err) {
    const lic = defaultLicense();
    saveLicense(lic);
    return lic;
  }
}

function saveLicense(lic) {
  fs.writeFileSync(licenseFilePath, JSON.stringify(lic, null, 2), 'utf-8');
}

function applyRenewal(lic) {
  const now = Date.now();
  if (now >= lic.expiresAt && lic.autoRenew && !lic.cancelled) {
    lic.activatedAt = now;
    lic.expiresAt = now + LICENSE_PERIOD_MS;
    saveLicense(lic);
  }
  return lic;
}

function activateLicense(key) {
  if (!isValidLicenseKeyFormat(key)) {
    throw new Error('Ungültiger Lizenzschlüssel');
  }
  const now = Date.now();
  const lic = {
    key: key.trim().toUpperCase(),
    activatedAt: now,
    expiresAt: now + LICENSE_PERIOD_MS,
    autoRenew: true,
    cancelled: false
  };
  saveLicense(lic);
  return lic;
}

function setAutoRenew(value) {
  const lic = loadLicense();
  lic.autoRenew = !!value;
  if (lic.autoRenew) lic.cancelled = false;
  saveLicense(lic);
  return lic;
}

function cancelLicense() {
  const lic = loadLicense();
  lic.cancelled = true;
  lic.autoRenew = false;
  saveLicense(lic);
  return lic;
}

// ---------- Fenster & Security-Hardening ----------

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0b0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged
    }
  });

  win.setMenuBarVisibility(false);
  win.removeMenu();

  // Keine externe Navigation und keine neuen Fenster aus dem Renderer heraus
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  return win;
}

function setupContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none';"
        ]
      }
    });
  });
}

function setupAutoUpdates() {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    const check = () => autoUpdater.checkForUpdates().catch(() => {});
    check();
    setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  } catch (err) {
    // electron-updater optional in Entwicklungsumgebung
  }
}

// ---------- IPC ----------

ipcMain.handle('load-data', () => loadData());

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('has-pin', () => {
  const sec = loadSecurity();
  return !!sec.pinHash;
});

ipcMain.handle('set-pin', (event, pin) => {
  setPin(pin);
  return true;
});

ipcMain.handle('verify-pin', (event, pin) => verifyPin(pin));

ipcMain.handle('remove-pin', (event, currentPin) => removePin(currentPin));

ipcMain.handle('get-license', () => loadLicense());

ipcMain.handle('activate-license', (event, key) => activateLicense(key));

ipcMain.handle('set-auto-renew', (event, value) => setAutoRenew(value));

ipcMain.handle('cancel-license', () => cancelLicense());

ipcMain.handle('list-backups', () => listBackups());

ipcMain.handle('restore-backup', (event, file) => restoreBackup(file));

app.whenReady().then(() => {
  setupContentSecurityPolicy();
  mainWindow = createWindow();
  runBackup();
  setInterval(runBackup, BACKUP_INTERVAL_MS);
  setupAutoUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
