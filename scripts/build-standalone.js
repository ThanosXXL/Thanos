// Baut handbuch/Buchhaltung-App.html: eine einzige, in sich geschlossene
// HTML-Datei mit index.html + style.css + renderer.js komplett inline,
// damit die App ohne Installation direkt aus dem Browser nutzbar ist
// (Einträge werden per localStorage-Fallback gespeichert).
//
// Bei jeder Änderung an renderer/index.html, style.css oder renderer.js
// muss dieses Skript erneut laufen (npm run build:standalone), sonst
// veraltet die Standalone-Datei stillschweigend.

const fs = require('fs');
const path = require('path');

const RENDERER = path.join(__dirname, '..', 'renderer');
const OUT_PATH = path.join(__dirname, '..', 'handbuch', 'Buchhaltung-App.html');

let html = fs.readFileSync(path.join(RENDERER, 'index.html'), 'utf-8');
const css = fs.readFileSync(path.join(RENDERER, 'style.css'), 'utf-8');
const js = fs.readFileSync(path.join(RENDERER, 'renderer.js'), 'utf-8');

// CSP would block the inlined <script>; manifest/icons don't exist standalone.
html = html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*\/>\n/, '\n');
html = html.replace(/\s*<link rel="manifest"[^>]*\/>\n/, '\n');
html = html.replace(/\s*<link rel="apple-touch-icon"[^>]*\/>\n/, '\n');
html = html.replace(/\s*<link rel="icon"[^>]*\/>\n/, '\n');

html = html.replace(
  '<link rel="stylesheet" href="style.css" />',
  `<style>\n${css}\n</style>`
);
html = html.replace(
  '<script src="renderer.js"></script>',
  `<script>\n${js}\n</script>`
);

// The relative download.html this button normally opens won't exist
// alongside a standalone file, so point it at the real release page instead.
html = html.replace(
  'href="download.html" title="Buchhaltung! für alle Geräte herunterladen"',
  'href="https://github.com/ThanosXXL/Thanos/releases/tag/v1.1.0" title="Buchhaltung! für alle Geräte herunterladen" target="_blank" rel="noopener"'
);

html = html.replace('<title>Buchhaltung!</title>', '<title>Buchhaltung! – Direkt nutzen</title>');

fs.writeFileSync(OUT_PATH, html);
console.log(`handbuch/Buchhaltung-App.html neu gebaut (${(fs.statSync(OUT_PATH).size / 1024).toFixed(0)} KB).`);
