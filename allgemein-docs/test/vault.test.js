// Unit-Tests für den verschlüsselten Tresor:  node --test test/vault.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Vault = require('../renderer/vault.js');

const ITER = 1000; // nur für die Tests (Produktivwert: 600000)
const state = () => ({ patienten: [{ id: 'p1', vorname: 'Erika', nachname: 'Mustermann' }], audit: [] });
const user = { id: 'u1', name: 'Dr. Test', password: 'Sehr-geheimes-Passwort-42' };

test('Roundtrip: anlegen und entsperren', async () => {
  const { envelope } = await Vault.create({ state: state(), user, iter: ITER });
  const { state: back, session } = await Vault.unlock(envelope, 'u1', user.password);
  assert.deepEqual(back, state());
  assert.equal(session.userId, 'u1');
});

test('Falsches Passwort und unbekannter Benutzer werden abgelehnt', async () => {
  const { envelope } = await Vault.create({ state: state(), user, iter: ITER });
  await assert.rejects(() => Vault.unlock(envelope, 'u1', 'falsch'), { code: 'auth' });
  await assert.rejects(() => Vault.unlock(envelope, 'u2', user.password), { code: 'auth' });
  assert.equal(await Vault.verifyPassword(envelope, 'u1', user.password), true);
  assert.equal(await Vault.verifyPassword(envelope, 'u1', 'x'), false);
});

test('Die Datei enthält keinen Klartext', async () => {
  const { envelope } = await Vault.create({ state: state(), user, iter: ITER });
  const text = JSON.stringify(envelope);
  assert.ok(!text.includes('Mustermann'));
  assert.ok(!text.includes('Erika'));
  assert.ok(!text.includes(user.password));
});

test('Speichern erzeugt neue Zufallswerte und bleibt lesbar', async () => {
  const { envelope, session } = await Vault.create({ state: state(), user, iter: ITER });
  const s2 = state();
  s2.patienten.push({ id: 'p2', vorname: 'Max', nachname: 'Muster' });
  const sealed = await Vault.seal(envelope, session, s2);
  assert.notEqual(sealed.iv, envelope.iv);
  assert.notEqual(sealed.data, envelope.data);
  const { state: back } = await Vault.unlock(sealed, 'u1', user.password);
  assert.equal(back.patienten.length, 2);
});

test('Weitere Benutzer: anlegen, anmelden, entfernen', async () => {
  const { envelope, session } = await Vault.create({ state: state(), user, iter: ITER });
  const env2 = await Vault.addUser(envelope, session, { id: 'u2', name: 'MFA', password: 'Anderes-Passwort-99' });
  const { state: back } = await Vault.unlock(env2, 'u2', 'Anderes-Passwort-99');
  assert.equal(back.patienten[0].nachname, 'Mustermann');
  await assert.rejects(() => Vault.unlock(env2, 'u2', user.password), { code: 'auth' });
  const env3 = Vault.removeUser(env2, 'u2');
  await assert.rejects(() => Vault.unlock(env3, 'u2', 'Anderes-Passwort-99'), { code: 'auth' });
  await Vault.unlock(env3, 'u1', user.password);
});

test('Passwort ändern macht das alte ungültig', async () => {
  const { envelope, session } = await Vault.create({ state: state(), user, iter: ITER });
  const env2 = await Vault.setPassword(envelope, session, 'u1', 'Neues-Passwort-12345');
  await assert.rejects(() => Vault.unlock(env2, 'u1', user.password), { code: 'auth' });
  await Vault.unlock(env2, 'u1', 'Neues-Passwort-12345');
});

test('Wiederherstellungsschlüssel: entsperren, neues Passwort, Rotation', async () => {
  const { envelope, recoveryKey } = await Vault.create({ state: state(), user, iter: ITER });
  assert.match(recoveryKey, /^([A-Z2-9]{4}-){7}[A-Z2-9]{4}$/);
  const { session, state: back } = await Vault.unlockWithRecovery(envelope, recoveryKey.toLowerCase());
  assert.equal(back.patienten.length, 1);
  await assert.rejects(() => Vault.unlockWithRecovery(envelope, 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH'), { code: 'auth' });
  const env2 = await Vault.setPassword(envelope, session, 'u1', 'Zurueckgesetzt-Passwort-7');
  await Vault.unlock(env2, 'u1', 'Zurueckgesetzt-Passwort-7');
  const rot = await Vault.rotateRecovery(env2, session);
  await assert.rejects(() => Vault.unlockWithRecovery(rot.envelope, recoveryKey), { code: 'auth' });
  await Vault.unlockWithRecovery(rot.envelope, rot.recoveryKey);
});

test('Manipulation wird erkannt', async () => {
  const { envelope } = await Vault.create({ state: state(), user, iter: ITER });
  const bad = { ...envelope, data: envelope.data.slice(0, -4) + (envelope.data.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA') };
  await assert.rejects(() => Vault.unlock(bad, 'u1', user.password), { code: 'corrupt' });
  // Wrapper eines Benutzers einem anderen Namen zuweisen schlägt fehl (Zuordnung ist authentifiziert)
  const swapped = { ...envelope, users: envelope.users.map((u) => ({ ...u, id: 'u9' })) };
  await assert.rejects(() => Vault.unlock(swapped, 'u9', user.password), { code: 'auth' });
});

test('Passwortregeln', () => {
  assert.equal(Vault.checkPassword('kurz').ok, false);
  assert.equal(Vault.checkPassword('passwort12345').ok, false);
  assert.equal(Vault.checkPassword('abcdefghijkl').ok, false);
  assert.equal(Vault.checkPassword('Hier-ist-mein-Satz-2026!').ok, true);
  assert.equal(Vault.checkPassword('Praxis2026Gut#').ok, false); // enthält „praxis“
  assert.ok(Vault.checkPassword('Ein-sehr-langes-Passwort-2026!').score >= 3);
});

test('Hilfsfunktionen', async () => {
  assert.equal(await Vault.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(Vault.isEnvelope({ vault: 2, users: [], data: 'x', iv: 'y', kdf: {} }), true);
  assert.equal(Vault.isEnvelope({ patienten: [] }), false);
});
