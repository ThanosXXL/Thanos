// Rendert die Instagram-Bilder (1080x1080) und das Story-/Reel-Cover (1080x1920) als PNG.
// Aufruf: NODE_PATH=$(npm root -g) node build-instagram.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { url, shot, orb, page } = require('./lib');
const OUT = path.resolve(__dirname, '../renderer/media/instagram');
fs.mkdirSync(OUT, { recursive: true });

const brand = `<div style="position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:18px">
  <img class="logo3d" src="${url('renderer/img/logo.svg')}" width="92" height="92" style="filter:drop-shadow(0 12px 14px rgba(0,0,0,.5))">
  <div><div style="font-size:34px;font-weight:700">Patienten Welt</div><div style="font-size:21px;color:#f2b632">Meine Gesundheit. Meine Welt.</div></div></div>`;
const disclaimer = '<div class="foot" style="bottom:0;padding:46px 0 18px;font-size:19px;font-weight:400;background:linear-gradient(transparent,rgba(6,19,48,.95) 55%);z-index:5">Demo mit frei erfundenen Beispieldaten · keine ärztliche Beratung</div>';

const feed = ({ h1, accent, sub, img, orbs }) => page(`
<div class="canvas" style="width:1080px;height:1080px">
  <div class="glow" style="width:520px;height:520px;background:#2f80ed;right:-120px;top:240px"></div>
  ${brand}
  <div style="position:absolute;left:64px;top:190px;width:900px">
    <div class="title" style="font-size:88px">${h1}<br><span class="accent">${accent}</span></div>
    <div class="sub" style="font-size:34px;margin-top:22px;max-width:720px">${sub}</div>
  </div>
  <div class="stage" style="position:absolute;left:170px;top:575px;width:1000px">
    <div class="device" style="transform:rotateY(-15deg) rotateX(7deg) rotateZ(-1.5deg);transform-origin:left center">
      <div class="bar"><i></i><i></i><i></i></div><img src="${shot(img)}"></div>
  </div>
  ${orbs}
  ${disclaimer}
</div>`);

