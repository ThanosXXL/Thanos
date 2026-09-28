'use strict';
// Passwort-Hashing (scrypt), Sessions, Login-Rate-Limit und Security-Header.
// Bewusst ohne native Zusatzmodule – läuft überall, wo Node ≥ 18 läuft.
const crypto = require('node:crypto');

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, saltB64, hashB64] = stored.split('$');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, SCRYPT_PARAMS);
  return crypto.timingSafeEqual(expected, actual);
}

// Passwortrichtlinie: mind. 10 Zeichen, Buchstabe + Ziffer.
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Passwort muss mindestens 10 Zeichen lang sein.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Passwort muss Buchstaben und Ziffern enthalten.';
  return null;
}

// ---------- Sessions (In-Memory, zufällige 256-Bit-Tokens, gleitender Ablauf) ----------
class SessionStore {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
    setInterval(() => this.sweep(), 60_000).unref();
  }
  create(userId, meta) {
    const token = crypto.randomBytes(32).toString('base64url');
    this.sessions.set(token, { userId, expires: Date.now() + this.ttlMs, created: Date.now(), ...meta });
    return token;
  }
  get(token) {
    if (!token) return null;
    const s = this.sessions.get(token);
    if (!s) return null;
    if (s.expires < Date.now()) { this.sessions.delete(token); return null; }
    s.expires = Date.now() + this.ttlMs;
    return s;
  }
  destroy(token) { this.sessions.delete(token); }
  destroyForUser(userId) {
    for (const [t, s] of this.sessions) if (s.userId === userId) this.sessions.delete(t);
  }
  countActive() {
    let n = 0; const now = Date.now();
    for (const s of this.sessions.values()) if (s.expires > now) n++;
    return n;
  }
  sweep() {
    const now = Date.now();
    for (const [t, s] of this.sessions) if (s.expires < now) this.sessions.delete(t);
  }
}

// ---------- Rate-Limiter (Sliding Window pro Schlüssel) ----------
class RateLimiter {
  constructor({ windowMs, max }) {
    this.windowMs = windowMs; this.max = max; this.hits = new Map();
    setInterval(() => this.sweep(), windowMs).unref();
  }
  // true = erlaubt
  hit(key) {
    const now = Date.now();
    const arr = (this.hits.get(key) || []).filter(t => now - t < this.windowMs);
    arr.push(now);
    this.hits.set(key, arr);
    return arr.length <= this.max;
  }
  reset(key) { this.hits.delete(key); }
  sweep() {
    const now = Date.now();
    for (const [k, arr] of this.hits) {
      const kept = arr.filter(t => now - t < this.windowMs);
      if (kept.length) this.hits.set(k, kept); else this.hits.delete(k);
    }
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ungültiges Cookie ignorieren */ }
  }
  return out;
}

function securityHeaders(isProd) {
  return (req, res, next) => {
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; " +
      "connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (isProd) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}

module.exports = { hashPassword, verifyPassword, passwordProblem, SessionStore, RateLimiter, parseCookies, securityHeaders };
