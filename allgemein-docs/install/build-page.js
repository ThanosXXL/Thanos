// Erzeugt install/index.html (vollständiges Dokument) aus page.fragment.html und kopiert die Beilagen.
//   node build-page.js
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const head = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
// Schrift lokal einbetten (kein Abruf bei Google Fonts, DSGVO): Open Sans (OFL) als Data-URI
const font = (f) => 'data:font/ttf;base64,' + fs.readFileSync(path.join(root, 'renderer', 'fonts', f)).toString('base64');
const fontCss = `<style>@font-face{font-family:'Open Sans';src:url(${font('OpenSans-Regular.ttf')}) format('truetype');font-weight:400 600;font-display:swap}@font-face{font-family:'Open Sans';src:url(${font('OpenSans-Bold.ttf')}) format('truetype');font-weight:700 800;font-display:swap}</style>`;
const fragment = fs.readFileSync(path.join(__dirname, 'page.fragment.html'), 'utf8').replace('<!--FONTS-->', fontCss);
fs.writeFileSync(path.join(__dirname, 'page.published.html'), fragment);
fs.writeFileSync(path.join(__dirname, 'index.html'), head + fragment + '</body></html>');
fs.copyFileSync(path.join(root, 'renderer', 'img', 'logo.svg'), path.join(__dirname, 'logo.svg'));
fs.copyFileSync(path.join(root, 'renderer', 'vendor', 'qrcode.js'), path.join(__dirname, 'qrcode.js'));
const poster = path.join(root, 'renderer', 'media', 'demo-poster.jpg');
if (fs.existsSync(poster)) fs.copyFileSync(poster, path.join(__dirname, 'demo-poster.jpg'));
console.log('install/index.html erzeugt');
