/*
 * Erzeugt alle herunterladbaren Materialien für "IT Schulungsmaßnahmen":
 *   - 5x Vollversion-Broschüre (Windows, Mac, Linux, Android, iOS) mit 3D-Beispielbildern
 *   - 5x Installationshandbuch (inkl. dem jeweiligen PowerShell-Startskript im Wortlaut)
 *   - 1x Handzettel für Teilnehmer (weiche Farben, Hochglanz-3D)
 *
 * Läuft mit reinem Node.js + einem lokal vorhandenen Chromium/Chrome/Edge – kein
 * PowerShell nötig (die PowerShell-Variante für Endnutzer bleibt create-pdf.ps1).
 * Start: node scripts/build-materials.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'downloads');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
fs.mkdirSync(OUT_DIR, { recursive: true });

const YEAR = new Date().getFullYear();
const GEN_DATE = new Date().toLocaleString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

// ---------- Gemeinsames Theme: Sandton/Beige, weiße Flächen, dunkelrote Headlines, Hochglanz-3D ----------
const BASE_CSS = `
  :root { --sand:#f2ead9; --sand-deep:#e7dcc3; --soft-dark-red:#8c3b3b; --white:#fff; --black:#111; }
  @page { size: A4; margin: 14mm 14mm 20mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; background: var(--sand); color: var(--black); margin: 0; }
  .page { padding: 6mm; }
  h1 { color: var(--soft-dark-red); font-size: 28px; margin: 0 0 4px 0; }
  h2 { color: var(--soft-dark-red); font-size: 19px; margin: 0 0 10px 0; border-bottom: 3px solid var(--soft-dark-red); padding-bottom: 6px; }
  .subtitle { color: #55606f; font-size: 13px; margin: 0 0 18px 0; }
  p { font-size: 13px; line-height: 1.55; }
  ul, ol { font-size: 13px; line-height: 1.6; }
  .copyright { position: fixed; bottom: 6mm; left: 0; right: 0; text-align: center; font-size: 11px; color: var(--soft-dark-red); }
  .hero { position: relative; overflow: hidden; background: linear-gradient(90deg, #6f2d2d, var(--soft-dark-red)); color: var(--white); border-radius: 12px; padding: 22px 24px; margin-bottom: 20px; }
  .hero h1 { color: var(--white); }
  .hero .subtitle { color: #f3e2e2; }
  .card { position: relative; overflow: hidden; background: var(--white); border: 1px solid var(--sand-deep); border-radius: 12px; padding: 18px 20px; margin: 0 0 16px 0; box-shadow: 0 3px 10px rgba(0,0,0,0.08); page-break-inside: avoid; }
  /* Hochglanz-Lichtstreifen (glossy sheen) über Hero und Karten */
  .hero::after, .card::after {
    content: "";
    position: absolute; top: -60%; left: -25%; width: 55%; height: 220%;
    background: linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0) 62%);
    transform: rotate(18deg);
    pointer-events: none;
  }
  code, pre { font-family: "Consolas", "SFMono-Regular", Menlo, monospace; }
  pre.script-box { background: #0b1f4d; color: #eaf1fb; border-radius: 10px; padding: 14px 16px; font-size: 11.5px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
  .steps li { margin-bottom: 6px; }
  .figure { margin-top: 10px; border: 1px solid var(--sand-deep); border-radius: 8px; overflow: hidden; }
  .caption { font-size: 11px; color: #55606f; margin-top: 6px; text-align: center; }
`;

function shell(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>${BASE_CSS}</style>
</head>
<body>
  <div class="page">
    ${bodyHtml}
  </div>
  <div class="copyright">© ${YEAR} IT Schulungsmaßnahmen – Alle Rechte vorbehalten. · Erstellt am ${GEN_DATE}</div>
</body>
</html>`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- 3D-Beispielbilder (gleiche Optik wie create-pdf.ps1) ----------
const imgDashboard = `
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="d-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient>
    <filter id="d-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="11" flood-color="#3a2a10" flood-opacity="0.30"/></filter>
  </defs>
  <ellipse cx="360" cy="382" rx="250" ry="18" fill="#000000" opacity="0.12"/>
  <g transform="translate(78,44) skewY(-7)" filter="url(#d-ds)">
    <rect x="0" y="18" width="544" height="300" rx="16" fill="#c9b98f"/>
    <rect x="0" y="0" width="544" height="300" rx="16" fill="#ffffff" stroke="#e7dcc3"/>
    <rect x="0" y="0" width="544" height="44" rx="16" fill="url(#d-red)"/>
    <text x="18" y="29" fill="#fff" font-family="Segoe UI, Arial" font-size="17" font-weight="700">IT Schulungsmaßnahmen</text>
    <rect x="16" y="56" width="120" height="18" rx="9" fill="#8c3b3b"/>
    <rect x="146" y="56" width="120" height="18" rx="9" fill="#ffffff" stroke="#5b9bd5"/>
    <g font-family="Segoe UI, Arial" font-size="11" fill="#fff">
      <rect x="16" y="90" width="162" height="196" rx="10" fill="#e6dcc4"/>
      <rect x="16" y="86" width="162" height="196" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
      <rect x="16" y="86" width="162" height="26" rx="10" fill="#14367a"/><text x="26" y="104">Liste 1 – To-Do</text>
      <rect x="192" y="90" width="162" height="196" rx="10" fill="#e6dcc4"/>
      <rect x="192" y="86" width="162" height="196" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
      <rect x="192" y="86" width="162" height="26" rx="10" fill="#5b9bd5"/><text x="202" y="104">Liste 2 – Offen</text>
      <rect x="368" y="90" width="162" height="196" rx="10" fill="#e6dcc4"/>
      <rect x="368" y="86" width="162" height="196" rx="10" fill="#fbf8f0" stroke="#dceaf7"/>
      <rect x="368" y="86" width="162" height="26" rx="10" fill="#0b1f4d"/><text x="378" y="104">Liste 3 – Erledigt</text>
    </g>
    <g fill="#111" font-family="Segoe UI, Arial" font-size="10">
      <text x="26" y="132">☑ Folien vorbereiten</text><text x="26" y="152">☐ Quiz einsammeln</text>
      <text x="202" y="132">• Abschlussprojekt</text>
      <text x="378" y="132">✓ Grundlagen-Modul</text>
    </g>
  </g>
</svg>`;

const imgLesson = `
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="l-blue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b1f4d"/><stop offset="1" stop-color="#5b9bd5"/></linearGradient>
    <filter id="l-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="11" flood-color="#1a2a44" flood-opacity="0.30"/></filter>
  </defs>
  <ellipse cx="360" cy="384" rx="255" ry="18" fill="#000000" opacity="0.12"/>
  <g transform="translate(66,40) skewY(-6)" filter="url(#l-ds)">
    <rect x="0" y="18" width="568" height="316" rx="16" fill="#c9b98f"/>
    <rect x="0" y="0" width="568" height="316" rx="16" fill="#ffffff" stroke="#e7dcc3"/>
    <rect x="0" y="0" width="568" height="40" rx="16" fill="url(#l-blue)"/>
    <text x="16" y="26" fill="#fff" font-family="Segoe UI, Arial" font-size="14" font-weight="700">Video-Live-Chat – Unterricht</text>
    <g>
      <rect x="18" y="54" width="76" height="56" rx="8" fill="#16305f"/><rect x="18" y="50" width="76" height="56" rx="8" fill="#0b1f4d"/><text x="24" y="124" fill="#111" font-family="Segoe UI,Arial" font-size="10">Dozent</text>
      <rect x="102" y="54" width="76" height="56" rx="8" fill="#1b3f86"/><rect x="102" y="50" width="76" height="56" rx="8" fill="#14367a"/><text x="120" y="124" fill="#111" font-family="Segoe UI,Arial" font-size="10">Ich</text>
      <rect x="186" y="54" width="76" height="56" rx="8" fill="#33528f"/><rect x="186" y="50" width="76" height="56" rx="8" fill="#3a5a99"/><text x="200" y="124" fill="#111" font-family="Segoe UI,Arial" font-size="10">Max</text>
    </g>
    <rect x="18" y="140" width="330" height="150" rx="10" fill="#08163a"/>
    <rect x="18" y="136" width="330" height="150" rx="10" fill="#0b1f4d"/>
    <rect x="26" y="262" width="188" height="18" rx="9" fill="#8c3b3b"/><text x="34" y="275" fill="#fff" font-family="Segoe UI,Arial" font-size="10">Live-Übertragung – Unterricht</text>
    <rect x="362" y="140" width="188" height="150" rx="10" fill="#dfe9f6"/>
    <rect x="362" y="136" width="188" height="150" rx="10" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="362" y="136" width="188" height="24" rx="10" fill="#14367a"/><text x="370" y="152" fill="#fff" font-family="Segoe UI,Arial" font-size="11">Unterrichts-Chat</text>
    <g fill="#111" font-family="Segoe UI,Arial" font-size="10">
      <text x="370" y="178">Max: Frage zu Aufgabe 3?</text>
      <text x="370" y="198">⏸ Pause – Ich (10:15)</text>
    </g>
  </g>
</svg>`;

const imgFolders = `
<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="f-red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f2d2d"/><stop offset="1" stop-color="#8c3b3b"/></linearGradient>
    <filter id="f-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="11" stdDeviation="10" flood-color="#3a2a10" flood-opacity="0.28"/></filter>
  </defs>
  <ellipse cx="360" cy="322" rx="250" ry="16" fill="#000000" opacity="0.12"/>
  <g transform="translate(60,34) skewY(-6)" filter="url(#f-ds)">
    <rect x="0" y="16" width="286" height="256" rx="12" fill="#c9b98f"/>
    <rect x="0" y="0" width="286" height="256" rx="12" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="0" y="0" width="286" height="26" rx="12" fill="url(#f-red)"/>
    <text x="10" y="18" fill="#fff" font-family="Segoe UI,Arial" font-size="12">📁 Hausaufgaben</text>
    <g font-family="Segoe UI,Arial" font-size="10" fill="#111">
      <rect x="12" y="40" width="262" height="52" rx="8" fill="#f7faff" stroke="#0b1f4d"/>
      <text x="20" y="58" font-weight="700">Max Mustermann</text><text x="20" y="76">Aufgabe 2 – Korrigiert &amp; zurückgegeben</text>
      <rect x="12" y="102" width="262" height="52" rx="8" fill="#fff" stroke="#5b9bd5"/>
      <text x="20" y="120" font-weight="700">Erika Beispiel</text><text x="20" y="138">Aufgabe 3 – Eingereicht</text>
    </g>
  </g>
  <g transform="translate(330,34) skewY(6)" filter="url(#f-ds)">
    <rect x="0" y="16" width="286" height="256" rx="12" fill="#c9b98f"/>
    <rect x="0" y="0" width="286" height="256" rx="12" fill="#ffffff" stroke="#dceaf7"/>
    <rect x="0" y="0" width="286" height="26" rx="12" fill="url(#f-red)"/>
    <text x="10" y="18" fill="#fff" font-family="Segoe UI,Arial" font-size="12">📁 Kalender – Tests &amp; Prüfungen</text>
    <rect x="12" y="40" width="262" height="30" rx="6" fill="#f2ead9"/><text x="22" y="60" fill="#8c3b3b" font-family="Segoe UI,Arial" font-size="11" font-weight="700">Dienstag, 22. Juli 2026, 14:30:05</text>
    <g font-family="Segoe UI,Arial" font-size="10" fill="#111">
      <rect x="12" y="80" width="262" height="34" rx="6" fill="#fff" stroke="#8c3b3b"/>
      <text x="20" y="94" font-weight="700">Java-Zwischentest</text><text x="20" y="108">Freitag, 25. Juli 2026, 10:00 · in 3 Tagen</text>
    </g>
  </g>
</svg>`;

// ---------- Plattform-Definitionen ----------
const PLATFORMS = [
  { key: 'Windows', script: 'start-windows.ps1', note: 'Ausführen mit: powershell -ExecutionPolicy Bypass -File scripts\\start-windows.ps1', native: true },
  { key: 'Mac', script: 'start-macos.ps1', note: 'Ausführen mit: pwsh ./scripts/start-macos.ps1 (PowerShell 7+ nötig, z. B. via "brew install powershell")', native: true },
  { key: 'Linux', script: 'start-linux.ps1', note: 'Ausführen mit: pwsh ./scripts/start-linux.ps1 (PowerShell 7+ nötig)', native: true },
  { key: 'Android', script: 'start-android.ps1', note: 'Erzeugt die Vollversion-Broschüre als PDF für Android (Electron läuft nicht nativ auf Android).', native: false },
  { key: 'iOS', script: 'start-ios.ps1', note: 'Erzeugt die Vollversion-Broschüre als PDF für iOS (Electron läuft nicht nativ auf iOS).', native: false }
];

function readScript(name) {
  return fs.readFileSync(path.join(SCRIPTS_DIR, name), 'utf-8');
}

// ---------- Chromium/Chrome finden ----------
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function renderPdf(chrome, html, outPath) {
  const tmpHtml = outPath.replace(/\.pdf$/, '.tmp.html');
  fs.writeFileSync(tmpHtml, html, 'utf-8');
  execFileSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${outPath}`,
    `file://${tmpHtml}`
  ]);
  fs.unlinkSync(tmpHtml);
}

