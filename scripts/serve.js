/*
 * Minimaler statischer Webserver für die Browser-/PWA-Variante (ohne
 * zusätzliche Abhängigkeiten). Liefert den Ordner renderer/ aus, damit die
 * Oberfläche unter http://localhost:PORT in einem sicheren Kontext läuft.
 *
 * Start:  node scripts/serve.js   (Port über Umgebungsvariable PORT, Standard 4173)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'renderer');
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
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(root, urlPath));
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
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
  console.log(`Music Heaven (Browser) läuft: http://localhost:${port}`);
  console.log('Zum Beenden Strg+C drücken.');
});
