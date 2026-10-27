'use strict';
// Datenspeicher von My Route: atomar, nur für den Benutzer lesbar (0600) und – wenn das Betriebssystem
// einen Schlüsselbund bereitstellt – mit Electron safeStorage verschlüsselt (Windows DPAPI, macOS Keychain,
// Linux Secret Service). Defekte/nicht entschlüsselbare Dateien werden nie überschrieben, sondern beiseitegelegt.

const FORMAT = 2;

function emptyState() {
  return {
    favorites: [],
    routes: [],
    look: 'gold3d',
    touch: 'auto',
    mapMode: '3d',
    privacy: { accepted: false, autoUpdate: true, consent: { geocode: false, route: false } }
  };
}

function createStore({ fs, path, filePath, safeStorage, platform, isValidState, maxBytes, now }) {
  const clock = now || (() => Date.now());
  const bakPath = filePath + '.bak';

  function strong() {
    try {
      if (!safeStorage || !safeStorage.isEncryptionAvailable()) return false;
      if (platform === 'linux' && typeof safeStorage.getSelectedStorageBackend === 'function') {
        const backend = safeStorage.getSelectedStorageBackend();
        if (backend === 'basic_text' || backend === 'unknown') return false; // kein echter Schlüsselbund
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function decode(raw) {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.format === FORMAT) {
      if (parsed.enc === 'safeStorage') {
        if (!strong()) throw new Error('Schlüsselbund nicht verfügbar');
        return JSON.parse(safeStorage.decryptString(Buffer.from(String(parsed.data), 'base64')));
      }
      if (parsed.enc === 'none') return parsed.data;
      throw new Error('Unbekanntes Speicherformat');
    }
    return parsed; // ältere, unverpackte Datei
  }

  function tryRead(file) {
    const stat = fs.statSync(file);
    if (stat.size > maxBytes) throw new Error('Datei zu groß');
    const state = decode(fs.readFileSync(file, 'utf-8'));
    if (!isValidState(state)) throw new Error('Ungültige Datenstruktur');
    return state;
  }

  function aside(file) {
    const target = `${file}.unreadable-${clock()}`;
    try {
      fs.renameSync(file, target);
      return target;
    } catch (err) {
      return null;
    }
  }

  // { state, status: 'new' | 'ok' | 'recovered', backupPath? }
  function load() {
    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(bakPath)) {
        try {
          return { state: tryRead(bakPath), status: 'recovered', backupPath: bakPath };
        } catch (err) {
          /* weiter */
        }
      }
      return { state: emptyState(), status: 'new' };
    }
    try {
      return { state: tryRead(filePath), status: 'ok' };
    } catch (err) {
      const moved = aside(filePath);
      if (fs.existsSync(bakPath)) {
        try {
          return { state: tryRead(bakPath), status: 'recovered', backupPath: moved };
        } catch (err2) {
          /* weiter */
        }
      }
      return { state: emptyState(), status: 'recovered', backupPath: moved };
    }
  }

  function save(state) {
    if (!isValidState(state)) throw new Error('Ungültige Datenstruktur – Speichern abgelehnt.');
    const json = JSON.stringify(state);
    if (Buffer.byteLength(json, 'utf-8') > maxBytes) throw new Error('Datenmenge überschreitet das zulässige Limit.');
    const envelope = strong()
      ? { format: FORMAT, enc: 'safeStorage', data: safeStorage.encryptString(json).toString('base64') }
      : { format: FORMAT, enc: 'none', data: state };
    const serialized = JSON.stringify(envelope);
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(tmp, serialized, { encoding: 'utf-8', mode: 0o600 });
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, bakPath);
        fs.chmodSync(bakPath, 0o600);
      } catch (err) {
        /* Sicherung ist nur ein Zusatz */
      }
    }
    fs.renameSync(tmp, filePath);
    try {
      fs.chmodSync(filePath, 0o600);
    } catch (err) {
      /* FAT/exFAT kennen keine Unix-Rechte */
    }
  }

  // Recht auf Löschung (Art. 17 DSGVO): Datendatei, Sicherung und beiseitegelegte Dateien entfernen.
  function wipe() {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    let removed = 0;
    for (const name of fs.readdirSync(dir)) {
      if (name === base || name.startsWith(base + '.')) {
        try {
          fs.unlinkSync(path.join(dir, name));
          removed += 1;
        } catch (err) {
          /* nächste Datei */
        }
      }
    }
    return removed;
  }

  return { load, save, wipe, isEncrypted: strong, emptyState };
}

module.exports = { createStore, emptyState };
