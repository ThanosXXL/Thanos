// Gehärteter, abhängigkeitsfreier Static-Server. Start: node server.js (PORT, Default 8080)
// Hinter einem Reverse-Proxy mit TLS betreiben (HSTS gilt nur über HTTPS).
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = __dirname, TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const HEAD = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'same-origin',
};
const PUBLIC = /^(index|ensemble-gross|ensemble-mittel|ensemble-klein|trachten|taenze|instrumente|geschichte|tanzgruppe|impressum|datenschutz)\.html$|^(css|js|img)\/[\w.-]+$/;
http.createServer((req, res) => {
  const send = (code, body, type = 'text/plain; charset=utf-8') => { res.writeHead(code, { ...HEAD, 'Content-Type': type }); res.end(body); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'Method Not Allowed');
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send(400, 'Bad Request'); }
  p = p === '/' ? 'index.html' : p.slice(1);
  if (p.includes('..') || !PUBLIC.test(p)) return send(404, 'Nicht gefunden');
  fs.readFile(path.join(ROOT, p), (e, buf) => e ? send(404, 'Nicht gefunden') :
    (res.writeHead(200, { ...HEAD, 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream',
      'Cache-Control': p.endsWith('.html') ? 'no-cache' : 'public, max-age=86400' }), res.end(req.method === 'HEAD' ? undefined : buf)));
}).listen(process.env.PORT || 8080, () => console.log('Thraki läuft auf Port', process.env.PORT || 8080));