// ---------- 1) Broschüre je Plattform (Vollversion oder Demo) ----------
function brochureHtml(platformKey, edition) {
  const editionNote =
    edition === 'Demo'
      ? 'Demo-Broschüre · mit vorbefüllten Beispieldaten zum Ausprobieren'
      : 'Vollversion-Broschüre · Desktop-Dashboard für Dozenten, Teilnehmende und Unterricht';
  return shell(`IT Schulungsmaßnahmen – ${edition} (${platformKey})`, `
    <div class="hero">
      <h1>IT Schulungsmaßnahmen</h1>
      <p class="subtitle">${editionNote} &middot; Ausgabe für ${esc(platformKey)}</p>
    </div>
    <div class="card">
      <h2>Dashboard &amp; Listen</h2>
      <p>Verwaltung von bis zu vier Dozenten mit To-Do-Liste, offenen und erledigten Projekten sowie Chat/Notizen – pro Dozent.</p>
      <div class="figure">${imgDashboard}</div>
      <div class="caption">Beispielansicht (3D): Dozenten-Dashboard mit drei Listen</div>
    </div>
    <div class="card">
      <h2>Video-Live-Chat &amp; Unterricht</h2>
      <p>Teilnehmer-Leiste mit kleinen Live-Kacheln und Gesamtanzahl, große Live-Übertragung, Unterrichts-Chat für alle (Fragen, Pause), Privat- und Gruppenchats, PowerPoint-Freigabe auf allen Bildschirmen. Der Dozent kann alle stummschalten; gemeldete Teilnehmer werden freigeschaltet.</p>
      <div class="figure">${imgLesson}</div>
      <div class="caption">Beispielansicht (3D): Unterrichts-Ansicht mit Teilnehmern und Chat</div>
    </div>
    <div class="card">
      <h2>Ordner: Hausaufgaben &amp; Kalender</h2>
      <p>Teilnehmer reichen Hausaufgaben ein, der Dozent korrigiert und gibt sie zurück. Der Kalender zeigt eine Echtzeit-Uhr sowie anstehende Tests und Prüfungen mit Countdown.</p>
      <div class="figure">${imgFolders}</div>
      <div class="caption">Beispielansicht (3D): Hausaufgaben-Ordner und Echtzeit-Kalender</div>
    </div>
  `);
}

