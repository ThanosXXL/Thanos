// Baut web/My-Route-Demo.html: Demovideo-Seite mit Optik-Auswahl (3D Gold / Hell) und Download-Button.
// Die Videos liegen als MP4 neben der Seite (web/demo/). Aufruf: node scripts/build-demo.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p));
const font = (f) => 'data:font/ttf;base64,' + read('renderer/assets/fonts/' + f).toString('base64');
const logo = 'data:image/webp;base64,' + read('renderer/assets/logo.webp').toString('base64');
const css = read('renderer/style.css').toString('utf-8')
  .replace('url(assets/fonts/OpenSans-Regular.ttf)', `url(${font('OpenSans-Regular.ttf')})`)
  .replace('url(assets/fonts/OpenSans-Bold.ttf)', `url(${font('OpenSans-Bold.ttf')})`);
const videos = JSON.stringify({
  voll: {
    gold3d: { src: 'demo/My-Route-Demo-3D-Gold.mp4', poster: 'demo/poster-3d-gold.jpg', file: 'My-Route-Demo-3D-Gold.mp4' },
    hell: { src: 'demo/My-Route-Demo-Hell.mp4', poster: 'demo/poster-hell.jpg', file: 'My-Route-Demo-Hell.mp4' }
  },
  kurz: {
    gold3d: { src: 'demo/My-Route-Demo-Kurz-3D-Gold.mp4', poster: 'demo/poster-kurz-3d-gold.jpg', file: 'My-Route-Demo-Kurz-3D-Gold.mp4' },
    hell: { src: 'demo/My-Route-Demo-Kurz-Hell.mp4', poster: 'demo/poster-kurz-hell.jpg', file: 'My-Route-Demo-Kurz-Hell.mp4' }
  }
});
const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Route – Demovideo</title>
<style>
${css}
.demo-wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:32px 16px 70px;text-align:center}
.demo-wrap .brand-row{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:6px}
.demo-wrap .brand-row img{width:84px;height:84px;border-radius:20px;box-shadow:0 0 0 1px var(--line),0 10px 30px rgba(233,181,44,.3)}
.demo-wrap h1{margin:0;font-size:clamp(34px,6vw,60px)}
.optik{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:22px 0 18px}
.optik .btn{min-width:150px}
.optik .btn.active{outline:3px solid var(--gold-hi);outline-offset:3px}
.player{border-radius:20px;overflow:hidden;background:#000;box-shadow:0 0 0 1px var(--line),0 30px 70px rgba(0,0,0,.7),0 0 70px rgba(233,181,44,.2)}
.player video{width:100%;display:block;aspect-ratio:16/9;background:#000}
.dl-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:22px}
.dl-note{color:var(--muted);margin:14px 0 0;font-size:14px}
a.btn{text-decoration:none;display:inline-block}
</style></head>
<body><div class="bg-glow" aria-hidden="true"></div>
<main class="demo-wrap">
  <div class="brand-row"><img src="${logo}" alt="IT-WORLD Logo"><div><h1 class="gold3d">MY ROUTE</h1><div class="brand-sub" style="font-size:12px;letter-spacing:.4em;color:var(--muted)">IT SOLUTIONS</div></div></div>
  <p class="section-sub">Das Demovideo – deine Lieblingswege, sicher aufgehoben. Wähle Länge und Optik:</p>
  <div class="optik" id="laenge"></div>
  <div class="optik" id="optik"></div>
  <div class="player"><video id="vid" controls playsinline preload="metadata"></video></div>
  <div class="dl-row"><a class="btn go" id="dl" download>Video herunterladen (MP4, Full HD)</a></div>
  <p class="dl-note">Die Live-Werte im Video sind Beispielwerte für die Demo. In der App kommen sie live vom Routing-Dienst.</p>
</main>
<script>
(function () {
  var V = ${videos};
  var LEN = { voll: 'Vollversion', kurz: 'Kurzfassung' }, LOOK = { gold3d: '3D Gold', hell: 'Hell' };
  var vid = document.getElementById('vid'), dl = document.getElementById('dl');
  var state = { len: 'voll', look: 'gold3d' };
  try { var s = JSON.parse(localStorage.getItem('my-route-demo') || '{}'); if (V[s.len]) state.len = s.len; if (V[state.len][s.look]) state.look = s.look; } catch (e) {}
  function row(id, map, key) {
    var box = document.getElementById(id);
    Object.keys(map).forEach(function (k) {
      var b = document.createElement('button'); b.className = 'btn'; b.dataset.key = k; b.textContent = (key === 'len' ? '' : 'Optik: ') + map[k];
      b.addEventListener('click', function () { state[key] = k; apply(); }); box.appendChild(b);
    });
  }
  function apply() {
    var v = V[state.len][state.look];
    var t = vid.currentTime || 0, playing = !vid.paused;
    vid.src = v.src; vid.poster = v.poster; dl.href = v.src; dl.setAttribute('download', v.file);
    dl.textContent = 'Video herunterladen – ' + LEN[state.len] + ', Optik ' + LOOK[state.look];
    ['laenge', 'optik'].forEach(function (id) {
      var key = id === 'laenge' ? 'len' : 'look';
      Array.prototype.forEach.call(document.getElementById(id).children, function (b) { b.classList.toggle('active', b.dataset.key === state[key]); b.classList.toggle('ghost', b.dataset.key !== state[key]); });
    });
    if (t > 0 && state.len === (apply.last || state.len)) vid.addEventListener('loadedmetadata', function once() { vid.currentTime = t; if (playing) vid.play(); vid.removeEventListener('loadedmetadata', once); });
    apply.last = state.len;
    document.documentElement.dataset.look = state.look === 'hell' ? 'hell' : 'gold3d';
    try { localStorage.setItem('my-route-demo', JSON.stringify(state)); } catch (e) {}
  }
  row('laenge', LEN, 'len'); row('optik', LOOK, 'look');
  apply();
})();
</script></body></html>`;
fs.mkdirSync(path.join(root, 'web', 'demo'), { recursive: true });
fs.writeFileSync(path.join(root, 'web', 'My-Route-Demo.html'), html);
console.log('web/My-Route-Demo.html geschrieben');
