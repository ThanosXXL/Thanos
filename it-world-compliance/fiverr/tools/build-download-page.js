// Baut die eigenständige Download-Seite (eine einzige .html-Datei, Video und Bilder eingebettet, funktioniert per Doppelklick).
// Aufruf: node tools/build-download-page.js
const path = require('path');
const fs = require('fs');
const BASE = path.resolve(__dirname, '..');
const ROOT = path.resolve(BASE, '..');
const OUT = path.join(BASE, 'IT-WORLD-Fiverr-Downloadcenter.html');
const b64 = (f) => fs.readFileSync(f).toString('base64');
const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(1).replace('.', ',') + ' MB';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const VIDEO = path.join(BASE, 'IT-WORLD-Compliance-Assistent-Demovideo.mp4');
const imgDir = path.join(BASE, 'fiverr-bilder');
const IMG_LABEL = {
  '01-fiverr-hero': 'Galerie 1: Hero', '02-fiverr-pakete': 'Galerie 2: Pakete mit Preisen', '03-fiverr-funktionen': 'Galerie 3: Funktionen',
  '04-fiverr-basic': 'Paket Basic', '05-fiverr-standard': 'Paket Standard', '06-fiverr-premium': 'Paket Premium',
  '07-fiverr-voraussetzungen': 'Voraussetzungen', '08-fiverr-handbuch': 'PDF-Benutzerhandbuch', '09-fiverr-sicherheit': 'Datenschutz und Sicherheit'
};
const images = fs.readdirSync(imgDir).filter((f) => f.endsWith('.png')).sort();
const logo = b64(path.join(ROOT, 'renderer', 'assets', 'logo.png'));

const assets = [{ id: 'd_video', type: 'video/mp4', data: b64(VIDEO) }].concat(images.map((f, i) => ({ id: 'd_img' + i, type: 'image/png', data: b64(path.join(imgDir, f)) })));

