// Unit-Tests für den verschlüsselten Tresor:  node --test test/vault.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Vault = require('../renderer/vault.js');

const ITER = 1000; // nur für die Tests (Produktivwert: 600000)
const state = () => ({ profil: { name: 'Erika Beispiel' }, medikamente: [{ id: 'm1', name: 'Ramipril 5 mg' }], werte: [] });
const user = { id: 'patient', name: 'Erika Beispiel', password: 'Sehr-geheimes-Passwort-42' };

test('Roundtrip: anlegen und entsperren', async () => {
  const { envelope } = await Vault.create({ state: state(), user, iter: ITER });
  assert.equal(Vault.isEnvelope(envelope), true);
  const { state: back, session } = await Vault.unlock(envelope, 'patient', user.password);
  assert.deepEqual(back, state());
  assert.equal(session.userId, 'patient');
});

test('Falsches Passwort und unbekannte Kennung werden abgelehnt', async () => {
  const { envelope } = await Vault.create({ state: state(), user, iter: ITER });
  await assert.rejects(() => Vault.unlock(envelope, 'patient', 'falsch'), { code: 'auth' });
  await assert.rejects(() => Vault.unlock(envelope, 'anderer', user.password), { code: 'auth' });
  assert.equal(await Vault.verifyPassword(envelope, 'patient', user.password), true);
  assert.equal(await Vault.verifyPassword(envelope, 'patient', 'x'), false);
});

test('Die Datei enthält keinen Klartext', async () => {
  const { envelope } = await Vault.create({ state: state(), user, iter: ITER });
  const text = JSON.stringify(envelope);
  assert.ok(!text.includes('Ramipril'));
  assert.ok(!text.includes('Beispiel'.repeat(2)));
  assert.ok(!text.includes(user.password));
  assert.ok(!text.includes('medikamente'));
});

test('Speichern erzeugt neue Zufallswerte und bleibt lesbar', async () => {
  const { envelope, session } = await Vault.create({ state: state(), user, iter: ITER });
  const s2 = state();
  s2.medikamente.push({ id: 'm2', name: 'Vitamin D' });
  const sealed = await Vault.seal(envelope, session, s2);
  assert.notEqual(sealed.iv, envelope.iv);
  assert.notEqual(sealed.data, envelope.data);
  const { state: back } = await Vault.unlock(sealed, 'patient', user.password);
  assert.equal(back.medikamente.length, 2);
});

test('Passwort ändern macht das alte ungültig', async () => {
  const { envelope, session } = await Vault.create({ state: state(), user, iter: ITER });
  const env2 = await Vault.setPassword(envelope, session, 'patient', 'Neues-Passwort-12345');
  await assert.rejects(() => Vault.unlock(env2, 'patient', user.password), { code: 'auth' });
  await Vault.unlock(env2, 'patient', 'Neues-Passwort-12345');
  await assert.rejects(() => Vault.setPassword(envelope, session, 'unbekannt', 'Egal-Passwort-12345'), { code: 'nouser' });
});

test('Wiederherstellungsschlüssel: entsperren, neues Passwort, Rotation', async () => {
  const { envelope, recoveryKey } = await Vault.create({ state: state(), user, iter: ITER });
  assert.match(recoveryKey, /^([A-Z2-9]{4}-){7}[A-Z2-9]{4}$/);
  const { session, state: back } = await Vault.unlockWithRecovery(envelope, recoveryKey.toLowerCase());
  assert.equal(back.medikamente.length, 1);
  await assert.rejects(() => Vault.unlockWithRecovery(envelope, 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH'), { code: 'auth' });
  const env2 = await Vault.setPassword(envelope, session, 'patient', 'Zurueckgesetzt-Passwort-7');
  await Vault.unlock(env2, 'patient', 'Zurueckgesetzt-Passwort-7');
  const rot = await Vault.rotateRecovery(env2, session);
  await assert.rejects(() => Vault.unlockWithRecovery(rot.envelope, recoveryKey), { code: 'auth' });
  await Vault.unlockWithRecovery(rot.envelope, rot.recoveryKey);
});

test('Manipulation wird erkannt', async () => {
  const { envelope } = await Vault.create({ state: state(), user, iter: ITER });
  const bad = { ...envelope, data: envelope.data.slice(0, -4) + (envelope.data.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA') };
  await assert.rejects(() => Vault.unlock(bad, 'patient', user.password), { code: 'corrupt' });
  // Die Zuordnung Wrapper <-> Kennung ist authentifiziert
  const swapped = { ...envelope, users: envelope.users.map((u) => ({ ...u, id: 'u9' })) };
  await assert.rejects(() => Vault.unlock(swapped, 'u9', user.password), { code: 'auth' });
});

test('Ein Tresor von Allgemein Docs ist kein Patienten-Welt-Tresor', () => {
  assert.equal(Vault.isEnvelope({ vault: 2, users: [], data: 'x', iv: 'y', kdf: {} }), false);
  assert.equal(Vault.isEnvelope({ vault: 1, users: [], data: 'x', iv: 'y', kdf: {} }), true);
  assert.equal(Vault.isEnvelope({ profil: {} }), false);
  assert.equal(Vault.isEnvelope(null), false);
});

test('Passwortregeln', () => {
  assert.equal(Vault.checkPassword('kurz').ok, false);
  assert.equal(Vault.checkPassword('passwort12345').ok, false);
  assert.equal(Vault.checkPassword('abcdefghijkl').ok, false);
  assert.equal(Vault.checkPassword('Hier-ist-mein-Satz-2026!').ok, true);
  assert.equal(Vault.checkPassword('Gesundheit2026Gut#').ok, false); // enthält „gesundheit“
  assert.ok(Vault.checkPassword('Ein-sehr-langes-Passwort-2026!').score >= 3);
});

test('Unicode und lange Daten (Befund-Bilder) überstehen den Roundtrip', async () => {
  const big = { profil: { name: 'Jörg Müßig – 日本' }, befunde: [{ src: 'data:image/png;base64,' + 'A'.repeat(300000) }] };
  const { envelope } = await Vault.create({ state: big, user: { ...user, password: 'Pässwörter-mit-Ümläuten-1!' }, iter: ITER });
  const { state: back } = await Vault.unlock(envelope, 'patient', 'Pässwörter-mit-Ümläuten-1!');
  assert.deepEqual(back, big);
});

test('Hilfsfunktionen', async () => {
  assert.equal(await Vault.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(Vault.normRecovery('abcd-efgh 01!'), 'ABCDEFGH');
});
