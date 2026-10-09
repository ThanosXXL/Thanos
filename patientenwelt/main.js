const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dataFilePath = path.join(app.getPath('userData'), 'patientenwelt-data.json');
const backupsDir = path.join(app.getPath('userData'), 'backups');

// OWASP (2023) empfiehlt mindestens 600.000 Iterationen für PBKDF2-HMAC-SHA256. Bestehende
// Konten, die vor dieser Härtung angelegt wurden, speichern ihre tatsächliche Iterationszahl
// pro Benutzer (Feld `iterations`); fehlt das Feld, war es der alte Standardwert. So bleiben
// alte Konten ohne Migration entschlüsselbar, während jede Neuanlage und jeder Passwortwechsel
// automatisch den aktuellen, stärkeren Wert verwendet (siehe `auth:login` für die stille
// Anhebung bestehender Konten beim nächsten erfolgreichen Login).
const PBKDF2_ITERATIONS = 600000;
const PBKDF2_ITERATIONS_LEGACY = 210000;
const KEY_LENGTH = 32; // 256 bit
const MAX_BACKUPS = 10;
const MIN_PASSWORD_LENGTH = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 Minuten Sperre je Benutzerkonto nach zu vielen Fehlversuchen

// ---------- Kryptografie-Hilfsfunktionen ----------
// AES-256-GCM für die Daten, PBKDF2-SHA256 zur Passwort-Ableitung. Jeder Benutzer
// wickelt (wrapped) denselben Daten-Schlüssel (DEK) mit seinem eigenen Passwort ein,
// sodass mehrere Benutzer unabhängig voneinander dieselben Daten entschlüsseln können,
// ohne dass der DEK selbst je unverschlüsselt gespeichert wird.

function deriveKey(password, saltHex, iterations) {
  const salt = Buffer.from(saltHex, 'hex');
  return crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256');
}

function wrapKey(dek, password) {
  const salt = crypto.randomBytes(16);
  const iterations = PBKDF2_ITERATIONS;
  const key = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const wrapped = Buffer.concat([cipher.update(dek), cipher.final()]);
  return {
    salt: salt.toString('hex'),
    iterations,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    wrappedKey: wrapped.toString('hex')
  };
}

