/*
 * Erzeugt ein echtes Demo-Video von "IT Schulungsmaßnahmen" OHNE ffmpeg: Chromium nimmt
 * eine animierte Canvas-Sequenz über die MediaRecorder-API (eingebauter VP9-Encoder) auf
 * und lädt das Ergebnis als .webm herunter. Kein Ton (siehe README/Projektverlauf – keine
 * Musikdatei verfügbar).
 *
 * Start: node scripts/build-demo-video.js
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'downloads');
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT_FILE = 'IT-Schulungsmassnahmen-Demo.webm';
const OUT_PATH = path.join(OUT_DIR, OUT_FILE);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ---------- Szenen als 3D-Mockups (gleiche Optik wie build-materials.js) ----------
const imgDashboard = `
<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="d-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient></defs>
  <rect x="0" y="0" width="640" height="380" rx="14" fill="#ffffff" stroke="#e7dcc3"/>
  <rect x="0" y="0" width="640" height="50" rx="14" fill="url(#d-red)"/>
  <text x="20" y="32" fill="#fff" font-family="Segoe UI, Arial" font-size="19" font-weight="700">IT Schulungsmaßnahmen</text>
  <g font-family="Segoe UI, Arial" font-size="12" fill="#fff">
    <rect x="16" y="102" width="192" height="250" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
    <rect x="16" y="102" width="192" height="28" rx="10" fill="#14367a"/><text x="26" y="121">Liste 1 – To-Do</text>
    <rect x="224" y="102" width="192" height="250" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
    <rect x="224" y="102" width="192" height="28" rx="10" fill="#5b9bd5"/><text x="234" y="121">Liste 2 – Offen</text>
    <rect x="432" y="102" width="192" height="250" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
    <rect x="432" y="102" width="192" height="28" rx="10" fill="#0b1f4d"/><text x="442" y="121">Liste 3 – Erledigt</text>
  </g>
  <g fill="#111" font-family="Segoe UI, Arial" font-size="12">
    <text x="26" y="152">☑ Folien vorbereiten</text><text x="26" y="176">☐ Quiz einsammeln</text>
    <text x="234" y="152">• Abschlussprojekt</text>
    <text x="442" y="152">✓ Grundlagen-Modul</text>
  </g>
</svg>`;

const imgLesson = `
<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="l-blue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b1f4d"/><stop offset="1" stop-color="#5b9bd5"/></linearGradient></defs>
  <rect x="0" y="0" width="640" height="380" rx="14" fill="#ffffff" stroke="#e7dcc3"/>
  <rect x="0" y="0" width="640" height="44" rx="14" fill="url(#l-blue)"/>
  <text x="18" y="29" fill="#fff" font-family="Segoe UI, Arial" font-size="16" font-weight="700">Video-Live-Chat – Unterricht</text>
  <g>
    <rect x="18" y="58" width="88" height="64" rx="9" fill="#0b1f4d"/><text x="24" y="134" fill="#111" font-family="Segoe UI,Arial" font-size="11">Dozent</text>
    <rect x="116" y="58" width="88" height="64" rx="9" fill="#14367a"/><text x="134" y="134" fill="#111" font-family="Segoe UI,Arial" font-size="11">Ich</text>
    <rect x="214" y="58" width="88" height="64" rx="9" fill="#3a5a99"/><text x="228" y="134" fill="#111" font-family="Segoe UI,Arial" font-size="11">Max</text>
  </g>
  <rect x="18" y="152" width="380" height="200" rx="12" fill="#0b1f4d"/>
  <rect x="410" y="152" width="212" height="200" rx="12" fill="#ffffff" stroke="#dceaf7"/>
  <rect x="410" y="152" width="212" height="28" rx="12" fill="#14367a"/><text x="420" y="171" fill="#fff" font-family="Segoe UI,Arial" font-size="12">Unterrichts-Chat</text>
  <g fill="#111" font-family="Segoe UI,Arial" font-size="11">
    <text x="420" y="200">Max: Frage zu Aufgabe 3?</text>
    <text x="420" y="224">⏸ Pause – Ich (10:15)</text>
    <text x="420" y="248">📊 PowerPoint geteilt</text>
  </g>
</svg>`;

const imgFolders = `
<svg viewBox="0 0 640 340" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="f-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient></defs>
  <rect x="0" y="0" width="640" height="340" rx="14" fill="#ffffff" stroke="#e7dcc3"/>
  <rect x="18" y="18" width="290" height="304" rx="12" fill="#ffffff" stroke="#dceaf7"/>
  <rect x="18" y="18" width="290" height="30" rx="12" fill="url(#f-red)"/>
  <text x="28" y="38" fill="#fff" font-family="Segoe UI,Arial" font-size="13">📁 Hausaufgaben</text>
  <rect x="332" y="18" width="290" height="304" rx="12" fill="#ffffff" stroke="#dceaf7"/>
  <rect x="332" y="18" width="290" height="30" rx="12" fill="url(#f-red)"/>
  <text x="342" y="38" fill="#fff" font-family="Segoe UI,Arial" font-size="13">📁 Kalender – Prüfungen</text>
  <g font-family="Segoe UI,Arial" font-size="11" fill="#111">
    <rect x="28" y="62" width="270" height="58" rx="8" fill="#f7faff" stroke="#0b1f4d"/>
    <text x="36" y="82" font-weight="700">Max Mustermann</text><text x="36" y="102">Aufgabe 2 – Korrigiert &amp; zurück</text>
    <rect x="342" y="62" width="270" height="36" rx="8" fill="#f2ead9"/>
    <text x="352" y="84" fill="#8c3b3b" font-weight="700">Fr., 25.07.2026, 10:00</text>
  </g>
</svg>`;

function titleCard(title, subtitle) {
  return `
  <svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="t-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient></defs>
    <rect x="0" y="0" width="640" height="380" rx="14" fill="url(#t-red)"/>
    <text x="320" y="185" fill="#fff" font-family="Segoe UI, Arial" font-size="34" font-weight="700" text-anchor="middle">${title}</text>
    <text x="320" y="225" fill="#f3e2e2" font-family="Segoe UI, Arial" font-size="17" text-anchor="middle">${subtitle}</text>
  </svg>`;
}

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Demo-Video</title>
<style>html,body{margin:0;background:#f2ead9;}</style>
</head>
<body>
<canvas id="c" width="1280" height="720"></canvas>
<script>
const scenes = [
  { svg: ${JSON.stringify(titleCard('IT Schulungsmaßnahmen', 'Demo-Übersicht'))}, hold: 2.2 },
  { svg: ${JSON.stringify(imgDashboard)}, hold: 3.0, caption: 'Dashboard: Listen, Chat & Werkzeugleiste' },
  { svg: ${JSON.stringify(imgLesson)}, hold: 3.2, caption: 'Echter Mehrgeräte-Video-Chat' },
  { svg: ${JSON.stringify(imgFolders)}, hold: 3.0, caption: 'Hausaufgaben & Kalender' },
  { svg: ${JSON.stringify(titleCard('Windows · Mac · Linux', 'Android · iOS · Browser'))}, hold: 2.2 },
  { svg: ${JSON.stringify(titleCard('Danke!', '© ${new Date().getFullYear()} IT Schulungsmaßnahmen'))}, hold: 2.0 }
];
const FADE = 0.4;

function loadImage(svgMarkup) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgMarkup)));
  });
}

async function run() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  const images = await Promise.all(scenes.map((s) => loadImage(s.svg)));

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => (recorder.onstop = resolve));
  recorder.start();

  const totalDuration = scenes.reduce((sum, s) => sum + s.hold, 0);
  const startTime = performance.now();

  function drawScene(index, alpha) {
    const img = images[index];
    ctx.fillStyle = '#f2ead9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.82;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2 - 20;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(60,40,10,0.35)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    if (scenes[index].caption) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#8c3b3b';
      ctx.font = 'bold 26px "Segoe UI", Arial';
      ctx.textAlign = 'center';
      ctx.fillText(scenes[index].caption, canvas.width / 2, y + h + 50);
      ctx.restore();
    }
  }

  function frame() {
    const elapsed = (performance.now() - startTime) / 1000;
    if (elapsed >= totalDuration) {
      recorder.stop();
      return;
    }
    let acc = 0;
    let idx = 0;
    for (; idx < scenes.length; idx++) {
      if (elapsed < acc + scenes[idx].hold) break;
      acc += scenes[idx].hold;
    }
    const local = elapsed - acc;
    const hold = scenes[idx].hold;
    let alpha = 1;
    if (local < FADE) alpha = local / FADE;
    else if (local > hold - FADE) alpha = Math.max(0, (hold - local) / FADE);
    drawScene(idx, alpha);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  await stopped;
  const blob = new Blob(chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ${JSON.stringify(OUT_FILE)};
  document.body.appendChild(a);
  a.click();
  window.__recordingDone = true;
}
run();
</script>
</body></html>`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(JSON.parse(d)));
      })
      .on('error', reject);
  });
}

function send(ws, id, method, params) {
  ws.send(JSON.stringify({ id, method, params: params || {} }));
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error('Kein Chromium/Chrome gefunden.');
    process.exit(1);
  }

  const tmpHtml = path.join(OUT_DIR, '_demo-video-source.tmp.html');
  fs.writeFileSync(tmpHtml, html, 'utf-8');

  if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);

  const cdpPort = 9555;
  const userDataDir = path.join(require('os').tmpdir(), 'demo-video-chrome-profile');
  fs.rmSync(userDataDir, { recursive: true, force: true });

  const proc = spawn(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  proc.stderr.on('data', () => {}); // Chromium-Logs unterdrücken

  await new Promise((r) => setTimeout(r, 1500));

  const targets = await getJson(`http://localhost:${cdpPort}/json`);
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = {};

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && pending[msg.id]) {
      pending[msg.id](msg);
      delete pending[msg.id];
    }
  });

  function call(method, params) {
    return new Promise((resolve) => {
      const myId = ++id;
      pending[myId] = resolve;
      send(ws, myId, method, params);
    });
  }

  await new Promise((resolve) => ws.on('open', resolve));
  await call('Page.enable');
  await call('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT_DIR });
  await call('Page.navigate', { url: `file://${tmpHtml}` });

  console.log('Nehme Demo-Video auf (läuft in Echtzeit, ca. 15 Sekunden) …');

  const timeoutAt = Date.now() + 45000;
  while (Date.now() < timeoutAt) {
    await new Promise((r) => setTimeout(r, 1000));
    if (fs.existsSync(OUT_PATH)) break;
    // Chromium legt Downloads zwischenzeitlich als .crdownload an
  }

  ws.close();
  proc.kill();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.unlinkSync(tmpHtml);

  if (fs.existsSync(OUT_PATH)) {
    const size = fs.statSync(OUT_PATH).size;
    console.log(`Erzeugt: ${OUT_PATH} (${(size / 1024).toFixed(0)} KB)`);
  } else {
    console.error('Video wurde nicht gefunden – Aufnahme vermutlich fehlgeschlagen.');
    process.exit(1);
  }
}

main();
