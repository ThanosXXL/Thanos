const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dataFilePath = path.join(app.getPath('userData'), 'patientenwelt-data.json');
const backupsDir = path.join(app.getPath('userData'), 'backups');

const PBKDF2_ITERATIONS = 210000;
const KEY_LENGTH = 32; // 256 bit
const MAX_BACKUPS = 10;

// ---------- Kryptografie-Hilfsfunktionen ----------
// AES-256-GCM für die Daten, PBKDF2-SHA256 zur Passwort-Ableitung. Jeder Benutzer
// wickelt (wrapped) denselben Daten-Schlüssel (DEK) mit seinem eigenen Passwort ein,
// sodass mehrere Benutzer unabhängig voneinander dieselben Daten entschlüsseln können,
// ohne dass der DEK selbst je unverschlüsselt gespeichert wird.

function deriveKey(password, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

function wrapKey(dek, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const wrapped = Buffer.concat([cipher.update(dek), cipher.final()]);
  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    wrappedKey: wrapped.toString('hex')
  };
}

function unwrapKey(userEntry, password) {
  const key = deriveKey(password, userEntry.salt);
  const iv = Buffer.from(userEntry.iv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(userEntry.authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(userEntry.wrappedKey, 'hex')),
    decipher.final()
  ]);
}

function encryptData(dek, plainObj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(plainObj), 'utf-8'),
    cipher.final()
  ]);
  return {
    dataIv: iv.toString('hex'),
    dataAuthTag: cipher.getAuthTag().toString('hex'),
    ciphertext: ciphertext.toString('hex')
  };
}

function decryptData(dek, envelope) {
  const iv = Buffer.from(envelope.dataIv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(Buffer.from(envelope.dataAuthTag, 'hex'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'hex')),
    decipher.final()
  ]);
  return JSON.parse(plain.toString('utf-8'));
}

// ---------- Datei-Ablage ----------

function readEnvelope() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 2 && Array.isArray(parsed.users)) return parsed;
    return null;
  } catch (err) {
    return null;
  }
}

function writeEnvelope(envelope) {
  fs.writeFileSync(dataFilePath, JSON.stringify(envelope, null, 2), 'utf-8');
}

