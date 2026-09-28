'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const bad = (msg, extra) => new HttpError(400, msg, extra);
const forbidden = (msg = 'Keine Berechtigung für diese Aktion.') => new HttpError(403, msg);
const notFound = (msg = 'Nicht gefunden.') => new HttpError(404, msg);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; " +
    "connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie;
  if (!h) return out;
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ungültiges Cookie ignorieren */ }
  }
  return out;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'Die Anfrage ist zu groß.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req, limit = 1024 * 1024) {
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    throw bad('Ungültiges JSON.');
  }
}

function send(res, status, body, headers = {}) {
  const all = { ...SECURITY_HEADERS, ...headers };
  for (const k of Object.keys(all)) if (all[k] === undefined || all[k] === null) delete all[k];
  res.writeHead(status, all);
  res.end(body);
}

function sendJson(req, res, status, data, headers = {}) {
  let body = Buffer.from(JSON.stringify(data));
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers };
  if (body.length > 1400 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    body = zlib.gzipSync(body, { level: 6 });
    h['Content-Encoding'] = 'gzip';
    h.Vary = 'Accept-Encoding';
  }
  send(res, status, body, h);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

/** Statische Dateien mit ETag, Gzip-Vorkomprimierung (im Speicher) und Cache-Headern. */
function staticServer(root) {
  const cache = new Map();
  function load(file) {
    const stat = fs.statSync(file);
    const hit = cache.get(file);
    if (hit && hit.mtime === stat.mtimeMs) return hit;
    const raw = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const compressible = /text|javascript|json|svg|manifest/.test(type);
    const entry = {
      mtime: stat.mtimeMs, raw, type,
      gz: compressible && raw.length > 1024 ? zlib.gzipSync(raw, { level: 9 }) : null,
      etag: `"${crypto.createHash('sha1').update(raw).digest('base64url').slice(0, 20)}"`,
    };
    cache.set(file, entry);
    return entry;
  }
  return function serve(req, res, urlPath, extraHeaders = {}) {
    let rel;
    try { rel = decodeURIComponent(urlPath); } catch { return false; }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(root, path.normalize(rel).replace(/^([/\\])+/, ''));
    if (!file.startsWith(root + path.sep)) return false;
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
    const e = load(file);
    const headers = {
      ...extraHeaders,
      'Content-Type': e.type, ETag: e.etag, Vary: 'Accept-Encoding',
      'Cache-Control': e.type.startsWith('text/html') ? 'no-cache' : /\/img\//.test(file) ? 'public, max-age=604800' : 'no-cache',
    };
    if (req.headers['if-none-match'] === e.etag) {
      send(res, 304, undefined, headers);
      return true;
    }
    if (e.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      headers['Content-Encoding'] = 'gzip';
      send(res, 200, req.method === 'HEAD' ? undefined : e.gz, headers);
    } else {
      send(res, 200, req.method === 'HEAD' ? undefined : e.raw, headers);
    }
    return true;
  };
}

function clientIp(req) {
  if (process.env.TRUST_PROXY === 'true') {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unbekannt';
}

module.exports = {
  HttpError, bad, forbidden, notFound, parseCookies, readJson, readBody, send, sendJson,
  staticServer, clientIp, SECURITY_HEADERS,
};