// ---------- 2) Installationshandbuch je Plattform ----------
function manualHtml(p) {
  const scriptContent = readScript(p.script);
  return shell(`Installationshandbuch – ${p.key}`, `
    <div class="hero">
      <h1>Installationshandbuch</h1>
      <p class="subtitle">IT Schulungsmaßnahmen · Vollversion für ${esc(p.key)}</p>
    </div>
    <div class="card">
      <h2>Voraussetzungen</h2>
      <ol class="steps">
        ${p.native
          ? `<li><a href="https://nodejs.org">Node.js</a> installieren (einmalig).</li>
             <li>${p.key === 'Windows' ? 'Windows PowerShell ist bereits vorinstalliert.' : 'PowerShell 7+ (<code>pwsh</code>) installieren, z. B. über den jeweiligen Paketmanager.'}</li>`
          : `<li>Ein Rechner mit Node.js und PowerShell 7+ (<code>pwsh</code>), um die Vollversion-PDF für ${esc(p.key)} zu erzeugen – Electron läuft nicht nativ auf ${esc(p.key)}.</li>`
        }
        <li>Dieses Repository lokal vorliegen haben (geklont oder als ZIP entpackt).</li>
      </ol>
    </div>
    <div class="card">
      <h2>Installation &amp; Start</h2>
      <p>${esc(p.note)}</p>
      <p>Das Skript installiert bei Bedarf automatisch die Abhängigkeiten (<code>npm install</code>) und
      ${p.native ? 'startet anschließend die Vollversion (kein Demo-Modus, echte persistente Daten).' : 'erzeugt anschließend die Vollversion-Broschüre als PDF im Projektordner.'}</p>
      <pre class="script-box">${esc(scriptContent)}</pre>
    </div>
    <div class="card">
      <h2>Hinweise</h2>
      <ul>
        <li>Bei Fragen zur Ausführung von PowerShell-Skripten: <code>Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass</code> vor dem Start ausführen, falls die Ausführung blockiert wird.</li>
        <li>Für die Browser-Vollversion (ohne Electron) steht zusätzlich <code>scripts/start-browser.ps1</code> zur Verfügung.</li>
      </ul>
    </div>
  `);
}

