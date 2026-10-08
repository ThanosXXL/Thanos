// Erzeugt web/dist: die App als installierbare Web-App (PWA) für Android, iOS und jeden Browser.
//   node build-web.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'dist');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copyDir = (from, to, skip = () => false) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, e.name);
    if (skip(src)) continue;
    e.isDirectory() ? copyDir(src, path.join(to, e.name), skip) : fs.copyFileSync(src, path.join(to, e.name));
  }
};
// Videos und große Medien gehören nicht in die Web-App
copyDir(path.join(ROOT, 'renderer'), OUT, (p) => p.includes(path.join('renderer', 'media')) && !p.endsWith('media'));
fs.rmSync(path.join(OUT, 'media'), { recursive: true, force: true });
fs.copyFileSync(path.join(__dirname, 'docs-api-web.js'), path.join(OUT, 'docs-api-web.js'));
fs.copyFileSync(path.join(__dirname, 'sw.js'), path.join(OUT, 'sw.js'));
fs.copyFileSync(path.join(ROOT, 'build', 'icon.png'), path.join(OUT, 'icon-512.png'));
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'Allgemein Docs', short_name: 'Allgemein Docs', lang: 'de', start_url: './', scope: './', display: 'standalone',
  background_color: '#0b1f4b', theme_color: '#0b1f4b',
  icons: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }]
}, null, 2));

let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
html = html
  .replace('<title>', '<link rel="manifest" href="manifest.webmanifest" />\n  <link rel="apple-touch-icon" href="icon-512.png" />\n  <meta name="theme-color" content="#0b1f4b" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-title" content="Allgemein Docs" />\n  <title>')
  .replace('<script src="renderer.js"></script>', '<script src="docs-api-web.js"></script>\n  <script src="renderer.js"></script>');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
// Demo & Medien gibt es in der Web-App nicht (Dateien fehlen) – die Seite zeigt dann nur Hinweise
console.log('Web-App erzeugt:', OUT);
