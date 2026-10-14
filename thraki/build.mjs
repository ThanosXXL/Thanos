// Erzeugt Logo und alle HTML-Seiten. Aufruf: node build.mjs
import { writeFileSync } from 'node:fs';
const TODO = '<p class="todo">Platzhalter – Originaltext von thraki.de hier einfügen (in <code>build.mjs</code>).</p>';

// Lorbeerkranz-Logo (eigene Zeichnung, weiß auf Transparent)
const leaves = [];
for (let k = 0; k < 2; k++) for (let i = 0; i < 15; i++) {
  const a = (-70 + i * 10) * Math.PI / 180, side = k ? 1 : -1;
  const x = 100 + side * 70 * Math.cos(a) * 0.95, y = 100 + 70 * Math.sin(a) * -1 + 8;
  leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4" ry="10" transform="rotate(${(side * (i * 10 - 10)).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
}
writeFileSync('img/logo.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="g" cx="35%" cy="30%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e9d9d3"/></radialGradient></defs>
<circle cx="100" cy="100" r="92" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
<g fill="url(#g)">${leaves.join('')}</g>
<path fill="url(#g)" d="M62 92c6-12 18-14 26-10 8-8 22-10 34-4 10 4 18 2 24 8-2 8-10 12-18 12-10 2-12 10-24 12-12 2-18-6-28-4-8 0-16-6-14-14z"/></svg>`);

const nav = [
  ['verein.html', 'Ο ΣΥΛΛΟΓΟΣ'], ['nea.html', 'ΤΑ ΝΕΑ ΜΑΣ'], ['tanzgruppe.html', 'ΧΟΡΕΥΤΙΚΟ ΤΜΗΜΑ'],
  ['thraki.html', 'ΘΡΑΚΗ'], ['korona.html', 'Η ΚΟΡΩΝΑ'], ['kontakt.html', 'ΕΠΙΚΟΙΝΩΝΙΑ'],
  ['filoi.html', 'ΦΙΛΟΙ ΤΗΣ ΠΑΡΑΔΟΣΗΣ'], ['nutzung.html', 'ΟΡΟΙ ΧΡΗΣΗΣ'], ['datenschutz.html', 'DATENSCHUTZ'],
];
const parent = { 'ensemble-gross.html': 'tanzgruppe.html', 'ensemble-mittel.html': 'tanzgruppe.html', 'ensemble-klein.html': 'tanzgruppe.html',
  'trachten.html': 'thraki.html', 'taenze.html': 'thraki.html', 'instrumente.html': 'thraki.html', 'geschichte.html': 'thraki.html', 'impressum.html': 'kontakt.html' };
const tiles = l => `<div class="grid">${l.map(([h, t]) => `<a class="tile" href="${h}"><h3>${t}</h3></a>`).join('')}</div>`;
const card = t => `<div class="card reveal">${t}</div>`;

const slides = [
  ['ΠΑΡΑΔΟΣΙΑΚΟΙ ΧΟΡΟΙ', 'Η Θράκη έχει να μας παρουσιάσει ένα δικό της ξεχωριστό και πολύ χαρακτηριστικό μάλιστα μουσικοχορευτικό ύφος και χρώμα, πράγμα που το διαπιστώνουμε όταν βλέπουμε τους υπέροχους Θρακιώτικους χορούς να χορεύονται.', 'tanzgruppe.html'],
  ...[2, 3, 4, 5, 6].map(n => [`Platzhalter Bildtitel ${n}`, 'Platzhalter – Originaltext der Folie hier einfügen.', 'index.html']),
];
const home = `<section class="slider" aria-roledescription="carousel" aria-label="Bildergalerie">
${slides.map((s, i) => `<figure class="slide s${i + 1}" role="group" aria-label="${i + 1} von 6"><figcaption class="cap"><h2>${s[0]}</h2><p>${s[1]}</p><a class="more" href="${s[2]}">Μάθετε περισσότερα →</a></figcaption></figure>`).join('\n')}
<div class="ctrl"><button id="pp" type="button" aria-label="Pause">❚❚</button><button id="prev" type="button" aria-label="Zurück">‹</button><button id="next" type="button" aria-label="Weiter">›</button><span id="cnt">1 / 6</span></div></section>`;

const pages = {
  'verein.html': ['Ο Σύλλογος', TODO],
  'nea.html': ['Τα νέα μας', TODO],
  'tanzgruppe.html': ['Χορευτικό τμήμα', card('<p>Ziel der Tanzgruppe ist es, traditionelle thrakische Tänze in ihrer ursprünglichen Form zu lehren und aufzuführen. Über 50 Tänzerinnen und Tänzer gehören dazu. Geprobt wird einmal pro Woche unter der Leitung von Tanzlehrer Charalampos Almpantis, der die Gruppe Anfang 2014 übernommen hat.</p>') +
    tiles([['ensemble-gross.html', 'Großes Ensemble'], ['ensemble-mittel.html', 'Mittleres Ensemble'], ['ensemble-klein.html', 'Kleines Ensemble']]) + TODO],
  'thraki.html': ['Θράκη', tiles([['trachten.html', 'Trachten'], ['taenze.html', 'Tänze'], ['instrumente.html', 'Instrumente'], ['geschichte.html', 'Geschichte']]) + TODO],
  'korona.html': ['Η Κορώνα', TODO],
  'kontakt.html': ['Επικοινωνία', card('<p class="todo">Platzhalter: Kontaktdaten des Vereins (Anschrift, E-Mail, Telefon). Bewusst kein Formular, damit keine Daten verarbeitet werden.</p>') + tiles([['impressum.html', 'Impressum']])],
  'filoi.html': ['Φίλοι της παράδοσης', TODO],
  'nutzung.html': ['Όροι χρήσης', TODO],
  'ensemble-gross.html': ['Großes Ensemble', TODO], 'ensemble-mittel.html': ['Mittleres Ensemble', TODO], 'ensemble-klein.html': ['Kleines Ensemble', TODO],
  'trachten.html': ['Thrakische Trachten', TODO], 'taenze.html': ['Thrakische Tänze', TODO],
  'instrumente.html': ['Thrakische Instrumente', TODO], 'geschichte.html': ['Geschichte', TODO],
  'impressum.html': ['Impressum', card('<p><strong>Angaben gemäß § 5 DDG</strong></p><p class="todo">Platzhalter: Vereinsname (Θρακικός Πολιτιστικός Σύλλογος Στουτγάρδης / Thrakischer Kulturverein Stuttgart e.V.), Anschrift, Vertretungsberechtigte, Registernummer, Kontakt. Vom Verein ausfüllen und rechtlich prüfen lassen.</p>')],
  'datenschutz.html': ['Datenschutzerklärung', card(`<h2>1. Verantwortlicher</h2><p class="todo">Platzhalter: Name und Anschrift des Vereins, E-Mail.</p>
<h2>2. Hosting und Server-Logs</h2><p>Beim Aufruf verarbeitet der Hoster technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer, stabiler Betrieb). Speicherdauer: <span class="todo">Platzhalter laut Hoster-Vertrag</span>.</p>
<h2>3. Keine Cookies, kein Tracking</h2><p>Diese Seite setzt keine Cookies, nutzt keine Analyse- oder Werbedienste und bindet keine externen Inhalte (Schriften, Karten, Videos, Skripte) ein. Die Social-Media-Symbole sind einfache Links ohne Einbindung; erst beim Anklicken verlassen Sie diese Seite.</p>
<h2>4. Ihre Rechte</h2><p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch (Art. 15–21 DSGVO) sowie Beschwerde bei einer Aufsichtsbehörde, z. B. dem Landesbeauftragten für den Datenschutz Baden-Württemberg.</p>
<p class="todo">Vorlage – vor Veröffentlichung rechtlich prüfen lassen. Werden Formulare, Videos oder Karten ergänzt, muss der Text erweitert werden.</p>`)],
};
const social = [['f', 'Facebook'], ['g+', 'Google+'], ['ig', 'Instagram'], ['yt', 'YouTube']];
const render = (file, title, body, isHome) => {
  const cur = parent[file] || file;
  const items = nav.map(([h, t]) => `<li><a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${t}</a></li>`).join('');
  const lang = /^(datenschutz|impressum)/.test(file) ? 'de' : 'el';
  const main = isHome ? body : `<div class="page"><h1>${title}</h1>${body}<footer><a href="downloads.html">Downloads</a><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></footer></div>`;
  writeFileSync(file, `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${isHome ? 'Θρακικός Πολιτιστικός Σύλλογος Στουτγάρδης' : title + ' – Thraki Stuttgart'}</title>
<meta name="description" content="Θρακικός Πολιτιστικός Σύλλογος Στουτγάρδης – Thrakischer Kulturverein Stuttgart e.V.">
<meta name="referrer" content="no-referrer"><link rel="stylesheet" href="css/style.css"><script src="js/main.js" defer></script></head>
<body><a class="skip" href="#inhalt">Zum Inhalt springen</a>
<aside class="side"><a href="index.html"><img class="logo" src="img/logo.svg" alt="Logo Thrakischer Kulturverein Stuttgart"></a>
<a class="brand" href="index.html">ΘΡΑΚΙΚΟΣ ΠΟΛΙΤΙΣΤΙΚΟΣ<br>ΣΥΛΛΟΓΟΣ ΣΤΟΥΤΓΑΡΔΗΣ</a>
<button class="menu-btn" aria-expanded="false" aria-controls="nav">☰ Menü</button>
<nav aria-label="Hauptnavigation"><ul class="nav" id="nav">${items}</ul></nav>
<div class="social">${social.map(([s, n]) => `<a href="kontakt.html" title="${n}" aria-label="${n} (Platzhalter-Link)">${s}</a>`).join('')}</div></aside>
<main class="stage" id="inhalt">${main}</main></body></html>
`);
};
render('index.html', '', home, true);
for (const [f, [t, b]] of Object.entries(pages)) render(f, t, b, false);
