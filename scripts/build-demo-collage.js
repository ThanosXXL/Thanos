/*
 * Erzeugt eine große 3D-Glanz-Collage von "IT Schulungsmaßnahmen" zum Anschauen und
 * Herunterladen – im bekannten Sandton/Beige- und Dunkelrot-Farbschema, mit Hochglanz-
 * Lichtstreifen auf allen Elementen. Kein Video (in dieser Umgebung technisch nicht
 * encodierbar, siehe README), sondern ein hochauflösendes Sammelbild aus Laptop-/Handy-
 * Rahmen mit den App-Ansichten.
 *
 * Start: node scripts/build-demo-collage.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'downloads');
fs.mkdirSync(OUT_DIR, { recursive: true });

const YEAR = new Date().getFullYear();

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

// ---------- 3D-App-Mockups (gleiche Optik wie build-materials.js/create-pdf.ps1) ----------
const imgDashboard = `
<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="d-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient></defs>
  <rect x="0" y="0" width="640" height="380" rx="14" fill="#ffffff" stroke="#e7dcc3"/>
  <rect x="0" y="0" width="640" height="50" rx="14" fill="url(#d-red)"/>
  <text x="20" y="32" fill="#fff" font-family="Segoe UI, Arial" font-size="19" font-weight="700">IT Schulungsmaßnahmen</text>
  <rect x="16" y="64" width="130" height="20" rx="10" fill="#8c3b3b"/>
  <rect x="156" y="64" width="130" height="20" rx="10" fill="#ffffff" stroke="#5b9bd5"/>
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
  <rect x="28" y="322" width="210" height="20" rx="10" fill="#8c3b3b"/><text x="38" y="336" fill="#fff" font-family="Segoe UI,Arial" font-size="11">Live-Übertragung – Unterricht</text>
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

// Laptop-Rahmen um eine App-Ansicht, Hochglanz-Lichtstreifen inklusive.
function laptopFrame(inner, w, h) {
  const bezel = 22;
  const totalW = w + bezel * 2;
  const totalH = h + bezel * 2 + 26;
  return `
  <svg viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="lap-clip-${w}-${h}"><rect x="${bezel}" y="${bezel}" width="${w}" height="${h}" rx="10"/></clipPath>
    </defs>
    <rect x="0" y="0" width="${totalW}" height="${h + bezel * 2}" rx="16" fill="#1c1c1c"/>
    <g clip-path="url(#lap-clip-${w}-${h})">
      <g transform="translate(${bezel},${bezel})">${inner}</g>
      <polygon points="0,0 ${w * 0.35},0 ${w * 0.05},${h} -${w * 0.3},${h}" fill="rgba(255,255,255,0.16)"/>
    </g>
    <rect x="${totalW * 0.28}" y="${h + bezel * 2}" width="${totalW * 0.44}" height="20" rx="6" fill="#2b2b2b"/>
  </svg>`;
}

// Handy-Rahmen (hochkant) für eine mobile/PWA-Ansicht.
function phoneFrame(label) {
  const w = 260;
  const h = 520;
  return `
  <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ph-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient>
      <clipPath id="ph-clip"><rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="26"/></clipPath>
    </defs>
    <rect x="0" y="0" width="${w}" height="${h}" rx="38" fill="#1c1c1c"/>
    <g clip-path="url(#ph-clip)">
      <rect x="14" y="14" width="${w - 28}" height="${h - 28}" fill="#f2ead9"/>
      <rect x="14" y="14" width="${w - 28}" height="70" fill="url(#ph-red)"/>
      <text x="28" y="46" fill="#fff" font-family="Segoe UI, Arial" font-size="15" font-weight="700">IT Schulungs-</text>
      <text x="28" y="66" fill="#fff" font-family="Segoe UI, Arial" font-size="15" font-weight="700">maßnahmen</text>
      <text x="28" y="90" fill="#f3e2e2" font-family="Segoe UI, Arial" font-size="10">${label}</text>
      <g font-family="Segoe UI, Arial" font-size="11" fill="#111">
        <rect x="28" y="104" width="${w - 56}" height="44" rx="8" fill="#fff" stroke="#dceaf7"/>
        <text x="36" y="122" font-weight="700">🎥 Video-Chat</text><text x="36" y="138">3 Teilnehmer online</text>
        <rect x="28" y="156" width="${w - 56}" height="44" rx="8" fill="#fff" stroke="#dceaf7"/>
        <text x="36" y="174" font-weight="700">📁 Hausaufgaben</text><text x="36" y="190">2 offen</text>
        <rect x="28" y="208" width="${w - 56}" height="44" rx="8" fill="#fff" stroke="#dceaf7"/>
        <text x="36" y="226" font-weight="700">📁 Kalender</text><text x="36" y="242">Prüfung in 3 Tagen</text>
      </g>
      <polygon points="14,14 ${w * 0.5},14 ${w * 0.15},${h - 14} -${w * 0.2},${h - 14}" fill="rgba(255,255,255,0.14)"/>
    </g>
    <rect x="${w / 2 - 30}" y="${h - 22}" width="60" height="6" rx="3" fill="#444"/>
  </svg>`;
}

const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>IT Schulungsmaßnahmen – Demo-Collage</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1800px;
    font-family: "Segoe UI", Arial, sans-serif;
    background: radial-gradient(circle at 30% 20%, #f7efdd, #f2ead9 55%, #e7dcc3 100%);
    padding: 60px;
    position: relative;
    overflow: hidden;
  }
  .hero {
    text-align: center;
    margin-bottom: 50px;
  }
  .hero h1 {
    font-size: 54px;
    color: #8c3b3b;
    letter-spacing: 1px;
  }
  .hero p {
    font-size: 20px;
    color: #55606f;
    margin-top: 10px;
  }
  .collage {
    position: relative;
    height: 1000px;
  }
  .item {
    position: absolute;
    filter: drop-shadow(0 22px 28px rgba(60, 40, 10, 0.35));
  }
  .item.glow::after {
    content: "";
    position: absolute;
    inset: -6px;
    border-radius: 24px;
    box-shadow: 0 0 60px 10px rgba(140, 59, 59, 0.18);
    pointer-events: none;
  }
  .badge {
    position: absolute;
    background: linear-gradient(120deg, #6f2d2d, #8c3b3b);
    color: #fff;
    padding: 10px 22px;
    border-radius: 30px;
    font-size: 15px;
    box-shadow: 0 8px 18px rgba(0,0,0,0.25);
  }
  .badge::before { content: "✦ "; }
  footer {
    text-align: center;
    margin-top: 40px;
    color: #8c3b3b;
    font-size: 15px;
  }
</style>
</head>
<body>
  <div class="hero">
    <h1>IT Schulungsmaßnahmen</h1>
    <p>Demo-Übersicht · Desktop, Web &amp; Mobil in einem Blick</p>
  </div>

  <div class="collage">
    <div class="item glow" style="left: 0px; top: 40px; transform: rotate(-4deg);">
      ${laptopFrame(imgDashboard, 640, 380)}
    </div>
    <div class="item glow" style="left: 660px; top: 0px; transform: rotate(3deg);">
      ${laptopFrame(imgLesson, 640, 380)}
    </div>
    <div class="item glow" style="left: 330px; top: 480px; transform: rotate(-2deg);">
      ${laptopFrame(imgFolders, 640, 340)}
    </div>
    <div class="item glow" style="left: 1360px; top: 60px; transform: rotate(5deg);">
      ${phoneFrame('Vollversion')}
    </div>
    <div class="item glow" style="left: 1360px; top: 600px; transform: rotate(-6deg);">
      ${phoneFrame('Demo')}
    </div>

    <div class="badge" style="left: 40px; top: 10px;">📷 Sniping &amp; Google Drive</div>
    <div class="badge" style="left: 700px; top: -30px;">🎥 Echter Mehrgeräte-Video-Chat</div>
    <div class="badge" style="left: 420px; top: 850px;">📁 Hausaufgaben &amp; Kalender</div>
    <div class="badge" style="left: 1370px; top: 20px;">📱 Windows · Mac · Linux · Android · iOS</div>
  </div>

  <footer>© ${YEAR} IT Schulungsmaßnahmen – Alle Rechte vorbehalten.</footer>
</body>
</html>`;

function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error('Kein Chromium/Chrome gefunden.');
    process.exit(1);
  }
  const tmpHtml = path.join(OUT_DIR, '_demo-collage.tmp.html');
  fs.writeFileSync(tmpHtml, html, 'utf-8');
  const outPng = path.join(OUT_DIR, 'IT-Schulungsmassnahmen-Demo-Collage.png');
  execFileSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1800,1500',
    `--screenshot=${outPng}`,
    `file://${tmpHtml}`
  ]);
  fs.unlinkSync(tmpHtml);
  console.log('Erzeugt:', outPng);
}

main();
