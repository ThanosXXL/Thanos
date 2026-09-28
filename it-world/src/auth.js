'use strict';
const crypto = require('node:crypto');

const SESSION_COOKIE = 'itw_sid';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 Tage, gleitend verlängert

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(pw, stored) {
  if (typeof stored !== 'string') return false;
  const [algo, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Das Passwort muss mindestens 8 Zeichen lang sein.';
  if (pw.length > 200) return 'Das Passwort ist zu lang.';
  if (!/[A-Za-zÄÖÜäöüß]/.test(pw) || !/\d/.test(pw)) return 'Das Passwort muss Buchstaben und Ziffern enthalten.';
  return null;
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, Date.now() + SESSION_TTL_MS);
  // Gelegentlich abgelaufene Sessions aufräumen
  if (Math.random() < 0.05) db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  return token;
}

function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE id = ?').run(sha256(token));
}

function userFromToken(db, token) {
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const row = db.prepare(`
    SELECT u.id, u.tenant_id, u.name, u.email, u.rolle, u.aktiv, u.muss_passwort_aendern, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`).get(id);
  if (!row || row.expires_at < Date.now() || !row.aktiv) return null;
  // Gleitende Verlängerung, aber höchstens einmal pro Stunde schreiben
  if (row.expires_at - Date.now() < SESSION_TTL_MS - 3600_000) {
    db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(Date.now() + SESSION_TTL_MS, id);
  }
  delete row.expires_at;
  return row;
}

/** Einfache In-Memory-Drossel gegen Brute-Force (pro Schlüssel, z. B. IP). */
function rateLimiter(max, windowMs) {
  const hits = new Map();
  return {
    hit(key) {
      const now = Date.now();
      const e = hits.get(key);
      if (!e || e.reset < now) {
        hits.set(key, { n: 1, reset: now + windowMs });
        if (hits.size > 10000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
        return true;
      }
      e.n++;
      return e.n <= max;
    },
    reset(key) { hits.delete(key); },
  };
}

module.exports = {
  SESSION_COOKIE, SESSION_TTL_MS, hashPassword, verifyPassword, passwordProblem,
  createSession, destroySession, userFromToken, rateLimiter,
};
