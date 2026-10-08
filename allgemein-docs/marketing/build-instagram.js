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
  <div><div style="font-size:34px;font-weight:700">Allgemein Docs</div><div style="font-size:21px;color:#4cc9f0">Praxis. Einfach. Digital.</div></div></div>`;

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
</div>`);

const posts = {
  'post-1-logo': page(`
<div class="canvas" style="width:1080px;height:1080px">
  <div class="glow" style="width:700px;height:700px;background:#2f80ed;left:190px;top:150px"></div>
  <div class="glow" style="width:360px;height:360px;background:#4cc9f0;right:40px;bottom:60px"></div>
  <img class="logo3d" src="${url('renderer/img/logo.svg')}" style="position:absolute;left:250px;top:90px;width:580px;height:580px">
  <div style="position:absolute;left:250px;top:740px;width:580px;height:70px;background:radial-gradient(ellipse at center,rgba(76,201,240,.55),transparent 70%);filter:blur(10px)"></div>
  <div class="title" style="position:absolute;left:0;right:0;top:700px;text-align:center;font-size:104px">Allgemein <span class="accent">Docs</span></div>
  <div class="sub" style="position:absolute;left:0;right:0;top:838px;text-align:center;font-size:42px">Die einfache Praxisverwaltung.</div>
  <div style="position:absolute;left:0;right:0;top:935px;text-align:center;display:flex;gap:18px;justify-content:center">
    <span class="pill" style="font-size:26px">Patientenakte</span><span class="pill" style="font-size:26px">Termine</span><span class="pill cta" style="font-size:26px">Dokumente</span></div>
  ${orb('red', 'heart', 150, 'left:90px;top:210px')}
  ${orb('green', 'check', 120, 'right:100px;top:150px')}
  ${orb('gold', 'bell', 100, 'left:130px;top:560px')}
  ${orb('blue', 'chart', 130, 'right:80px;top:520px')}
</div>`),
  'post-2-akte': feed({ h1: 'Die ganze Akte.', accent: 'Ein Klick.', sub: 'Diagnosen, Medikation, Karteikarte und Bilder – übersichtlich an einem Ort.', img: 'patient', orbs: orb('red', 'heart', 130, 'right:70px;top:150px') + orb('blue', 'doc', 100, 'right:60px;top:400px') }),
  'post-3-wartezimmer': feed({ h1: 'Wartezeit', accent: 'im Blick.', sub: 'Wer ist da, wer wartet am längsten – Patienten mit einem Klick aufrufen.', img: 'wartezimmer', orbs: orb('gold', 'clock', 130, 'right:70px;top:150px') + orb('green', 'check', 100, 'right:60px;top:400px') }),
  'post-4-dokumente': feed({ h1: 'Rezept in', accent: '10 Sekunden.', sub: 'AU, Überweisung, Attest: Daten werden automatisch eingesetzt.', img: 'dokument', orbs: orb('blue', 'doc', 130, 'right:70px;top:150px') + orb('green', 'check', 100, 'right:60px;top:400px') }),
  'post-5-vorsorge': feed({ h1: 'Nie wieder', accent: 'Vorsorge vergessen.', sub: 'Recall-Liste und Impfstatus zeigen sofort, wer fällig ist.', img: 'vorsorge', orbs: orb('gold', 'bell', 130, 'right:70px;top:150px') + orb('red', 'heart', 100, 'right:60px;top:400px') }),
  'post-6-karte': feed({ h1: 'Karte rein.', accent: 'Patient da.', sub: 'Versichertenkarte einlesen – Akte öffnen oder in Sekunden neu anlegen.', img: 'karte', orbs: orb('blue', 'doc', 130, 'right:70px;top:150px') + orb('green', 'check', 100, 'right:60px;top:400px') }),
  'post-9-erezept': feed({ h1: 'E-Rezept', accent: 'auf der Karte.', sub: 'Karte einlesen, Medikament wählen, ausstellen – in der Apotheke abrufbar.', img: 'erezept', orbs: orb('red', 'heart', 130, 'right:70px;top:150px') + orb('blue', 'doc', 100, 'right:60px;top:400px') }),
  'post-7-labor': feed({ h1: 'Laborwerte', accent: 'mit Ampel.', sub: 'Auffälliges sofort sehen, Verläufe vergleichen, in die Akte übernehmen.', img: 'labor', orbs: orb('red', 'heart', 130, 'right:70px;top:150px') + orb('gold', 'bell', 100, 'right:60px;top:400px') }),
  'post-8-krankmeldung': feed({ h1: 'Gelber Schein', accent: 'in Sekunden.', sub: 'Krankmeldung mit Diagnose aus der Akte – drucken und fertig.', img: 'au', orbs: orb('gold', 'doc', 130, 'right:70px;top:150px') + orb('green', 'check', 100, 'right:60px;top:400px') }),
  'post-10-au-digital': feed({ h1: 'Krankmeldung', accent: 'digital an KV & AG.', sub: 'Krankenkasse und Arbeitgeber digital informieren – in der Demo simuliert.', img: 'au', orbs: orb('gold', 'doc', 130, 'right:70px;top:150px') + orb('green', 'check', 100, 'right:60px;top:400px') }),
  'post-11-erezept-menue': feed({ h1: 'Medikamente', accent: 'als E-Rezept.', sub: 'Mehrere auswählen, ein Klick, alle Token fertig.', img: 'erezept-batch', orbs: orb('red', 'heart', 130, 'right:70px;top:150px') + orb('blue', 'doc', 100, 'right:60px;top:400px') }),
  'story-cover': page(`
<div class="canvas" style="width:1080px;height:1920px">
  <div class="glow" style="width:800px;height:800px;background:#2f80ed;left:140px;top:120px"></div>
  <img class="logo3d" src="${url('renderer/img/logo.svg')}" style="position:absolute;left:290px;top:150px;width:500px;height:500px">
  <div class="title" style="position:absolute;left:0;right:0;top:690px;text-align:center;font-size:110px">Allgemein <span class="accent">Docs</span></div>
  <div class="sub" style="position:absolute;left:0;right:0;top:830px;text-align:center;font-size:44px">Praxisverwaltung, die Spaß macht.</div>
  <div style="position:absolute;left:0;right:0;top:930px;display:flex;flex-direction:column;align-items:center;gap:22px">
    <span class="pill" style="font-size:34px">✔ Patientenakte &amp; Karteikarte</span>
    <span class="pill" style="font-size:34px">✔ Termine &amp; Wartezimmer</span>
    <span class="pill" style="font-size:34px">✔ Vorsorge, Impfungen, Dokumente</span></div>
  <div class="stage" style="position:absolute;left:150px;top:1330px;width:1300px">
    <div class="device" style="transform:rotateY(-22deg) rotateX(10deg) rotateZ(-2deg);transform-origin:left center"><div class="bar"><i></i><i></i><i></i></div><img src="${shot('start')}"></div></div>
  ${orb('red', 'heart', 150, 'left:70px;top:420px')}
  ${orb('green', 'check', 120, 'right:80px;top:380px')}
  ${orb('gold', 'bell', 110, 'left:90px;top:1180px')}
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