function writeBackup(envelope) {
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `patientenwelt-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(envelope, null, 2), 'utf-8');

  const files = fs.readdirSync(backupsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  while (files.length > MAX_BACKUPS) {
    fs.unlinkSync(path.join(backupsDir, files.shift()));
  }
}

// ---------- Sitzungszustand (nur im Hauptprozess-Speicher, nie an den Renderer) ----------

let cachedDEK = null;
let currentUser = null; // { id, name, role } – unkritisch, darf an den Renderer

function requireUnlocked() {
  if (!cachedDEK || !currentUser) {
    throw new Error('Nicht angemeldet.');
  }
}

function requireAdmin() {
  requireUnlocked();
  if (currentUser.role !== 'admin') {
    throw new Error('Nur für Administratoren.');
  }
}

// ---------- IPC: Authentifizierung ----------

ipcMain.handle('auth:has-account', () => {
  const envelope = readEnvelope();
  return !!(envelope && envelope.users.length > 0);
});

ipcMain.handle('auth:list-users', () => {
  const envelope = readEnvelope();
  if (!envelope) return [];
  return envelope.users.map((u) => ({ id: u.id, name: u.name, role: u.role }));
});

ipcMain.handle('auth:setup', (event, name, password) => {
  if (readEnvelope()) {
    return { success: false, error: 'Es existiert bereits ein Konto. Bitte anmelden.' };
  }
  if (!name || !name.trim() || !password || password.length < 6) {
    return { success: false, error: 'Name erforderlich, Passwort mindestens 6 Zeichen.' };
  }

  const dek = crypto.randomBytes(KEY_LENGTH);
  const userId = crypto.randomUUID();
  const wrapped = wrapKey(dek, password);
  const initialState = {
    patients: [],
    auditLog: [{
      id: crypto.randomUUID(),
      datum: new Date().toISOString(),
      userId,
      userName: name.trim(),
      action: 'Konto eingerichtet',
      details: 'Erstes Admin-Konto angelegt, Datenverschlüsselung aktiviert.'
    }]
  };
  const envelope = {
    version: 2,
    users: [{ id: userId, name: name.trim(), role: 'admin', ...wrapped }],
    ...encryptData(dek, initialState)
  };
  writeEnvelope(envelope);
  writeBackup(envelope);

  cachedDEK = dek;
  currentUser = { id: userId, name: name.trim(), role: 'admin' };
  return { success: true, state: initialState, user: currentUser };
});

ipcMain.handle('auth:login', (event, userId, password) => {
  const envelope = readEnvelope();
  if (!envelope) return { success: false, error: 'Kein Konto vorhanden.' };
  const userEntry = envelope.users.find((u) => u.id === userId);
  if (!userEntry) return { success: false, error: 'Unbekannter Benutzer.' };

  let dek;
  try {
    dek = unwrapKey(userEntry, password || '');
  } catch (err) {
    return { success: false, error: 'Falsches Passwort.' };
  }

  let state;
  try {
    state = decryptData(dek, envelope);
  } catch (err) {
    return { success: false, error: 'Daten konnten nicht entschlüsselt werden.' };
  }

  cachedDEK = dek;
  currentUser = { id: userEntry.id, name: userEntry.name, role: userEntry.role };
  return { success: true, state, user: currentUser };
});

ipcMain.handle('auth:lock', () => {
  cachedDEK = null;
  currentUser = null;
  return true;
});

ipcMain.handle('auth:add-user', (event, name, password, role) => {
  try {
    requireAdmin();
  } catch (err) {
    return { success: false, error: err.message };
  }
  if (!name || !name.trim() || !password || password.length < 6) {
    return { success: false, error: 'Name erforderlich, Passwort mindestens 6 Zeichen.' };
  }
  if (role !== 'admin' && role !== 'mitarbeiter') {
    return { success: false, error: 'Ungültige Rolle.' };
  }

  const envelope = readEnvelope();
  if (!envelope) return { success: false, error: 'Kein Konto vorhanden.' };
  if (envelope.users.some((u) => u.name.toLowerCase() === name.trim().toLowerCase())) {
    return { success: false, error: 'Ein Benutzer mit diesem Namen existiert bereits.' };
  }

  const wrapped = wrapKey(cachedDEK, password);
  const newUser = { id: crypto.randomUUID(), name: name.trim(), role, ...wrapped };
  envelope.users.push(newUser);
  writeEnvelope(envelope);
  writeBackup(envelope);

  return { success: true, users: envelope.users.map((u) => ({ id: u.id, name: u.name, role: u.role })) };
});

ipcMain.handle('auth:remove-user', (event, userId) => {
  try {
    requireAdmin();
  } catch (err) {
    return { success: false, error: err.message };
  }

  const envelope = readEnvelope();
  if (!envelope) return { success: false, error: 'Kein Konto vorhanden.' };

  const target = envelope.users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'Benutzer nicht gefunden.' };

  const remainingAdmins = envelope.users.filter((u) => u.role === 'admin' && u.id !== userId);
  if (target.role === 'admin' && remainingAdmins.length === 0) {
    return { success: false, error: 'Der letzte Administrator kann nicht entfernt werden.' };
  }

  envelope.users = envelope.users.filter((u) => u.id !== userId);
  writeEnvelope(envelope);
  writeBackup(envelope);

  if (currentUser && currentUser.id === userId) {
    cachedDEK = null;
    currentUser = null;
  }

  return { success: true, users: envelope.users.map((u) => ({ id: u.id, name: u.name, role: u.role })) };
});

ipcMain.handle('auth:change-password', (event, userId, oldPassword, newPassword) => {
  try {
    requireUnlocked();
  } catch (err) {
    return { success: false, error: err.message };
  }
  if (currentUser.id !== userId && currentUser.role !== 'admin') {
    return { success: false, error: 'Keine Berechtigung.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Neues Passwort muss mindestens 6 Zeichen haben.' };
  }

  const envelope = readEnvelope();
  if (!envelope) return { success: false, error: 'Kein Konto vorhanden.' };
  const userEntry = envelope.users.find((u) => u.id === userId);
  if (!userEntry) return { success: false, error: 'Benutzer nicht gefunden.' };

  // Wer sein eigenes Passwort ändert, muss das alte kennen; ein Administrator kann
  // fremde Passwörter ohne Kenntnis des alten zurücksetzen (Recovery-Fall).
  if (currentUser.id === userId) {
    try {
      unwrapKey(userEntry, oldPassword || '');
    } catch (err) {
      return { success: false, error: 'Altes Passwort ist falsch.' };
    }
  }

  const wrapped = wrapKey(cachedDEK, newPassword);
  Object.assign(userEntry, wrapped);
  writeEnvelope(envelope);
  writeBackup(envelope);

  return { success: true };
});

// ---------- IPC: Daten speichern ----------

ipcMain.handle('data:save', (event, state) => {
  try {
    requireUnlocked();
  } catch (err) {
    return { success: false, error: err.message };
  }
  const envelope = readEnvelope();
  if (!envelope) return { success: false, error: 'Kein Konto vorhanden.' };

  const updated = {
    version: 2,
    users: envelope.users,
    ...encryptData(cachedDEK, state)
  };
  writeEnvelope(updated);
  writeBackup(updated);
  return { success: true };
});

ipcMain.handle('data:reload', () => {
  try {
    requireUnlocked();
  } catch (err) {
    return { success: false, error: err.message };
  }
  const envelope = readEnvelope();
  if (!envelope) return { success: false, error: 'Kein Konto vorhanden.' };
  try {
    const state = decryptData(cachedDEK, envelope);
    return { success: true, state };
  } catch (err) {
    return { success: false, error: 'Daten konnten nicht gelesen werden.' };
  }
});

// ---------- IPC: Backups ----------

ipcMain.handle('backups:list', () => {
  try {
    requireAdmin();
  } catch (err) {
    return { success: false, error: err.message };
  }
  if (!fs.existsSync(backupsDir)) return { success: true, backups: [] };
  const backups = fs.readdirSync(backupsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupsDir, f));
      return { filename: f, mtime: stat.mtime.toISOString(), size: stat.size };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
  return { success: true, backups };
});

ipcMain.handle('backups:restore', (event, filename) => {
  try {
    requireAdmin();
  } catch (err) {
    return { success: false, error: err.message };
  }
  const backupPath = path.join(backupsDir, path.basename(filename));
  if (!fs.existsSync(backupPath)) return { success: false, error: 'Backup nicht gefunden.' };

  let envelope;
  try {
    envelope = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  } catch (err) {
    return { success: false, error: 'Backup-Datei ist beschädigt.' };
  }

  let state;
  try {
    state = decryptData(cachedDEK, envelope);
  } catch (err) {
    return { success: false, error: 'Backup konnte nicht mit dem aktuellen Schlüssel entschlüsselt werden.' };
  }

  // Vor dem Wiederherstellen den aktuellen Stand selbst noch als Backup sichern.
  const current = readEnvelope();
  if (current) writeBackup(current);

  writeEnvelope(envelope);
  return { success: true, state };
});

// ---------- Fenster ----------

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#eaf2ff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('closed', () => {
    cachedDEK = null;
    currentUser = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  cachedDEK = null;
  currentUser = null;
  if (process.platform !== 'darwin') app.quit();
});
