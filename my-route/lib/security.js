'use strict';
// Reine Sicherheits-Hilfsfunktionen (ohne Electron-Abhängigkeit, daher mit node:test prüfbar).

// Nur diese Ziele dürfen über „Route fahren“ bzw. „Download-Seite öffnen“ im Systembrowser geöffnet werden.
const ALLOWED_LINKS = [
  { host: 'www.google.com', path: '/maps/' },
  { host: 'maps.apple.com', path: '/' },
  { host: 'www.openstreetmap.org', path: '/directions' },
  { host: 'github.com', path: '/thanosxxl/thanos/releases' }
];

function isAllowedExternalUrl(url) {
  let u;
  try {
    u = new URL(String(url));
  } catch (err) {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  const path = u.pathname.toLowerCase();
  return ALLOWED_LINKS.some((r) => u.hostname === r.host && path.startsWith(r.path.toLowerCase()));
}

// IPC-Aufrufe nur vom Hauptframe unseres eigenen Fensters (lokale file:-Seite) annehmen.
function isTrustedSender(event, webContents) {
  try {
    const frame = event && event.senderFrame;
    if (!frame || !webContents || webContents.isDestroyed()) return false;
    if (event.sender !== webContents) return false;
    if (frame.parent !== null && frame.parent !== undefined) return false;
    return typeof frame.url === 'string' && frame.url.startsWith('file:');
  } catch (err) {
    return false;
  }
}

function isCoord(p) {
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
}

// Antwort höchstens maxBytes groß einlesen (Schutz vor überlangen/manipulierten Antworten).
async function readLimitedText(res, maxBytes) {
  const declared = Number(res.headers && res.headers.get && res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('Antwort zu groß');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error('Antwort zu groß');
  return buf.toString('utf8');
}

// Antwort des Routing-Dienstes auf das Nötigste reduzieren: nur Zahlen, begrenzte Anzahl Strecken/Punkte.
function sanitizeOsrm(json) {
  if (!json || json.code !== 'Ok' || !Array.isArray(json.routes)) return { code: 'Error', routes: [] };
  const routes = json.routes.slice(0, 4).map((r) => {
    const coords = r && r.geometry && Array.isArray(r.geometry.coordinates) ? r.geometry.coordinates : [];
    return {
      duration: Number(r && r.duration),
      distance: Number(r && r.distance),
      geometry: {
        coordinates: coords
          .slice(0, 3000)
          .filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]) && Math.abs(c[1]) <= 90 && Math.abs(c[0]) <= 180)
          .map((c) => [c[0], c[1]])
      }
    };
  }).filter((r) => Number.isFinite(r.duration) && Number.isFinite(r.distance));
  return { code: 'Ok', routes };
}

module.exports = { sanitizeOsrm, ALLOWED_LINKS, isAllowedExternalUrl, isTrustedSender, isCoord, readLimitedText };
