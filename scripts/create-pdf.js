/*
 * Music Heaven – PDF-Handbuch-Generator.
 * Erzeugt ein Nutzerhandbuch als PDF im Music-Heaven-Farbschema (frisches
 * Gruen auf Schwarz) mit 3D-Beispielbildern (isometrische SVG-Mockups) und
 * einer Copyright-Zeile auf jeder Seite - im selben Format, das schon fuer
 * frueher Handbuecher in diesem Repository verwendet wurde:
 *   "(c) {Jahr} {App} - Alle Rechte vorbehalten. . Erstellt am {Datum}"
 *
 * Baut zunaechst eine HTML-Datei und rendert sie ueber einen im System
 * vorhandenen Chromium/Chrome/Edge headless zu PDF. Ist kein Browser
 * vorhanden, bleibt die HTML-Datei erhalten und kann manuell gedruckt werden.
 *
 * Ausfuehren: node scripts/create-pdf.js [--out <Ordner>]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : path.join(__dirname, '..');

const APP_NAME = 'Music Heaven';
const year = new Date().getFullYear();
const genDate = new Date().toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const htmlPath = path.join(outDir, 'Music-Heaven-Handbuch.html');
const pdfPath = path.join(outDir, 'Music-Heaven-Handbuch.pdf');

// ---- 3D-Beispielbilder (isometrische SVG-Mockups im Music-Heaven-Look) ----

const imgUpload = `
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="u-green" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1fdb6f"/><stop offset="1" stop-color="#0b6b39"/></linearGradient>
    <filter id="u-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="11" flood-color="#000000" flood-opacity="0.45"/></filter>
  </defs>
  <ellipse cx="360" cy="384" rx="255" ry="18" fill="#000000" opacity="0.35"/>
  <g transform="translate(70,40) skewY(-6)" filter="url(#u-ds)">
    <rect x="0" y="18" width="560" height="316" rx="16" fill="#0b6b39"/>
    <rect x="0" y="0" width="560" height="316" rx="16" fill="#0d1712" stroke="#16321f"/>
    <rect x="0" y="0" width="560" height="42" rx="16" fill="url(#u-green)"/>
    <text x="16" y="27" fill="#03150a" font-family="Segoe UI, Arial" font-size="16" font-weight="800">MUSIC HEAVEN &#9835;</text>
    <text x="470" y="27" fill="#03150a" font-family="Segoe UI, Arial" font-size="11" font-weight="700">Ordner 1</text>

    <rect x="18" y="58" width="230" height="228" rx="10" fill="#0f1c15" stroke="#16321f"/>
    <text x="30" y="80" fill="#4dff9f" font-family="Segoe UI, Arial" font-size="12" font-weight="700">Musik hochladen</text>
    <rect x="30" y="92" width="206" height="26" rx="6" fill="#050a07" stroke="#16321f"/><text x="38" y="109" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="10">Track_01_Sommer.mp3</text>
    <rect x="30" y="124" width="206" height="26" rx="6" fill="#050a07" stroke="#16321f"/><text x="38" y="141" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="10">Track_02_Nacht.wav</text>
    <rect x="30" y="156" width="206" height="26" rx="6" fill="#050a07" stroke="#16321f"/><text x="38" y="173" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="10">Track_03_Beat.mp3</text>
    <rect x="30" y="196" width="206" height="30" rx="8" fill="#1fdb6f"/><text x="46" y="216" fill="#03150a" font-family="Segoe UI, Arial" font-size="11" font-weight="700">+ Musik hochladen</text>

    <rect x="264" y="58" width="278" height="228" rx="10" fill="#0f1c15" stroke="#16321f"/>
    <text x="276" y="80" fill="#4dff9f" font-family="Segoe UI, Arial" font-size="12" font-weight="700">Automatischer Mix</text>
    <rect x="276" y="92" width="120" height="24" rx="6" fill="#050a07" stroke="#16321f"/><text x="284" y="108" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="9">Track A</text>
    <rect x="404" y="92" width="120" height="24" rx="6" fill="#050a07" stroke="#16321f"/><text x="412" y="108" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="9">Track B</text>
    <rect x="276" y="126" width="248" height="24" rx="6" fill="#050a07" stroke="#16321f"/><text x="284" y="142" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="9">&#8594; Nahtloser Crossfade</text>
    <rect x="276" y="164" width="248" height="34" rx="8" fill="#1fdb6f"/><text x="288" y="186" fill="#03150a" font-family="Segoe UI, Arial" font-size="11" font-weight="700">&#9654; Abh&#246;ren &amp; aufnehmen</text>
    <rect x="276" y="210" width="248" height="60" rx="8" fill="#050a07" stroke="#1fdb6f" stroke-dasharray="4 3"/>
    <text x="288" y="230" fill="#9fc9ae" font-family="Segoe UI, Arial" font-size="9">Mein automatischer Mix</text>
    <rect x="288" y="240" width="104" height="20" rx="5" fill="#0f1c15" stroke="#0b6b39"/><text x="294" y="254" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="8">In Music Heaven speichern</text>
    <rect x="400" y="240" width="112" height="20" rx="5" fill="transparent" stroke="#1fdb6f"/><text x="406" y="254" fill="#4dff9f" font-family="Segoe UI, Arial" font-size="8">Extern speichern unter&#8230;</text>
  </g>
</svg>`;

const imgCreate = `
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="c-green" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1fdb6f"/><stop offset="1" stop-color="#0b6b39"/></linearGradient>
    <filter id="c-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="11" flood-color="#000000" flood-opacity="0.45"/></filter>
  </defs>
  <ellipse cx="360" cy="384" rx="255" ry="18" fill="#000000" opacity="0.35"/>
  <g transform="translate(70,40) skewY(6)" filter="url(#c-ds)">
    <rect x="0" y="18" width="560" height="316" rx="16" fill="#0b6b39"/>
    <rect x="0" y="0" width="560" height="316" rx="16" fill="#0d1712" stroke="#16321f"/>
    <rect x="0" y="0" width="560" height="42" rx="16" fill="url(#c-green)"/>
    <text x="16" y="27" fill="#03150a" font-family="Segoe UI, Arial" font-size="16" font-weight="800">MUSIC HEAVEN &#9835;</text>
    <text x="470" y="27" fill="#03150a" font-family="Segoe UI, Arial" font-size="11" font-weight="700">Ordner 2</text>

    <rect x="18" y="58" width="180" height="228" rx="10" fill="#0f1c15" stroke="#16321f"/>
    <text x="28" y="80" fill="#4dff9f" font-family="Segoe UI, Arial" font-size="12" font-weight="700">Equipment</text>
    <g font-family="Segoe UI, Arial" font-size="9" font-weight="700" fill="#4dff9f">
      <rect x="28" y="90" width="60" height="30" rx="7" fill="#050a07" stroke="#0b6b39"/><text x="36" y="109">Kick</text>
      <rect x="94" y="90" width="60" height="30" rx="7" fill="#050a07" stroke="#0b6b39"/><text x="102" y="109">Snare</text>
      <rect x="28" y="126" width="60" height="30" rx="7" fill="#050a07" stroke="#0b6b39"/><text x="34" y="145">Hi-Hat</text>
      <rect x="94" y="126" width="60" height="30" rx="7" fill="#050a07" stroke="#0b6b39"/><text x="100" y="145">Clap</text>
    </g>
    <rect x="28" y="168" width="126" height="24" rx="6" fill="#1fdb6f"/><text x="36" y="184" fill="#03150a" font-family="Segoe UI, Arial" font-size="9" font-weight="700">+ Drums hinzuf&#252;gen</text>
    <text x="28" y="212" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="10" font-weight="700">Piano / Saxophon</text>
    <text x="28" y="228" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="10" font-weight="700">Vocals / Bass</text>
    <rect x="28" y="238" width="126" height="22" rx="6" fill="#050a07" stroke="#16321f"/><text x="36" y="253" fill="#9fc9ae" font-family="Segoe UI, Arial" font-size="9">Note: E4</text>

    <rect x="212" y="58" width="330" height="228" rx="10" fill="#0f1c15" stroke="#16321f"/>
    <text x="224" y="80" fill="#4dff9f" font-family="Segoe UI, Arial" font-size="12" font-weight="700">Step-Sequencer</text>
    <g>
      ${['Kick', 'Snare', 'Hi-Hat', 'Piano E4'].map((label, row) => {
    const y = 96 + row * 26;
    const cells = Array.from({ length: 16 }).map((_, i) => {
      const on = (row === 0 && (i === 0 || i === 8)) || (row === 1 && (i === 4 || i === 12)) || (row === 2 && i % 2 === 0) || (row === 3 && (i === 0 || i === 6 || i === 10));
      const x = 300 + i * 15.4;
      return `<rect x="${x}" y="${y}" width="12" height="12" rx="2" fill="${on ? '#1fdb6f' : '#050a07'}" stroke="#16321f"/>`;
    }).join('');
    return `<text x="224" y="${y + 10}" fill="#e9fff2" font-family="Segoe UI, Arial" font-size="9">${label}</text>${cells}`;
  }).join('')}
    </g>
    <rect x="224" y="210" width="140" height="30" rx="8" fill="#1fdb6f"/><text x="236" y="230" fill="#03150a" font-family="Segoe UI, Arial" font-size="10" font-weight="700">&#9654; Abh&#246;ren &amp; aufnehmen</text>
    <text x="224" y="258" fill="#9fc9ae" font-family="Segoe UI, Arial" font-size="9">Tempo: 110 BPM &#183; Wiederholungen: 2x</text>
  </g>
</svg>`;

const imgLibrary = `
<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg" width="100%">
  <defs>
    <linearGradient id="l-green" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1fdb6f"/><stop offset="1" stop-color="#0b6b39"/></linearGradient>
    <filter id="l-ds" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000000" flood-opacity="0.4"/></filter>
  </defs>
  <ellipse cx="360" cy="280" rx="250" ry="14" fill="#000000" opacity="0.3"/>
  <g transform="translate(80,30) skewY(-4)" filter="url(#l-ds)">
    <rect x="0" y="14" width="540" height="200" rx="14" fill="#0b6b39"/>
    <rect x="0" y="0" width="540" height="200" rx="14" fill="#0d1712" stroke="#16321f"/>
    <rect x="0" y="0" width="540" height="34" rx="14" fill="url(#l-green)"/>
    <text x="16" y="23" fill="#03150a" font-family="Segoe UI, Arial" font-size="13" font-weight="800">Music Heaven Bibliothek</text>
    <g font-family="Segoe UI, Arial" font-size="10" fill="#e9fff2">
      <rect x="16" y="48" width="508" height="30" rx="6" fill="#050a07" stroke="#16321f"/><text x="26" y="67">&#9835; Mein automatischer Mix &#8211; (Mix)</text><text x="470" y="67" fill="#4dff9f">&#9654; &#128465;</text>
      <rect x="16" y="86" width="508" height="30" rx="6" fill="#050a07" stroke="#16321f"/><text x="26" y="105">&#9835; Mein Musikst&#252;ck &#8211; (Musikst&#252;ck)</text><text x="470" y="105" fill="#4dff9f">&#9654; &#128465;</text>
      <rect x="16" y="124" width="508" height="30" rx="6" fill="#050a07" stroke="#16321f"/><text x="26" y="143">&#9835; Abendmix &#8211; (Mix)</text><text x="470" y="143" fill="#4dff9f">&#9654; &#128465;</text>
    </g>
  </g>
</svg>`;

// ---- HTML-Dokument im Music-Heaven-Farbschema ----
const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${APP_NAME} - Nutzerhandbuch</title>
<style>
  :root { --green:#1fdb6f; --green-bright:#4dff9f; --green-dark:#0b6b39; --black:#050a07; --panel:#0f1c15; --border:#16321f; --text:#e9fff2; --text-dim:#9fc9ae; }
  @page { size: A4; margin: 14mm 14mm 20mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; background: var(--black); color: var(--text); margin: 0; }
  .page { padding: 4mm; }
  h1 { color: #03150a; font-size: 32px; margin: 0 0 4px 0; letter-spacing: 1px; }
  h2 { color: var(--green-bright); font-size: 20px; margin: 0 0 10px 0; border-bottom: 3px solid var(--green-dark); padding-bottom: 6px; }
  .subtitle { color: #55606f; font-size: 14px; margin: 0 0 18px 0; }
  .slide { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; margin: 0 0 20px 0; page-break-inside: avoid; }
  .slide p { font-size: 13px; line-height: 1.6; color: var(--text); }
  ul { font-size: 13px; line-height: 1.7; color: var(--text); }
  .figure { margin-top: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--black); }
  .caption { font-size: 11px; color: var(--text-dim); margin-top: 6px; text-align: center; }
  .copyright { position: fixed; bottom: 6mm; left: 0; right: 0; text-align: center; font-size: 11px; color: var(--green-bright); }
  .hero { background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%); color: #03150a; border-radius: 12px; padding: 26px; margin-bottom: 20px; }
  .hero h1 { color: #03150a; }
  .hero .subtitle { color: #062011; font-weight: 600; }
  .badge { display: inline-block; background: var(--black); color: var(--green-bright); border: 1px solid var(--green-dark); border-radius: 20px; padding: 3px 12px; font-size: 11px; margin-right: 6px; }
</style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <h1>&#9835; MUSIC HEAVEN</h1>
      <p class="subtitle">Nutzerhandbuch &#183; Musik hochladen, automatisch mixen &amp; eigene Musikst&#252;cke kreieren</p>
      <span class="badge">Windows</span><span class="badge">macOS</span><span class="badge">Linux</span><span class="badge">Browser</span>
    </div>

    <div class="slide">
      <h2>Willkommen bei Music Heaven</h2>
      <p>Music Heaven hat zwei Ordner: In <strong>Ordner 1</strong> l&#228;dst du eigene Musik hoch und l&#228;sst sie vollautomatisch ineinander mixen. In <strong>Ordner 2</strong> baust du eigene Musikst&#252;cke aus Drums, Piano, Saxophon, Vocals und Bass. Beide Ergebnisse kannst du vor dem Speichern abh&#246;ren, dann in der App-Bibliothek speichern oder extern in einen beliebigen Ordner exportieren.</p>
    </div>

    <div class="slide">
      <h2>Ordner 1 &#8211; Hochgeladene Musik</h2>
      <p>&#252;ber <strong>+ Musik hochladen</strong> w&#228;hlst du eigene Audiodateien (MP3, WAV, OGG, M4A, FLAC) aus. Danach w&#228;hlst du zwei Tracks (oder aktivierst "Ganze Bibliothek automatisch mixen") und den &#220;bergangs-Stil:</p>
      <ul>
        <li><strong>Nahtloser Crossfade</strong> &#8211; die Tracks blenden weich ineinander &#252;ber</li>
        <li><strong>Scratch-&#220;bergang</strong> &#8211; simulierter DJ-Scratch-Effekt (Tempo-/Tonh&#246;hen-Wobble mit Cut)</li>
      </ul>
      <p><strong>&#9654; Abh&#246;ren &amp; aufnehmen</strong> spielt den Mix ab und nimmt ihn gleichzeitig auf.</p>
      <div class="figure">${imgUpload}</div>
      <div class="caption">Beispielansicht (3D): Musik hochladen &amp; automatischer Mix</div>
    </div>

    <div class="slide">
      <h2>Ordner 2 &#8211; Musikst&#252;cke kreieren</h2>
      <p>W&#228;hle Equipment aus (Kick, Snare, Hi-Hat, Open Hat, Clap als feste Drum-Spuren; Piano, Saxophon, Vocals, Bass mit frei w&#228;hlbarer Note) und f&#252;ge es &#252;ber <strong>+ Spur hinzuf&#252;gen</strong> zum Step-Sequencer hinzu. Klicke Zellen im Raster an, um Beats/Melodien zu programmieren, stelle Tempo (BPM) und Wiederholungen ein.</p>
      <div class="figure">${imgCreate}</div>
      <div class="caption">Beispielansicht (3D): Equipment &amp; Step-Sequencer</div>
    </div>

    <div class="slide">
      <h2>Abh&#246;ren, Speichern &amp; Exportieren</h2>
      <p>Nach <strong>&#9654; Abh&#246;ren &amp; aufnehmen</strong> erscheint ein Speichern-Bereich mit drei Optionen:</p>
      <ul>
        <li><strong>In Music Heaven speichern</strong> &#8211; landet in der App-Bibliothek (siehe unten)</li>
        <li><strong>Extern speichern unter&#8230;</strong> &#8211; freie Ordnerauswahl auf deinem Ger&#228;t</li>
        <li><strong>Verwerfen</strong> &#8211; neu abmischen bzw. aufnehmen</li>
      </ul>
      <div class="figure">${imgLibrary}</div>
      <div class="caption">Beispielansicht (3D): Music Heaven Bibliothek</div>
    </div>

    <div class="slide">
      <h2>Verf&#252;gbare Plattformen</h2>
      <ul>
        <li><strong>Desktop-App</strong> (Windows/macOS/Linux) &#8211; fertige Installationsdateien unter GitHub Releases</li>
        <li><strong>Browser</strong> &#8211; lokal mit <code>npm run serve</code>, Musik wird dann im Browser gespeichert</li>
      </ul>
    </div>
  </div>

  <div class="copyright">&#169; ${year} ${APP_NAME} &#8211; Alle Rechte vorbehalten. &#183; Erstellt am ${genDate}</div>
</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('HTML erzeugt:', htmlPath);

function findBrowser() {
  const platform = process.platform;
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
      try {
        const found = execFileSync('which', [name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (found) candidates.push(found);
      } catch (err) { /* nicht gefunden */ }
    }
  }
  return candidates.find((c) => c && fs.existsSync(c)) || null;
}

const browserPath = findBrowser();
if (!browserPath) {
  console.log('Kein Chromium/Chrome/Edge gefunden - PDF wurde nicht erzeugt.');
  console.log('Die HTML-Datei kann manuell im Browser ueber "Drucken -> Als PDF speichern" exportiert werden:');
  console.log(' ', htmlPath);
  process.exit(0);
}

const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/');
console.log('Rendere PDF mit:', browserPath);
const chromeArgs = ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`];
// Chrome verweigert die Sandbox als root (z. B. in Containern) - dort noetig.
if (process.platform !== 'win32' && typeof process.getuid === 'function' && process.getuid() === 0) {
  chromeArgs.unshift('--no-sandbox');
}
chromeArgs.push(fileUrl);
execFileSync(browserPath, chromeArgs, { stdio: 'ignore' });

if (fs.existsSync(pdfPath)) {
  console.log('PDF erzeugt:', pdfPath);
} else {
  console.log('PDF konnte nicht erzeugt werden. Bitte HTML-Datei manuell drucken.');
}
