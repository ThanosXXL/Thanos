// Social-Media-Reel (1080x1920, 36 s, 30 fps) mit Animationen und Hintergrundmusik in exakt gleicher Länge.
// Aufruf: NODE_PATH=$(npm root -g) node build-reel.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { url, shot, orb, page, captureFrames, encode } = require('./lib');

const FPS = 30;
const SCENES = [
  { len: 3000, type: 'intro' },
  { len: 3000, h1: 'Karte rein.', accent: 'Patient da.', sub: 'Versichertenkarte einlesen.', img: 'karte', pills: ['Einlesen', 'Akte öffnen', 'Neu anlegen'], orb: ['blue', 'doc'] },
  { len: 3000, h1: 'Über 300', accent: 'Wirkstoffe.', sub: 'Suchen, Stärke wählen, verordnen.', img: 'katalog', pills: ['Handelsname', 'ATC-Code', 'Import'], orb: ['gold', 'bell'] },
  { len: 3000, h1: 'Medikamente', accent: 'als E-Rezept.', sub: 'Mehrere auf einmal verordnen.', img: 'erezept-batch', pills: ['Auswahl', 'QR-Token'], orb: ['blue', 'doc'] },
  { len: 3000, h1: 'Die ganze Akte.', accent: 'Ein Klick.', sub: 'Diagnosen, Medikation, Karteikarte.', img: 'patient', pills: ['Diagnosen', 'Medikation', 'Karteikarte'], orb: ['red', 'heart'] },
  { len: 3000, h1: 'Laborwerte', accent: 'mit Ampel.', sub: 'Auffälliges sofort sehen.', img: 'labor', pills: ['Verlauf', 'Referenz', 'Karteikarte'], orb: ['gold', 'bell'] },
  { len: 3000, h1: 'Krankmeldung', accent: 'digital senden.', sub: 'An Krankenkasse und Arbeitgeber.', img: 'au', pills: ['KV', 'AG', 'Gelber Schein'], orb: ['gold', 'doc'] },
  { len: 3000, h1: 'E-Rezept', accent: 'auf der Karte.', sub: 'Direkt nach dem Einlesen ausstellen.', img: 'erezept', pills: ['E-Rezept', 'Token', 'Apotheke'], orb: ['red', 'heart'] },
  { len: 3000, h1: 'Vorsorge', accent: 'im Blick.', sub: 'Recall-Liste und Impfstatus.', img: 'vorsorge', pills: ['Recall', 'Impfungen'], orb: ['green', 'check'] },
  { len: 3000, h1: 'Verschlüsselt.', accent: 'Von Anfang an.', sub: 'AES-256, Rollen, kein Internet.', img: 'datenschutz', pills: ['AES-256', 'Rollen', 'Check'], orb: ['blue', 'lock'] },
  { len: 3000, h1: 'Strg+L.', accent: 'Gesperrt.', sub: 'Mit manipulationssicherem Protokoll.', img: 'protokoll', pills: ['Auto-Sperre', 'Protokoll', 'Rollen'], orb: ['green', 'shield'] },
  { len: 3000, type: 'outro' }
];
const DURATION = SCENES.reduce((t, s) => t + s.len, 0) / 1000;

