/* Verschlüsselter Tresor für Allgemein Docs
 *
 * Alle Praxisdaten liegen als ein einziger Block (AES-256-GCM) in der Datei. Der Datenschlüssel (DEK) ist zufällig und wird
 * pro Benutzer mit einem Schlüssel aus dessen Passwort (PBKDF2-HMAC-SHA256, 600.000 Runden) verpackt; zusätzlich gibt es
 * einen Wiederherstellungsschlüssel. Passwörter und Schlüssel verlassen den Renderer nie.
 * Läuft unverändert in Electron, im Browser (Web-App) und in Node (Tests), da nur die Web-Crypto-Schnittstelle genutzt wird.
 */
(function (root, factory) {
  const api = factory(typeof globalThis !== 'undefined' ? globalThis : root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Vault = api;
})(this, function (g) {
  'use strict';

  const subtle = g.crypto.subtle;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const VERSION = 2;
  const DEFAULT_ITER = 600000;
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const aad = (s) => enc.encode('allgemein-docs/v2/' + s);
  const rnd = (n) => g.crypto.getRandomValues(new Uint8Array(n));

  function toB64(buf) {
    const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return g.btoa(s);
  }
  function fromB64(str) {
    const bin = g.atob(str);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  const fail = (code, msg) => { const e = new Error(msg); e.code = code; return e; };

  async function kek(secret, saltB64, iter) {
    const base = await subtle.importKey('raw', enc.encode(String(secret).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function wrap(dekRaw, secret, label, iter) {
    const salt = toB64(rnd(16));
    const iv = rnd(12);
    const k = await kek(secret, salt, iter);
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(label) }, k, dekRaw);
    return { salt, iv: toB64(iv), key: toB64(ct) };
  }
  async function unwrap(w, secret, label, iter) {
    const k = await kek(secret, w.salt, iter);
    try {
      return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(w.iv), additionalData: aad(label) }, k, fromB64(w.key)));
    } catch (e) {
      throw fail('auth', 'Anmeldung fehlgeschlagen');
    }
  }
  const importDek = (raw) => subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

  async function encryptState(session, state) {
    const iv = rnd(12);
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad('data') }, session.key, enc.encode(JSON.stringify(state)));
    return { iv: toB64(iv), data: toB64(ct) };
  }
  async function open(env, raw, userId) {
    const key = await importDek(raw);
    let plain;
    try {
      plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv), additionalData: aad('data') }, key, fromB64(env.data));
    } catch (e) {
      throw fail('corrupt', 'Die Datendatei ist beschädigt oder wurde verändert.');
    }
    return { session: { raw, key, userId: userId || null }, state: JSON.parse(dec.decode(plain)) };
  }

  // ---- Wiederherstellungsschlüssel (160 Bit, 8 × 4 Zeichen) -----------------
  function newRecoveryKey() {
    const bytes = rnd(20);
    let acc = 0;
    let bits = 0;
    let out = '';
    for (const x of bytes) {
      acc = (acc << 8) | x;
      bits += 8;
      while (bits >= 5) { out += ALPHABET[(acc >> (bits - 5)) & 31]; bits -= 5; }
      acc &= (1 << bits) - 1;
    }
    return out.match(/.{4}/g).join('-');
  }
  const normRecovery = (s) => String(s || '').toUpperCase().replace(/[^A-Z2-9]/g, '');

  // ---- Öffentliche Funktionen ------------------------------------------------
  async function create({ state, user, iter }) {
    iter = iter || DEFAULT_ITER;
    const raw = rnd(32);
    const recoveryKey = newRecoveryKey();
    const session = { raw, key: await importDek(raw), userId: user.id };
    const env = {
      vault: VERSION,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iter },
      created: Date.now(),
      users: [{ id: user.id, name: user.name, ...(await wrap(raw, user.password, 'user/' + user.id, iter)) }],
      recovery: { ...(await wrap(raw, normRecovery(recoveryKey), 'recovery', iter)), created: Date.now() },
      events: []
    };
    Object.assign(env, await encryptState(session, state));
    return { envelope: env, session, recoveryKey };
  }

  async function unlock(env, userId, password) {
    const u = env.users.find((x) => x.id === userId);
    if (!u) throw fail('auth', 'Anmeldung fehlgeschlagen');
    const raw = await unwrap(u, password, 'user/' + u.id, env.kdf.iter);
    return open(env, raw, userId);
  }

  async function unlockWithRecovery(env, recoveryKey) {
    const raw = await unwrap(env.recovery, normRecovery(recoveryKey), 'recovery', env.kdf.iter);
    return open(env, raw, null);
  }

  async function seal(env, session, state) {
    return { ...env, ...(await encryptState(session, state)), saved: Date.now() };
  }

  async function addUser(env, session, user) {
    const w = await wrap(session.raw, user.password, 'user/' + user.id, env.kdf.iter);
    return { ...env, users: env.users.filter((x) => x.id !== user.id).concat([{ id: user.id, name: user.name, ...w }]) };
  }
  async function setPassword(env, session, userId, password) {
    const u = env.users.find((x) => x.id === userId);
    if (!u) throw fail('nouser', 'Benutzer nicht gefunden');
    const w = await wrap(session.raw, password, 'user/' + userId, env.kdf.iter);
    return { ...env, users: env.users.map((x) => (x.id === userId ? { id: x.id, name: x.name, ...w } : x)) };
  }
  const removeUser = (env, userId) => ({ ...env, users: env.users.filter((x) => x.id !== userId) });
  const renameUser = (env, userId, name) => ({ ...env, users: env.users.map((x) => (x.id === userId ? { ...x, name } : x)) });

  async function rotateRecovery(env, session) {
    const recoveryKey = newRecoveryKey();
    const recovery = { ...(await wrap(session.raw, normRecovery(recoveryKey), 'recovery', env.kdf.iter)), created: Date.now() };
    return { envelope: { ...env, recovery }, recoveryKey };
  }

  async function verifyPassword(env, userId, password) {
    try { await unlock(env, userId, password); return true; } catch (e) { return false; }
  }

  const isEnvelope = (o) => !!o && o.vault === VERSION && Array.isArray(o.users) && typeof o.data === 'string' && typeof o.iv === 'string' && !!o.kdf;

  const COMMON = ['passwort', 'password', 'praxis', '12345678', 'qwertz', 'qwerty', 'abcdefgh', 'allgemein', 'arztpraxis', 'letmein', 'willkommen'];
  function checkPassword(pw) {
    const s = String(pw || '');
    const hints = [];
    const classes = [/[a-zäöüß]/, /[A-ZÄÖÜ]/, /[0-9]/, /[^A-Za-zÄÖÜäöüß0-9]/].filter((r) => r.test(s)).length;
    if (s.length < 12) hints.push('mindestens 12 Zeichen');
    if (classes < 3 && s.length < 16) hints.push('Groß- und Kleinbuchstaben, Zahlen oder Sonderzeichen mischen (oder mindestens 16 Zeichen)');
    if (s.length < 20 && COMMON.some((c) => s.toLowerCase().includes(c))) hints.push('keine gängigen Wörter oder Zahlenfolgen');
    if (/^(.)\1+$/.test(s)) hints.push('nicht nur ein Zeichen wiederholen');
    let score = 0;
    if (s.length >= 8) score = 1;
    if (s.length >= 12 && !hints.length) score = 2;
    if (s.length >= 14 && classes >= 3 && !hints.length) score = 3;
    if (s.length >= 18 && classes >= 3 && !hints.length) score = 4;
    return { ok: !hints.length, score, hints };
  }

  async function sha256Hex(text) {
    const d = new Uint8Array(await subtle.digest('SHA-256', enc.encode(text)));
    return Array.from(d, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  return { VERSION, DEFAULT_ITER, create, unlock, unlockWithRecovery, seal, addUser, setPassword, removeUser, renameUser, rotateRecovery, verifyPassword, isEnvelope, checkPassword, sha256Hex, newRecoveryKey, normRecovery };
});
