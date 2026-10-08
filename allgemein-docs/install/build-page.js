// Erzeugt install/index.html (vollständiges Dokument) aus page.fragment.html und kopiert die Beilagen.
//   node build-page.js
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const head = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
fs.writeFileSync(path.join(__dirname, 'index.html'), head + fs.readFileSync(path.join(__dirname, 'page.fragment.html'), 'utf8') + '</body></html>');
fs.copyFileSync(path.join(root, 'renderer', 'img', 'logo.svg'), path.join(__dirname, 'logo.svg'));
fs.copyFileSync(path.join(root, 'renderer', 'vendor', 'qrcode.js'), path.join(__dirname, 'qrcode.js'));
const poster = path.join(root, 'renderer', 'media', 'demo-poster.jpg');
if (fs.existsSync(poster)) fs.copyFileSync(poster, path.join(__dirname, 'demo-poster.jpg'));
console.log('install/index.html erzeugt');