// ---------- 3) Handzettel für Teilnehmer (weiche Farben, Hochglanz-3D) ----------
function handoutHtml() {
  return shell('Handzettel für Teilnehmer', `
    <style>
      /* Weichere, hellere Variante des Farbschemas nur für den Handzettel */
      .hero { background: linear-gradient(120deg, #b98a8a, #d9a9a9); }
      .hero .subtitle { color: #4a2020; }
      .soft-card { background: #fffaf2; border: 1px solid #f0dfc4; }
    </style>
    <div class="hero">
      <h1 style="color:#4a2020;">Willkommen bei IT Schulungsmaßnahmen</h1>
      <p class="subtitle">Kurzinfo für Teilnehmerinnen und Teilnehmer</p>
    </div>
    <div class="card soft-card">
      <h2>So nimmst du teil</h2>
      <ol class="steps">
        <li>App bzw. Broschüre für dein Gerät von deinem Dozenten/deiner Dozentin erhalten (Windows, Mac, Linux, Android oder iOS).</li>
        <li>Zum Unterricht bitte <strong>immer per Videochat anmelden</strong> – nur so kannst du am Unterricht teilnehmen.</li>
        <li>Mikrofon/Kamera können jederzeit über die Symbole „🎤 Audio" und „📹 Video" ein- oder ausgeschaltet werden.</li>
        <li>Fragen? Über den Unterrichts-Chat stellen, oder dich per „✋ Melden" zu Wort melden – der Dozent/die Dozentin schaltet dich dann frei.</li>
      </ol>
    </div>
    <div class="card soft-card">
      <h2>Weitere Funktionen für dich</h2>
      <ul>
        <li>📁 <strong>Hausaufgaben-Ordner</strong>: eigene Aufgaben einreichen und die Korrektur/Rückgabe deines Dozenten sehen.</li>
        <li>📁 <strong>Kalender</strong>: anstehende Tests und Prüfungen mit Datum, Uhrzeit und Countdown im Blick behalten.</li>
        <li>💬 <strong>Privat- &amp; Gruppenchat</strong>: mit anderen Teilnehmenden oder Gruppen austauschen.</li>
        <li>📊 <strong>Präsentationen</strong>: wenn jemand vorträgt, wird die PowerPoint-Datei auf allen Bildschirmen geteilt.</li>
      </ul>
      <div class="figure">${imgLesson}</div>
      <div class="caption">Beispielansicht (3D): Unterrichts-Ansicht mit Teilnehmern und Chat</div>
    </div>
    <div class="card soft-card">
      <h2>Gut zu wissen</h2>
      <p>Bei Problemen mit Kamera oder Mikrofon: Zugriffsrechte des Browsers bzw. der App prüfen. Bei technischen Fragen wende dich an deinen Dozenten oder deine Dozentin.</p>
    </div>
  `);
}

