'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createStore, emptyState } = require('../lib/store');

function fakeSafeStorage(available = true, backend = 'gnome_libsecret') {
  const key = crypto.randomBytes(32);
  return {
    isEncryptionAvailable: () => available,
    getSelectedStorageBackend: () => backend,
    encryptString(text) {
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', key, iv);
      const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
      return Buffer.concat([iv, c.getAuthTag(), ct]);
    },
    decryptString(buf) {
      const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
      d.setAuthTag(buf.subarray(12, 28));
      return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
    }
  };
}

const isValidState = (d) => !!d && Array.isArray(d.favorites) && Array.isArray(d.routes);
function mk(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'myroute-test-'));
  const filePath = path.join(dir, 'my-route-data.json');
  const safe = opts.safeStorage === undefined ? fakeSafeStorage() : opts.safeStorage;
  const store = createStore({ fs, path, filePath, safeStorage: safe, platform: opts.platform || 'linux', isValidState, maxBytes: opts.maxBytes || 1e6 });
  return { dir, filePath, safe, store };
}
const sample = () => ({ ...emptyState(), favorites: [{ id: 'a', name: 'Café Löwenherz', address: 'Hauptstr. 1, Köln' }] });

test('neuer Speicher liefert leeren Zustand', () => {
  const { store } = mk();
  const r = store.load();
  assert.equal(r.status, 'new');
  assert.deepEqual(r.state.favorites, []);
});

test('Speichern verschlüsselt: Klartext (Adresse) steht nicht in der Datei', () => {
  const { store, filePath } = mk();
  store.save(sample());
  const raw = fs.readFileSync(filePath, 'utf8');
  assert.ok(!raw.includes('Löwenherz') && !raw.includes('Hauptstr'));
  assert.equal(JSON.parse(raw).enc, 'safeStorage');
  assert.equal(store.load().state.favorites[0].name, 'Café Löwenherz');
});

test('Datei hat Rechte 0600 (außer Windows)', { skip: process.platform === 'win32' }, () => {
  const { store, filePath } = mk();
  store.save(sample());
  assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
});

test('ohne Schlüsselbund (basic_text) wird unverschlüsselt, aber weiter mit 0600 gespeichert', () => {
  const { store, filePath } = mk({ safeStorage: fakeSafeStorage(true, 'basic_text') });
  assert.equal(store.isEncrypted(), false);
  store.save(sample());
  assert.equal(JSON.parse(fs.readFileSync(filePath, 'utf8')).enc, 'none');
  assert.equal(store.load().state.favorites.length, 1);
});

test('alte unverpackte Datei wird gelesen (Migration)', () => {
  const { store, filePath } = mk();
  fs.writeFileSync(filePath, JSON.stringify({ favorites: [{ id: 'x', name: 'Alt' }], routes: [] }));
  assert.equal(store.load().state.favorites[0].name, 'Alt');
  store.save(store.load().state);
  assert.equal(JSON.parse(fs.readFileSync(filePath, 'utf8')).enc, 'safeStorage');
});

test('nicht entschlüsselbare Datei wird NICHT überschrieben, sondern beiseitegelegt', () => {
  const a = mk();
  a.store.save(sample());
  // anderer Schlüsselbund (z. B. nach Zurücksetzen des Betriebssystem-Schlüsselbunds)
  const b = createStore({ fs, path, filePath: a.filePath, safeStorage: fakeSafeStorage(), platform: 'linux', isValidState, maxBytes: 1e6 });
  const r = b.load();
  assert.equal(r.status, 'recovered');
  assert.ok(r.backupPath && fs.existsSync(r.backupPath), 'beiseitegelegte Datei existiert');
  assert.ok(fs.readFileSync(r.backupPath, 'utf8').includes('safeStorage'));
});

test('beschädigte Datei wird beiseitegelegt; Sicherung (.bak) stellt den letzten Stand wieder her', () => {
  const { store, filePath } = mk();
  store.save(sample());
  store.save({ ...sample(), favorites: [{ id: 'b', name: 'Zweiter' }] }); // .bak = erster Stand
  fs.writeFileSync(filePath, '{kaputt');
  const r = store.load();
  assert.equal(r.status, 'recovered');
  assert.equal(r.state.favorites[0].name, 'Café Löwenherz');
});

test('ungültiger Zustand und zu große Daten werden abgelehnt', () => {
  const { store } = mk({ maxBytes: 200 });
  assert.throws(() => store.save({ nope: 1 }), /Ungültige/);
  assert.throws(() => store.save({ ...sample(), favorites: Array.from({ length: 50 }, (_, i) => ({ id: String(i), name: 'x'.repeat(20) })) }), /Limit/);
});

test('wipe löscht Datei, Sicherung und beiseitegelegte Dateien', () => {
  const { store, filePath, dir } = mk();
  store.save(sample());
  store.save(sample());
  fs.writeFileSync(filePath + '.unreadable-1', 'x');
  fs.writeFileSync(path.join(dir, 'andere-datei.txt'), 'bleibt');
  assert.ok(store.wipe() >= 3);
  assert.deepEqual(fs.readdirSync(dir), ['andere-datei.txt']);
});
