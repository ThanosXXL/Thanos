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
// Standbild des Videos (aus dem Video selbst) als Vorschaubild des Players
const { execFileSync } = require('child_process');
const POSTER = execFileSync('ffmpeg', ['-v', 'error', '-ss', '2.6', '-i', VIDEO, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1'], { maxBuffer: 20 * 1024 * 1024 }).toString('base64');
const DURATION = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', VIDEO]).toString());
const FILENAME = 'IT-WORLD-Compliance-Assistent-Demovideo.mp4';

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
.top{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:rgba(5,4,3,.92);backdrop-filter:blur(6px);border-bottom:1px solid rgba(224,180,74,.35)}
.top .name{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--g1);min-width:0}
.top .name img{width:36px;height:36px;border-radius:8px;border:1px solid rgba(240,200,100,.6);background:#000;flex:none}
.top .name span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.top .btn{margin:0;padding:10px 18px;font-size:16px;white-space:nowrap;flex:none}
@media (max-width:520px){.top .btn{padding:9px 14px;font-size:15px}.top .name span{font-size:14px}}

/* Video-Viewer im Stil der Datei-Vorschau: helle Kopfleiste, schwarze Bühne, weißer Play-Kreis, Zeitleiste */
#viewer{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;background:#000;font-family:'Inter','Segoe UI',system-ui,Arial,sans-serif}
#viewer::before{content:'';position:absolute;left:0;right:0;top:0;height:46px;background:#a8a8a6;border-radius:0 0 0 0}
#viewer.hidden{display:none}
.sheet{position:relative;margin-top:26px;background:#f9f8f5;color:#14130f;border-radius:30px 30px 0 0;padding:14px 16px 16px;flex:none}
.sheet .row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.icon-btn{width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:#14130f;cursor:pointer;display:flex;align-items:center;justify-content:center}
.icon-btn:hover{background:rgba(0,0,0,.06)}
.dl-top{display:inline-flex;align-items:center;gap:10px;padding:11px 18px;border-radius:14px;background:#e7e5e0;color:#14130f;text-decoration:none;font-size:17px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,.18);cursor:pointer}
.dl-top:hover{background:#dedbd5}.dl-top:active{transform:translateY(1px)}
.vtitle{margin:6px 6px 0;text-align:center;font-size:clamp(18px,5vw,26px);font-weight:700;line-height:1.25;word-break:break-word}
.stage{position:relative;flex:1;min-height:0;background:#000;display:flex;align-items:center;justify-content:center}
.stage video{width:100%;height:100%;object-fit:contain;background:#000;border:0;border-radius:0;display:block}
.play{position:absolute;left:50%;top:50%;width:104px;height:104px;margin:-52px 0 0 -52px;border:0;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 28px rgba(0,0,0,.5);transition:opacity .2s,transform .1s}
.play:active{transform:scale(.95)}
.play.off{opacity:0;pointer-events:none}
.vmsg{position:absolute;left:16px;right:16px;bottom:14px;text-align:center;color:#ffd9a0;font-size:15px;display:none}
.ctrl{flex:none;background:#000;color:#fff;padding:10px 22px 22px}
.ctrl input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:36px;background:transparent;margin:0;cursor:pointer;touch-action:none}
.ctrl input[type=range]::-webkit-slider-runnable-track{height:20px;border-radius:12px;background:linear-gradient(90deg,#fff var(--p,0%),#555 var(--p,0%))}
.ctrl input[type=range]::-moz-range-track{height:20px;border-radius:12px;background:#555}
.ctrl input[type=range]::-moz-range-progress{height:20px;border-radius:12px;background:#fff}
.ctrl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:8px;height:44px;margin-top:-12px;border-radius:4px;background:#fff}
.ctrl input[type=range]::-moz-range-thumb{width:8px;height:44px;border:0;border-radius:4px;background:#fff}
.times{display:flex;justify-content:space-between;font-size:clamp(22px,6vw,34px);margin-top:2px;font-variant-numeric:tabular-nums}
.bar-gold{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:rgba(5,4,3,.92);backdrop-filter:blur(6px);border-bottom:1px solid rgba(224,180,74,.35)}
.bar-gold .name{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--g1);min-width:0}
.bar-gold .name img{width:36px;height:36px;border-radius:8px;border:1px solid rgba(240,200,100,.6);background:#000;flex:none}
.bar-gold .name span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
footer{margin-top:40px;text-align:center;font-size:13px;color:var(--muted)}
</style></head><body>
<div id="viewer">
  <div class="sheet">
    <div class="row">
      <button class="icon-btn" id="vclose" aria-label="Schließen"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
      <a class="dl-top" id="dl_video_top" download="${FILENAME}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>Herunterladen</a>
    </div>
    <div class="vtitle">${FILENAME}</div>
  </div>
  <div class="stage">
    <video id="player" playsinline preload="metadata" poster="data:image/jpeg;base64,${POSTER}"></video>
    <button class="play" id="vplay" aria-label="Abspielen"><svg width="44" height="44" viewBox="0 0 24 24" fill="#111"><path d="M8 5v14l11-7z"/></svg></button>
    <div class="vmsg" id="vmsg">Dieses Gerät kann das Video hier nicht abspielen. Bitte oben auf „Herunterladen“ tippen.</div>
  </div>
  <div class="ctrl"><input type="range" id="seek" min="0" max="1000" value="0" aria-label="Zeitleiste"><div class="times"><span id="tcur">00:00</span><span id="tdur">${String(Math.floor(DURATION / 60)).padStart(2, '0')}:${String(Math.floor(DURATION % 60)).padStart(2, '0')}</span></div></div>
</div>
<div class="bar-gold"><div class="name"><img alt="" src="data:image/png;base64,${logo}"><span>IT-WORLD · IT Solutions</span></div>
<button class="btn" id="vopen" type="button" style="margin:0;padding:10px 18px;font-size:16px;white-space:nowrap">▶ Video ansehen</button></div>
<div class="wrap">
<header>
  <div><div class="tile"><img alt="IT-WORLD – IT Solutions" src="data:image/png;base64,${logo}"></div><div class="tag">IT Solutions</div></div>
  <div><h1>Fiverr-Downloadcenter</h1><p>IT-WORLD Compliance-Assistent · Demovideo und Galeriebilder</p></div>
</header>

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
var v=blobUrl('d_video','video/mp4');var pl=document.getElementById('player');pl.src=v;document.getElementById('dl_video_top').href=v;
var $=function(i){return document.getElementById(i)},fmt=function(t){t=Math.max(0,t||0);return ('0'+Math.floor(t/60)).slice(-2)+':'+('0'+Math.floor(t%60)).slice(-2)};
var seek=$('seek'),playBtn=$('vplay'),viewer=$('viewer'),dragging=false;
function paint(){var d=pl.duration||0,p=d?pl.currentTime/d*1000:0;if(!dragging)seek.value=p;seek.style.setProperty('--p',(p/10)+'%');$('tcur').textContent=fmt(pl.currentTime)}
function toggle(){if(pl.paused){var r=pl.play();if(r&&r.catch)r.catch(function(){$('vmsg').style.display='block'})}else pl.pause()}
playBtn.onclick=toggle;pl.onclick=toggle;
pl.onplay=function(){playBtn.classList.add('off')};pl.onpause=function(){playBtn.classList.remove('off')};pl.onended=function(){playBtn.classList.remove('off')};
pl.ontimeupdate=paint;pl.onloadedmetadata=function(){$('tdur').textContent=fmt(pl.duration);paint()};
pl.onerror=function(){$('vmsg').style.display='block'};
seek.oninput=function(){dragging=true;if(pl.duration)pl.currentTime=seek.value/1000*pl.duration;seek.style.setProperty('--p',(seek.value/10)+'%');$('tcur').textContent=fmt(pl.currentTime)};
seek.onchange=function(){dragging=false};
$('vclose').onclick=function(){pl.pause();viewer.classList.add('hidden')};
$('vopen').onclick=function(){viewer.classList.remove('hidden')};
document.addEventListener('keydown',function(e){if(viewer.classList.contains('hidden'))return;if(e.key==='Escape')$('vclose').click();else if(e.key===' '){e.preventDefault();toggle()}});
${images.map((f, i) => `var u${i}=blobUrl('d_img${i}','image/png');document.getElementById('im${i}').src=u${i};document.getElementById('dl_img${i}').href=u${i};`).join('\n')}
</script></body></html>`;
fs.writeFileSync(OUT, html);
console.log('Download-Seite:', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB');
