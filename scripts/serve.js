/*
 * Minimaler statischer Webserver für die Browser-Demo (ohne zusätzliche Abhängigkeiten).
 * Liefert den Ordner renderer/ aus, damit die Oberfläche unter http://localhost:PORT
 * in einem sicheren Kontext läuft (nötig für Kamera/Bildschirmfreigabe).
 *
 * Start:  node scripts/serve.js   (Port über Umgebungsvariable PORT, Standard 4173)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const rendererRoot = path.join(repoRoot, 'renderer');
const port = Number(process.env.PORT) || 4173;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ps1': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.webm': 'video/webm'
};

// Die App selbst (renderer/) wird komplett ausgeliefert. Für die Download-Seite
// (renderer/download.html) werden zusätzlich, schreibgeschützt und auf den
// jeweils passenden Dateityp beschränkt, die PowerShell-Skripte und die
// erzeugten PDFs aus dem Projekt-Root freigegeben.
const EXTRA_MOUNTS = [
  { prefix: '/scripts/', root: path.join(repoRoot, 'scripts'), allow: ['.ps1'] },
  { prefix: '/downloads/', root: path.join(repoRoot, 'downloads'), allow: ['.pdf', '.png', '.webm'] }
];

function resolveSafe(root, relativePath) {
  const filePath = path.normalize(path.join(root, relativePath));
  if (filePath !== root && !filePath.startsWith(root + path.sep)) return null;
  return filePath;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  let filePath = null;
  const mount = EXTRA_MOUNTS.find((m) => urlPath.startsWith(m.prefix));
  if (mount) {
    const rest = urlPath.slice(mount.prefix.length);
    if (mount.allow.includes(path.extname(rest))) {
      filePath = resolveSafe(mount.root, rest);
    }
  } else {
    filePath = resolveSafe(rendererRoot, urlPath);
  }

  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream'
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Browser-Demo läuft: http://localhost:${port}`);
  console.log('Zum Beenden Strg+C drücken.');
});