function unwrapKey(userEntry, password) {
  const iterations = userEntry.iterations || PBKDF2_ITERATIONS_LEGACY;
  const key = deriveKey(password, userEntry.salt, iterations);
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

// Beschränkt Dateirechte auf den Besitzer (0600), damit andere lokale Benutzerkonten auf
// demselben Rechner die verschlüsselte Datei nicht einmal lesen können. Unter Windows greift
// das POSIX-Rechtemodell nicht vollständig — dort bleibt die NTFS-ACL des userData-Ordners
// maßgeblich; der Aufruf ist dort ein No-Op-artiger Best-Effort und darf nie fehlschlagen.
function restrictToOwner(filePath) {
  try {
    fs.chmodSync(filePath, 0o600);
  } catch (err) {
    // Bewusst ignoriert (z. B. auf Windows oder bei Dateisystemen ohne POSIX-Rechte).
  }
}

function writeEnvelope(envelope) {
  fs.writeFileSync(dataFilePath, JSON.stringify(envelope, null, 2), 'utf-8');
  restrictToOwner(dataFilePath);
}

function writeBackup(envelope) {
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `patientenwelt-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(envelope, null, 2), 'utf-8');
  restrictToOwner(backupPath);

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
  if (!name || !name.trim() || !password || password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Name erforderlich, Passwort mindestens ${MIN_PASSWORD_LENGTH} Zeichen.` };
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

  // Brute-Force-Schutz: nach MAX_LOGIN_ATTEMPTS Fehlversuchen wird genau dieses Benutzerkonto
  // für LOCKOUT_DURATION_MS gesperrt. Der Zähler steht unverschlüsselt neben Salt/IV in der
  // Benutzerliste (nicht sensibel) und übersteht daher auch einen Neustart der App.
  const now = Date.now();
  if (userEntry.lockedUntil) {
    const lockedUntilMs = new Date(userEntry.lockedUntil).getTime();
    if (lockedUntilMs > now) {
      const remainingMin = Math.ceil((lockedUntilMs - now) / 60000);
      return { success: false, error: `Konto vorübergehend gesperrt (zu viele Fehlversuche). Bitte in ${remainingMin} Minute(n) erneut versuchen.` };
    }
  }

  let dek;
  try {
    dek = unwrapKey(userEntry, password || '');
  } catch (err) {
    userEntry.failedAttempts = (userEntry.failedAttempts || 0) + 1;
    if (userEntry.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      userEntry.lockedUntil = new Date(now + LOCKOUT_DURATION_MS).toISOString();
    }
    writeEnvelope(envelope);
    return { success: false, error: 'Falsches Passwort.' };
  }

  let state;
  try {
    state = decryptData(dek, envelope);
  } catch (err) {
    return { success: false, error: 'Daten konnten nicht entschlüsselt werden.' };
  }

  let envelopeChanged = false;

  const priorFailedAttempts = userEntry.failedAttempts || 0;
  if (priorFailedAttempts > 0 || userEntry.lockedUntil) {
    userEntry.failedAttempts = 0;
    userEntry.lockedUntil = null;
    envelopeChanged = true;
    if (priorFailedAttempts > 0) {
      if (!Array.isArray(state.auditLog)) state.auditLog = [];
      state.auditLog.unshift({
        id: crypto.randomUUID(),
        datum: new Date().toISOString(),
        userId: userEntry.id,
        userName: userEntry.name,
        action: 'Anmeldung nach Fehlversuchen',
        details: `${priorFailedAttempts} fehlgeschlagene(r) Anmeldeversuch(e) vor dieser erfolgreichen Anmeldung.`
      });
    }
  }

  // Stillschweigende Anhebung älterer, schwächer gehärteter Konten auf den aktuellen
  // PBKDF2-Standard — ohne erzwungenen Passwort-Reset, da das Passwort hier im Klartext vorliegt.
  if ((userEntry.iterations || PBKDF2_ITERATIONS_LEGACY) < PBKDF2_ITERATIONS) {
    Object.assign(userEntry, wrapKey(dek, password));
    envelopeChanged = true;
  }

  if (envelopeChanged) {
    const updated = { version: 2, users: envelope.users, ...encryptData(dek, state) };
    writeEnvelope(updated);
    writeBackup(updated);
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
  if (!name || !name.trim() || !password || password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Name erforderlich, Passwort mindestens ${MIN_PASSWORD_LENGTH} Zeichen.` };
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
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Neues Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.` };
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

// ---------- IPC: Datenexport (Art. 20 DSGVO – Datenportabilität) ----------
// Der Export selbst arbeitet mit bereits entschlüsselten Daten, die der Renderer übergibt
// (kein erneuter Zugriff auf die verschlüsselte Datei nötig) — verlangt aber trotzdem eine
// aktive Anmeldung, damit nicht im gesperrten Zustand exportiert werden kann.

ipcMain.handle('export:save-file', async (event, defaultName, content, filterName, filterExt) => {
  try {
    requireUnlocked();
  } catch (err) {
    return { success: false, error: err.message };
  }

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: filterName, extensions: [filterExt] }]
  });
  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: 'Datei konnte nicht geschrieben werden.' };
  }
});

// ---------- Fenster ----------

let mainWindow = null;

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
      nodeIntegration: false,
      sandbox: true,
      // Chromiums Rechtschreibprüfung kann serverseitige Wörterbücher nutzen; da hier
      // Gesundheitsdaten (Diagnosen, Befunde, Verlaufstexte) eingetippt werden, bleibt
      // Spellcheck komplett aus, statt sich auf die Standardeinstellung zu verlassen.
      spellcheck: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Härtung gegen das Abdriften des Fensters zu fremden Inhalten (z. B. falls über eine noch
  // unbekannte Lücke jemals Markup/Links in die rein lokale Seite gelangen sollten): die App
  // lädt ausschließlich ihre eigene lokale index.html und öffnet nie neue Fenster/Tabs.
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow = win;
  win.on('closed', () => {
    cachedDEK = null;
    currentUser = null;
    mainWindow = null;
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