let css = '';
const anim = (name, delay, dur, ease = 'cubic-bezier(.2,.9,.25,1)') => `animation:${name} ${dur}ms ${ease} ${delay}ms both`;
let start = 0;
const scenesHtml = SCENES.map((s, i) => {
  const t0 = start; start += s.len;
  const fadeIn = 350, fadeOut = 350;
  css += `@keyframes sc${i}{0%{opacity:0}${((fadeIn / s.len) * 100).toFixed(2)}%{opacity:1}${(((s.len - fadeOut) / s.len) * 100).toFixed(2)}%{opacity:1;transform:none}100%{opacity:0;transform:scale(1.06)}}`;
  const wrapStyle = `position:absolute;inset:0;opacity:0;animation:sc${i} ${s.len}ms linear ${t0}ms both`;
  let inner;
  if (s.type === 'intro') {
    inner = `
      <img class="logo3d" src="${url('renderer/img/logo.svg')}" style="position:absolute;left:240px;top:380px;width:600px;height:600px;${anim('logoIn', t0, 1100, 'cubic-bezier(.2,1.3,.3,1)')}">
      <div style="position:absolute;left:240px;top:380px;width:600px;height:600px;clip-path:circle(50%);overflow:hidden"><div class="sweep" style="${anim('sweep', t0 + 1100, 900, 'ease-in-out')}"></div></div>
      <div class="title" style="position:absolute;left:0;right:0;top:1060px;text-align:center;font-size:118px;${anim('up', t0 + 900, 800)}">Allgemein <span class="accent">Docs</span></div>
      <div class="sub" style="position:absolute;left:0;right:0;top:1220px;text-align:center;font-size:48px;${anim('up', t0 + 1300, 800)}">Praxisverwaltung, die Spaß macht.</div>
      ${orb('red', 'heart', 150, `left:90px;top:520px;${anim('pop', t0 + 1500, 700, 'cubic-bezier(.2,1.6,.3,1)')}`)}
      ${orb('green', 'check', 120, `right:100px;top:440px;${anim('pop', t0 + 1700, 700, 'cubic-bezier(.2,1.6,.3,1)')}`)}
      ${orb('gold', 'bell', 110, `left:140px;top:820px;${anim('pop', t0 + 1900, 700, 'cubic-bezier(.2,1.6,.3,1)')}`)}
      ${orb('blue', 'chart', 130, `right:90px;top:780px;${anim('pop', t0 + 2100, 700, 'cubic-bezier(.2,1.6,.3,1)')}`)}`;
  } else if (s.type === 'outro') {
    inner = `
      <img class="logo3d" src="${url('renderer/img/logo.svg')}" style="position:absolute;left:290px;top:420px;width:500px;height:500px;${anim('logoIn', t0 + 100, 1000, 'cubic-bezier(.2,1.3,.3,1)')}">
      <div class="title" style="position:absolute;left:0;right:0;top:1000px;text-align:center;font-size:104px;${anim('up', t0 + 700, 800)}">Jetzt <span class="accent">entdecken</span></div>
      <div style="position:absolute;left:0;right:0;top:1170px;text-align:center;${anim('up', t0 + 1100, 800)}"><span class="pill cta" style="font-size:52px;padding:26px 64px">Allgemein Docs</span></div>
      <div class="sub" style="position:absolute;left:0;right:0;top:1360px;text-align:center;font-size:42px;${anim('up', t0 + 1400, 800)}">Praxis. Einfach. Digital.</div>
      ${orb('red', 'heart', 140, `left:100px;top:560px;${anim('pop', t0 + 900, 700, 'cubic-bezier(.2,1.6,.3,1)')}`)}
      ${orb('blue', 'doc', 120, `right:110px;top:520px;${anim('pop', t0 + 1100, 700, 'cubic-bezier(.2,1.6,.3,1)')}`)}`;
  } else {
    css += `@keyframes dev${i}{0%{opacity:0;transform:translateY(900px) rotateX(35deg) rotateY(-40deg) scale(.8)}100%{opacity:1;transform:translateY(0) rotateX(7deg) rotateY(-15deg) rotateZ(-1.5deg) scale(1)}}
            @keyframes drift${i}{from{transform:translate(0,0)}to{transform:translate(-30px,-40px)}}`;
    inner = `
      <div class="title" style="position:absolute;left:70px;top:150px;font-size:118px;${anim('up', t0 + 150, 800)}">${s.h1}<br><span class="accent">${s.accent}</span></div>
      <div class="sub" style="position:absolute;left:70px;top:470px;font-size:44px;${anim('up', t0 + 450, 800)}">${s.sub}</div>
      <div style="position:absolute;left:70px;top:590px;display:flex;gap:16px;flex-wrap:wrap;width:780px">${s.pills.map((p, k) => `<span class="pill ${k === 0 ? 'cta' : ''}" style="font-size:32px;${anim('pop', t0 + 900 + k * 180, 600, 'cubic-bezier(.2,1.6,.3,1)')}">${p}</span>`).join('')}</div>
      <div style="position:absolute;left:150px;top:830px;width:1200px;animation:drift${i} ${s.len}ms linear ${t0}ms both"><div class="stage"><div class="device" style="transform-origin:left center;${anim('dev' + i, t0 + 300, 1200, 'cubic-bezier(.2,.9,.25,1.05)')}"><div class="bar"><i></i><i></i><i></i></div><img src="${shot(s.img)}"></div></div></div>
      ${orb(s.orb[0], s.orb[1], 170, `right:80px;top:560px;${anim('pop', t0 + 700, 800, 'cubic-bezier(.2,1.6,.3,1)')}`)}`;
  }
  return `<div style="${wrapStyle}">${inner}</div>`;
}).join('');

css += `
@keyframes up{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
@keyframes logoIn{from{opacity:0;transform:scale(.25) rotateY(160deg) translateY(200px)}to{opacity:1;transform:none}}
@keyframes sweep{from{transform:translateX(-700px)}to{transform:translateX(700px)}}
@keyframes bgmove{from{transform:translate(0,0) scale(1)}to{transform:translate(80px,-120px) scale(1.2)}}
.orb{animation-fill-mode:both}
`;
const bg = `<div class="glow" style="width:900px;height:900px;background:#2f80ed;left:-200px;top:200px;animation:bgmove ${DURATION * 1000}ms ease-in-out 0ms both"></div>
<div class="glow" style="width:700px;height:700px;background:#4cc9f0;right:-250px;bottom:100px;animation:bgmove ${DURATION * 1000}ms ease-in-out 0ms both reverse"></div>`;
const html = page(`<div class="canvas" style="width:1080px;height:1920px">${bg}${scenesHtml}</div>`, css);

(async () => {
  const htmlFile = path.join(__dirname, '.tmp-reel.html');
  fs.writeFileSync(htmlFile, html);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const dir = path.join(require('os').tmpdir(), 'reel-frames');
  const n = await captureFrames(browser, htmlFile, { width: 1080, height: 1920, fps: FPS, duration: DURATION, dir });
  await browser.close();
  fs.unlinkSync(htmlFile);
  const out = path.resolve(__dirname, '../renderer/media/allgemein-docs-reel.mp4');
  encode({ video: path.join(dir, '%05d.jpg'), duration: DURATION, out, fps: FPS });
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Reel fertig:', out, n, 'Frames');
})();