// ---------- Ausführen ----------
function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.error('Kein Chromium/Chrome gefunden. Bitte CHROME_PATH setzen oder Chrome/Chromium installieren.');
    process.exit(1);
  }
  console.log('Verwende Browser:', chrome);

  for (const p of PLATFORMS) {
    const vFile = path.join(OUT_DIR, `IT-Schulungsmassnahmen-Vollversion-${p.key}.pdf`);
    renderPdf(chrome, brochureHtml(p.key, 'Vollversion'), vFile);
    console.log('Erzeugt:', vFile);

    const dFile = path.join(OUT_DIR, `IT-Schulungsmassnahmen-Demo-${p.key}.pdf`);
    renderPdf(chrome, brochureHtml(p.key, 'Demo'), dFile);
    console.log('Erzeugt:', dFile);

    const mFile = path.join(OUT_DIR, `Installationshandbuch-${p.key}.pdf`);
    renderPdf(chrome, manualHtml(p), mFile);
    console.log('Erzeugt:', mFile);
  }

  const hFile = path.join(OUT_DIR, 'Handzettel-Teilnehmer.pdf');
  renderPdf(chrome, handoutHtml(), hFile);
  console.log('Erzeugt:', hFile);

  console.log('Alle Materialien wurden in', OUT_DIR, 'erzeugt.');
}

main();