const o2 = (a, b, c, d) => orb(a[0], a[1], 130, 'right:70px;top:150px') + orb(b[0], b[1], 100, 'right:60px;top:400px');
const posts = {
  'post-1-logo': page(`
<div class="canvas" style="width:1080px;height:1080px">
  <div class="glow" style="width:700px;height:700px;background:#2f80ed;left:190px;top:150px"></div>
  <div class="glow" style="width:360px;height:360px;background:#4cc9f0;right:40px;bottom:60px"></div>
  <img class="logo3d" src="${url('renderer/img/logo.svg')}" style="position:absolute;left:250px;top:90px;width:580px;height:580px">
  <div class="title" style="position:absolute;left:0;right:0;top:700px;text-align:center;font-size:104px">Patienten <span class="accent">Welt</span></div>
  <div class="sub" style="position:absolute;left:0;right:0;top:838px;text-align:center;font-size:42px">Meine Gesundheit. Meine Welt.</div>
  <div style="position:absolute;left:0;right:0;top:935px;text-align:center;display:flex;gap:18px;justify-content:center">
    <span class="pill" style="font-size:26px">Medikamente</span><span class="pill" style="font-size:26px">Werte</span><span class="pill cta" style="font-size:26px">Datenschutz</span></div>
  ${orb('red', 'heart', 150, 'left:90px;top:210px')}
  ${orb('green', 'check', 120, 'right:100px;top:150px')}
  ${orb('gold', 'bell', 100, 'left:130px;top:560px')}
  ${orb('blue', 'chart', 130, 'right:80px;top:520px')}
  <div class="foot" style="bottom:24px;font-size:19px;font-weight:400;opacity:.8">Demo mit frei erfundenen Beispieldaten</div>
</div>`),
  'post-2-start': feed({ h1: 'Ihr Tag.', accent: 'Auf einen Blick.', sub: 'Medikamente, Termine, Erinnerungen und Laborampel – übersichtlich auf der Startseite.', img: 'start', orbs: o2(['blue', 'chart'], ['green', 'check']) }),
  'post-3-medikamente': feed({ h1: 'Nie wieder', accent: 'vergessen.', sub: 'Einnahmeplan morgens bis nachts – einfach abhaken.', img: 'medikamente', orbs: o2(['gold', 'bell'], ['green', 'check']) }),
  'post-4-werte': feed({ h1: 'Blutdruck', accent: 'im Verlauf.', sub: 'Messwerte eintragen und als Diagramm verfolgen.', img: 'werte', orbs: o2(['red', 'heart'], ['blue', 'chart']) }),
  'post-5-labor': feed({ h1: 'Laborwerte', accent: 'mit Ampel.', sub: 'Referenzbereich und Verlauf als Linie oder Balken verstehen.', img: 'labor', orbs: o2(['gold', 'bell'], ['red', 'heart']) }),
  'post-6-erezept': feed({ h1: 'E-Rezepte', accent: 'mit QR-Code.', sub: 'Offene und eingelöste Rezepte im Blick (Demo-Simulation).', img: 'erezepte', orbs: o2(['blue', 'doc'], ['gold', 'bell']) }),
  'post-7-krankmeldung': feed({ h1: 'Krankmeldung', accent: 'digital & druckbar.', sub: 'Status für Krankenkasse und Arbeitgeber-Kopie (Demo).', img: 'au', orbs: o2(['gold', 'doc'], ['green', 'check']) }),
  'post-8-gesundheitskarte': feed({ h1: 'Ihre Karte.', accent: 'Immer dabei.', sub: 'Versichertendaten und Status übersichtlich (Beispielkarte).', img: 'karte', orbs: o2(['blue', 'doc'], ['green', 'check']) }),
  'post-9-datenschutz': feed({ h1: 'Verschlüsselt.', accent: 'Nur bei Ihnen.', sub: 'Passwortsperre, AES-256, lokale Speicherung, keine Übertragung.', img: 'datenschutz', orbs: o2(['green', 'check'], ['blue', 'doc']) }),
  'post-10-vorsorge': feed({ h1: 'Vorsorge &', accent: 'Impfpass.', sub: 'Fälligkeiten sehen und sich erinnern lassen.', img: 'vorsorge', orbs: o2(['gold', 'bell'], ['red', 'heart']) }),
  'story-cover': page(`
<div class="canvas" style="width:1080px;height:1920px">
  <div class="glow" style="width:800px;height:800px;background:#2f80ed;left:140px;top:120px"></div>
  <img class="logo3d" src="${url('renderer/img/logo.svg')}" style="position:absolute;left:290px;top:150px;width:500px;height:500px">
  <div class="title" style="position:absolute;left:0;right:0;top:690px;text-align:center;font-size:110px">Patienten <span class="accent">Welt</span></div>
  <div class="sub" style="position:absolute;left:0;right:0;top:830px;text-align:center;font-size:44px">Meine Gesundheit. Meine Welt.</div>
  <div style="position:absolute;left:0;right:0;top:930px;display:flex;flex-direction:column;align-items:center;gap:22px">
    <span class="pill" style="font-size:34px">✔ Medikamente &amp; Werte</span>
    <span class="pill" style="font-size:34px">✔ Labor, E-Rezept, Krankmeldung</span>
    <span class="pill" style="font-size:34px">✔ Verschlüsselt &amp; lokal</span></div>
  <div class="stage" style="position:absolute;left:150px;top:1330px;width:1300px">
    <div class="device" style="transform:rotateY(-22deg) rotateX(10deg) rotateZ(-2deg);transform-origin:left center"><div class="bar"><i></i><i></i><i></i></div><img src="${shot('start')}"></div></div>
  ${orb('red', 'heart', 150, 'left:70px;top:420px')}
  ${orb('green', 'check', 120, 'right:80px;top:380px')}
  ${orb('gold', 'bell', 110, 'left:90px;top:1180px')}
  <div class="foot" style="bottom:0;padding:70px 0 30px;font-size:24px;font-weight:400;background:linear-gradient(transparent,rgba(6,19,48,.96) 55%);z-index:5">Demo mit frei erfundenen Beispieldaten · keine ärztliche Beratung</div>
</div>`)
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  for (const [name, html] of Object.entries(posts)) {
    const tmp = path.join(__dirname, `.tmp-${name}.html`);
    fs.writeFileSync(tmp, html);
    const tall = name === 'story-cover';
    const p = await browser.newPage({ viewport: { width: 1080, height: tall ? 1920 : 1080 } });
    await p.goto('file://' + tmp);
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, name + '.png') });
    await p.close();
    fs.unlinkSync(tmp);
    console.log('ok', name);
  }
  await browser.close();
})();
