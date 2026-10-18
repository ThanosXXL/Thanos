'use strict';
// Verschlüsselung der Datenablage (Art. 32 DSGVO): AES-256-GCM, Schlüssel aus
// Passwort per scrypt (speicherintensiv, bremst Brute-Force auf gestohlenen Dateien).
// Format und KDF-Parameter werden als Zusatzdaten (AAD) mitauthentifiziert; Parameter
// aus fremden Dateien werden eng begrenzt, damit eine manipulierte Sicherung
// keinen Speicher-/Rechenaufwand-Angriff (DoS) auslösen kann.

const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const FORMAT = 'it-world-vault';
const VERSION = 1;
const DEFAULT_KDF = { N: 65536, r: 8, p: 1 };
const MAX_MEM = 256 * 1024 * 1024;

function aad(kdf) {
  return Buffer.from(`${FORMAT}|${VERSION}|${kdf.N}|${kdf.r}|${kdf.p}`, 'utf8');
}

function b64(buf) {
  return buf.toString('base64');
}

function fromB64(v, len) {
  if (typeof v !== 'string' || v.length > 16 * 1024 * 1024) return null;
  const b = Buffer.from(v, 'base64');
  if (len !== undefined && b.length !== len) return null;
  return b;
}

// Gibt null zurück, wenn es sich nicht um eine gültige, ungefährliche Hülle handelt.
function parseEnvelope(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  if (o.format !== FORMAT || o.v !== VERSION || o.kdf !== 'scrypt') return null;
  const { N, r, p } = o;
  if (!Number.isInteger(N) || N < 16384 || N > 131072 || (N & (N - 1)) !== 0) return null;
  if (r !== 8 || p !== 1) return null;
  const salt = fromB64(o.salt, 16);
  const iv = fromB64(o.iv, 12);
  const tag = fromB64(o.tag, 16);
  const data = fromB64(o.data);
  if (!salt || !iv || !tag || !data || data.length === 0) return null;
  return { kdf: { salt, N, r, p }, iv, tag, data };
}

function newKdf() {
  return { salt: crypto.randomBytes(16), ...DEFAULT_KDF };
}

async function deriveKey(password, kdf) {
  return scrypt(password.normalize('NFKC'), kdf.salt, 32, { N: kdf.N, r: kdf.r, p: kdf.p, maxmem: MAX_MEM });
}

// Verschlüsselt mit frischem Zufalls-IV bei jedem Schreibvorgang.
function seal(plaintext, key, kdf) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(aad(kdf));
  const data = Buffer.concat([c.update(plaintext), c.final()]);
  return {
    format: FORMAT, v: VERSION, kdf: 'scrypt', N: kdf.N, r: kdf.r, p: kdf.p,
    salt: b64(kdf.salt), iv: b64(iv), tag: b64(c.getAuthTag()), data: b64(data)
  };
}

// Wirft bei falschem Passwort oder manipulierten Daten (GCM-Authentifizierung).
function open(parsed, key) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, parsed.iv);
  d.setAAD(aad(parsed.kdf));
  d.setAuthTag(parsed.tag);
  return Buffer.concat([d.update(parsed.data), d.final()]);
}

async function unlock(parsed, password) {
  const key = await deriveKey(password, parsed.kdf);
  try {
    return { key, plaintext: open(parsed, key) };
  } catch (err) {
    key.fill(0);
    throw new Error('Passwort falsch oder Datei beschädigt.');
  }
}

function sameKey(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { parseEnvelope, newKdf, deriveKey, seal, open, unlock, sameKey };