const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IT-WORLD Fiverr-Downloadcenter</title>
<style>
:root{--g1:#f7dc84;--g2:#e3b94c;--cream:#f3e6c8;--muted:#b5a27a}
*{box-sizing:border-box}
body{margin:0;font-family:'Open Sans','Segoe UI','Nunito',Arial,sans-serif;color:var(--cream);line-height:1.5;
 background:radial-gradient(900px 520px at 80% -5%,rgba(227,185,76,.2),transparent 70%),radial-gradient(700px 500px at 0% 100%,rgba(184,134,43,.14),transparent 70%),#050403;min-height:100vh}
.wrap{max-width:1100px;margin:0 auto;padding:28px 20px 48px}
header{display:flex;align-items:center;gap:22px;flex-wrap:wrap;margin-bottom:26px}
.tile{width:120px;height:120px;border-radius:18px;overflow:hidden;background:#000;border:2px solid rgba(240,200,100,.65);box-shadow:0 6px 0 #040302,0 0 34px rgba(227,185,76,.3)}
.tile img{width:100%;height:100%;display:block}
.tag{font-weight:700;letter-spacing:5px;text-transform:uppercase;color:var(--g1);font-size:15px;margin-top:8px;text-align:center;text-shadow:0 1px 0 #7a5518,0 0 12px rgba(227,185,76,.5)}
h1{margin:0;font-size:clamp(26px,4vw,40px);color:var(--g1);text-shadow:0 2px 0 #d9a93e,0 4px 0 #a67820,0 6px 0 #6f4b10,0 10px 10px rgba(0,0,0,.7)}
h2{color:var(--g1);font-size:22px;margin:34px 0 10px}
p{margin:0 0 10px;color:var(--muted)}
.card{border:1px solid rgba(224,180,74,.35);border-radius:18px;padding:18px;background:linear-gradient(180deg,#1d160a,#0d0905);box-shadow:inset 0 1px 0 rgba(255,236,170,.2),0 6px 0 #040302,0 14px 28px rgba(0,0,0,.6)}
video{width:100%;border-radius:12px;background:#000;display:block;border:1px solid rgba(224,180,74,.35)}
.btn{display:inline-flex;align-items:center;gap:10px;margin-top:14px;padding:13px 26px;border-radius:14px;font-weight:700;font-size:18px;text-decoration:none;color:#2a1b04;cursor:pointer;
 border:1px solid #ffe9a3;background:linear-gradient(180deg,#fff0b0,#f0cc66 32%,#c4912f 50%,#a87a22 52%,#dcae45 80%,#f4d478);box-shadow:inset 0 2px 0 #fff8d6,0 5px 0 #6b4a12,0 10px 18px rgba(0,0,0,.55);transition:transform .1s}
.btn:hover{filter:brightness(1.08);transform:translateY(-1px)}.btn:active{transform:translateY(3px);box-shadow:inset 0 2px 0 #fff8d6,0 1px 0 #6b4a12}
.btn.small{font-size:15px;padding:9px 18px;margin-top:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.grid .card{padding:12px}.grid img{width:100%;border-radius:10px;display:block;border:1px solid rgba(224,180,74,.3)}
.cap{font-weight:700;margin:10px 0 0;color:var(--g1)}.sub{font-size:13px;color:var(--muted)}
.note{border:1px dashed rgba(240,200,100,.6);border-radius:12px;padding:12px 16px;color:var(--muted);font-size:14px;background:rgba(227,185,76,.05)}
footer{margin-top:40px;text-align:center;font-size:13px;color:var(--muted)}
</style></head><body><div class="wrap">
<header>
  <div><div class="tile"><img alt="IT-WORLD – IT Solutions" src="data:image/png;base64,${logo}"></div><div class="tag">IT Solutions</div></div>
  <div><h1>Fiverr-Downloadcenter</h1><p>IT-WORLD Compliance-Assistent · Demovideo und Galeriebilder</p></div>
</header>

<h2>Demovideo (mit Lounge-Hintergrundmusik)</h2>
<div class="card">
  <video id="player" controls playsinline preload="metadata"></video>
  <a class="btn" id="dl_video" download="IT-WORLD-Compliance-Assistent-Demovideo.mp4">⬇ Demovideo herunterladen (MP4, ${mb(VIDEO)})</a>
  <p class="sub" style="margin-top:10px">1920 × 1080 · 29,6 Sekunden · Länge identisch mit der Musik</p>
</div>

<h2>Bilder für Fiverr (1280 × 769 px)</h2>
<div class="note" style="margin-bottom:16px">Empfehlung für die Galerie: Bild 1, 2 und 3 zusammen mit dem Video. Die übrigen Bilder eignen sich für Beschreibung, Portfolio oder Zusatzmaterial. Bitte die aktuellen Vorgaben im Fiverr-Gig-Editor prüfen.</div>
<div class="grid">
${images.map((f, i) => `  <div class="card"><img id="im${i}" alt="${esc(IMG_LABEL[f.replace('.png', '')] || f)}"><div class="cap">${esc(IMG_LABEL[f.replace('.png', '')] || f)}</div><a class="btn small" id="dl_img${i}" download="${f}">⬇ Herunterladen (PNG, ${mb(path.join(imgDir, f))})</a></div>`).join('\n')}
</div>

<footer>© 2026 IT-WORLD · Alle Rechte vorbehalten · Vervielfältigung und Weitergabe untersagt<br>Darstellung mit fiktiven Beispieldaten · Orientierungshilfe, keine Rechtsberatung</footer>
</div>
${assets.map((a) => `<script type="text/plain" id="${a.id}">${a.data}</script>`).join('\n')}
<script>
function blobUrl(id,type){var s=document.getElementById(id).textContent.trim();var bin=atob(s),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);return URL.createObjectURL(new Blob([u],{type:type}));}
var v=blobUrl('d_video','video/mp4');document.getElementById('player').src=v;document.getElementById('dl_video').href=v;
${images.map((f, i) => `var u${i}=blobUrl('d_img${i}','image/png');document.getElementById('im${i}').src=u${i};document.getElementById('dl_img${i}').href=u${i};`).join('\n')}
</script></body></html>`;
fs.writeFileSync(OUT, html);
console.log('Download-Seite:', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB');
