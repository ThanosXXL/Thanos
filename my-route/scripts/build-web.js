// Erzeugt aus dem Renderer zwei eigenständige HTML-Dateien (ohne Abhängigkeiten):
//   web/My-Route-Vollversion.html  – die komplette App in einer Datei (läuft per Doppelklick in jedem Browser,
//                                    auch auf Android/iOS; Daten bleiben im Browser-Speicher)
//   web/My-Route-Download.html     – Download-Seite mit 1-Klick-Download der Vollversion + Desktop-Installern
// Aufruf: npm run build:web
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const rendererDir = path.join(root, 'renderer');
const outDir = path.join(root, 'web');
const pkg = require(path.join(root, 'package.json'));

const RELEASE_BASE = 'https://github.com/thanosxxl/thanos/releases/download/my-route-v' + pkg.version + '/';
const RELEASES_PAGE = 'https://github.com/thanosxxl/thanos/releases';

const read = (p) => fs.readFileSync(path.join(rendererDir, p));
const dataUri = (p, mime) => `data:${mime};base64,${read(p).toString('base64')}`;

function buildApp() {
  const logo = dataUri('assets/logo.webp', 'image/webp');
  const favicon = dataUri('assets/favicon.png', 'image/png');
  let css = read('style.css').toString('utf-8')
    .replace('url(assets/fonts/OpenSans-Regular.ttf)', `url(${dataUri('assets/fonts/OpenSans-Regular.ttf', 'font/ttf')})`)
    .replace('url(assets/fonts/OpenSans-Bold.ttf)', `url(${dataUri('assets/fonts/OpenSans-Bold.ttf', 'font/ttf')})`);
  const js = read('renderer.js').toString('utf-8');
  if (js.includes('</script')) throw new Error('renderer.js darf kein </script enthalten');

  const csp =
    "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'; " +
    "connect-src https://nominatim.openstreetmap.org https://router.project-osrm.org; base-uri 'none'; form-action 'none'";

  let html = read('index.html').toString('utf-8')
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, `<meta http-equiv="Content-Security-Policy" content="${csp}">`)
    .replace('<link rel="icon" type="image/png" href="assets/favicon.png">', `<link rel="icon" type="image/png" href="${favicon}">`)
    .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`)
    .replace('<script src="renderer.js"></script>', () => `<script>\n${js}\n</script>`)
    .split('assets/logo.webp').join(logo);
  if (/assets\//.test(html.replace(/data:[^"')]+/g, ''))) throw new Error('Unaufgelöste Asset-Referenz in der Vollversion');
  return html;
}

function buildDownloadPage(appHtml) {
  const logo = dataUri('assets/logo.webp', 'image/webp');
  const favicon = dataUri('assets/favicon.png', 'image/png');
  const css = read('style.css').toString('utf-8')
    .replace('url(assets/fonts/OpenSans-Regular.ttf)', `url(${dataUri('assets/fonts/OpenSans-Regular.ttf', 'font/ttf')})`)
    .replace('url(assets/fonts/OpenSans-Bold.ttf)', `url(${dataUri('assets/fonts/OpenSans-Bold.ttf', 'font/ttf')})`);
  const v = pkg.version;
  const files = {
    win: { label: 'Windows', file: `My-Route-Setup-${v}.exe`, note: 'Installer (.exe) für Windows 10/11' },
    macArm: { label: 'macOS · Apple Silicon', file: `My-Route-${v}-arm64.dmg`, note: 'für M1/M2/M3/M4-Macs (.dmg)' },
    macIntel: { label: 'macOS · Intel', file: `My-Route-${v}-x64.dmg`, note: 'für ältere Intel-Macs (.dmg)' },
    android: { label: 'Android', file: `My-Route-${v}-android.apk`, note: 'APK – Installation aus „Unbekannten Quellen“ erlauben' },
    linux: { label: 'Linux', file: `My-Route-${v}.AppImage`, note: 'AppImage – ausführbar machen und starten' }
  };
  const cfg = JSON.stringify({ base: RELEASE_BASE, files, releases: RELEASES_PAGE, version: v }).replace(/</g, '\\u003c');
  const appB64 = Buffer.from(appHtml, 'utf-8').toString('base64');
  // Handbücher (falls erzeugt: npm-unabhängig via scripts/build-manual.js) – stecken ebenfalls in der Seite
  const manual = (f) => {
    const fp = path.join(root, 'docs', f);
    return fs.existsSync(fp) ? fs.readFileSync(fp).toString('base64') : '';
  };
  const manualA4 = manual('My-Route-Handbuch-A4.pdf');
  const manualMobile = manual('My-Route-Handbuch-Mobil.pdf');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'; connect-src data: blob:; base-uri 'none'; form-action 'none'">
<meta name="theme-color" content="#050403">
<title>My Route – Download Vollversion</title>
<link rel="icon" type="image/png" href="${favicon}">
<style>
${css}
.dl-wrap { position: relative; z-index: 1; max-width: 980px; margin: 0 auto; padding: 36px 16px 70px; text-align: center; }
.dl-wrap .hero-logo { max-width: 340px; margin: 0 auto 10px; }
.dl-primary { margin: 22px auto 8px; }
.dl-primary .btn { font-size: 20px; padding: 18px 38px; }
.dl-note { color: var(--muted); margin: 8px 0 0; }
.dl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-top: 30px; text-align: left; }
.dl-grid .card h3 { margin-bottom: 4px; }
.dl-grid .btn { margin-top: 12px; display: inline-block; text-decoration: none; }
.dl-foot { color: var(--muted); font-size: 13px; margin-top: 34px; }
a.btn { text-decoration: none; display: inline-block; }
</style>
</head>
<body>
<div class="bg-glow" aria-hidden="true"></div>
<main class="dl-wrap">
  <div class="hero-logo-wrap tilt"><img class="hero-logo" src="${logo}" alt="IT-WORLD – IT Solutions"></div>
  <h1 class="hero-title gold3d">MY ROUTE</h1>
  <p class="hero-sub">IT SOLUTIONS</p>
  <p class="hero-text" style="margin-left:auto;margin-right:auto">Deine Lieblingswege, sicher aufgehoben – einmal speichern, mit einem Klick wieder losfahren. Hol dir jetzt die Vollversion.</p>

  <div class="dl-primary">
    <button class="btn go" id="dl-main">Vollversion herunterladen</button>
    <p class="dl-note" id="dl-detect"></p>
  </div>

  <div class="card dl-steps tilt-soft" id="dl-steps" style="margin:26px auto 0;max-width:640px;text-align:left"></div>

  <div class="dl-grid" id="dl-grid"></div>
  <p class="dl-foot">Die Browser-Vollversion ist eine einzelne HTML-Datei: Doppelklick genügt, sie läuft auf Windows, macOS, Linux, Android und iOS und braucht keine Installation. Deine Daten bleiben auf deinem Gerät.</p>
</main>
<script>
(function () {
  var CFG = ${cfg};
  var APP_B64 = "${appB64}";
  var PDF_A4 = "${manualA4}";
  var PDF_MOBILE = "${manualMobile}";

  function saveB64(b64, type, name) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([bytes], { type: type }));
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function saveApp() { saveB64(APP_B64, 'text/html', 'My-Route-Vollversion.html'); }

  var ua = navigator.userAgent || '';
  var plat = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) ? 'ios'
    : /Windows/i.test(ua) ? 'win' : /Mac/i.test(ua) ? 'mac' : /Linux|X11/i.test(ua) ? 'linux' : 'other';
  var names = { android: 'Android', ios: 'iPhone/iPad', win: 'Windows', mac: 'macOS', linux: 'Linux', other: 'deinem Gerät' };
  var main = document.getElementById('dl-main');
  var detect = document.getElementById('dl-detect');
  var grid = document.getElementById('dl-grid');

  function link(href, text, cls) {
    var a = document.createElement('a');
    a.className = cls; a.href = href; a.rel = 'noopener'; a.textContent = text;
    return a;
  }
  function card(title, note, el) {
    var c = document.createElement('div'); c.className = 'card tilt-soft';
    var h = document.createElement('h3'); h.textContent = title;
    var p = document.createElement('p'); p.className = 'card-meta'; p.textContent = note;
    c.appendChild(h); c.appendChild(p); c.appendChild(el);
    return c;
  }

  // Immer verfügbar: die Vollversion als HTML-Datei (steckt komplett in dieser Seite)
  var htmlBtn = document.createElement('button');
  htmlBtn.className = 'btn small'; htmlBtn.textContent = 'HTML herunterladen'; htmlBtn.addEventListener('click', saveApp);
  grid.appendChild(card('Alle Geräte · Browser-Vollversion', 'Eine Datei, Doppelklick genügt – auch für Android & iOS.', htmlBtn));

  [['win', 'win'], ['macArm', 'mac'], ['macIntel', 'mac'], ['linux', 'linux'], ['android', 'android']].forEach(function (pair) {
    var f = CFG.files[pair[0]];
    grid.appendChild(card(f.label, f.note, link(CFG.base + f.file, 'Installer laden', 'btn small')));
  });

  var desktop = { win: 'win', linux: 'linux', android: 'android' }[plat];
  if (desktop) {
    var f = CFG.files[desktop];
    main.textContent = 'Für ' + names[plat] + ' herunterladen';
    main.addEventListener('click', function () { window.location.href = CFG.base + f.file; });
    detect.textContent = 'Wir haben ' + names[plat] + ' erkannt. ' + (plat === 'android' ? 'Die APK nach dem Laden öffnen und die Installation bestätigen – oder ohne Installation die Browser-Vollversion nutzen.' : 'Lieber ohne Installation? Unten findest du die Browser-Vollversion.');
  } else if (plat === 'mac') {
    main.textContent = 'Für macOS herunterladen';
    main.addEventListener('click', function () { window.location.href = CFG.base + CFG.files.macArm.file; });
    detect.textContent = 'macOS erkannt – das ist der Installer für Apple-Silicon-Macs. Ältere Intel-Macs wählen unten „macOS · Intel“.';
  } else {
    main.textContent = 'Vollversion jetzt herunterladen';
    main.addEventListener('click', saveApp);
    detect.textContent = (plat === 'other' ? '' : names[plat] + ' erkannt. ') + 'Die Vollversion läuft direkt im Browser – ohne Installation.';
  }

  // Benutzerhandbuch (A4 & Mobil) – steckt in dieser Seite, 1 Klick genügt
  if (PDF_A4) {
    var hb = document.createElement('div'); hb.className = 'row';
    var b1 = document.createElement('button'); b1.className = 'btn small'; b1.textContent = 'Handbuch A4 (PDF)'; b1.addEventListener('click', function () { saveB64(PDF_A4, 'application/pdf', 'My-Route-Handbuch-A4.pdf'); });
    var b2 = document.createElement('button'); b2.className = 'btn small ghost'; b2.textContent = 'Handbuch fürs Handy (PDF)'; b2.addEventListener('click', function () { saveB64(PDF_MOBILE, 'application/pdf', 'My-Route-Handbuch-Mobil.pdf'); });
    hb.appendChild(b1); hb.appendChild(b2);
    grid.appendChild(card('Benutzerhandbuch', 'Leicht verständlich, mit Beispielbildern – für Druck und Handy.', hb));
  }

  // Installation in 3 Schritten – passend zum erkannten Gerät
  var STEPS = {
    win: ['Auf „Für Windows herunterladen“ klicken.', 'Die Datei „My-Route-Setup“ öffnen – ggf. bei der Windows-Meldung „Weitere Informationen → Trotzdem ausführen“ wählen.', 'My Route startet automatisch, ein Symbol liegt auf dem Desktop.'],
    mac: ['Auf „Für macOS herunterladen“ klicken (Intel-Mac: unten „macOS · Intel“).', 'Die .dmg-Datei öffnen und My Route in „Programme“ ziehen.', 'Beim ersten Start Rechtsklick → „Öffnen“ wählen und bestätigen.'],
    linux: ['Auf „Für Linux herunterladen“ klicken.', 'Die .AppImage-Datei per Rechtsklick → Eigenschaften → „Ausführbar“ machen (oder: chmod +x).', 'Doppelklick – My Route startet.'],
    android: ['Auf „Für Android herunterladen“ klicken und die APK öffnen.', 'Die Meldung „Installation aus dieser Quelle“ einmalig erlauben.', 'Auf „Installieren“ tippen – My Route erscheint auf dem Startbildschirm.'],
    ios: ['Auf „Vollversion jetzt herunterladen“ tippen und die Datei öffnen.', 'Im Teilen-Menü „Zum Home-Bildschirm“ wählen.', 'My Route liegt jetzt wie eine App auf dem Startbildschirm.'],
    other: ['Auf „Vollversion jetzt herunterladen“ klicken.', 'Die Datei „My-Route-Vollversion.html“ per Doppelklick öffnen.', 'Fertig – alles läuft direkt im Browser.']
  };
  var stepsBox = document.getElementById('dl-steps');
  var list = STEPS[plat] || STEPS.other;
  var ol = document.createElement('ol'); ol.className = 'howto';
  list.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ol.appendChild(li); });
  var h3 = document.createElement('h3'); h3.textContent = 'So installierst du My Route – in 3 Schritten';
  stepsBox.appendChild(h3); stepsBox.appendChild(ol);

  document.addEventListener('mousemove', function (e) {
    var el = e.target.closest && e.target.closest('.tilt, .tilt-soft');
    document.querySelectorAll('.tilt, .tilt-soft').forEach(function (n) { if (n !== el) { n.style.removeProperty('--rx'); n.style.removeProperty('--ry'); } });
    if (!el) return;
    var r = el.getBoundingClientRect(), max = el.classList.contains('tilt-soft') ? 2.5 : 6;
    el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 2 * max + 'deg');
    el.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 2 * max + 'deg');
  });
})();
</script>
</body>
</html>
`;
}

fs.mkdirSync(outDir, { recursive: true });
const app = buildApp();
fs.writeFileSync(path.join(outDir, 'My-Route-Vollversion.html'), app);
fs.writeFileSync(path.join(outDir, 'My-Route-Download.html'), buildDownloadPage(app));
fs.mkdirSync(path.join(root, 'android-web'), { recursive: true });
fs.writeFileSync(path.join(root, 'android-web', 'index.html'), app);
console.log('Fertig:', fs.readdirSync(outDir).map((f) => f + ' (' + Math.round(fs.statSync(path.join(outDir, f)).size / 1024) + ' KB)').join(', '));
