// Erzeugt Logo und alle HTML-Seiten. Aufruf: node build.mjs
import { writeFileSync } from 'node:fs';
const TODO = '<p class="todo">Dieser Inhalt wird ergänzt.</p>';

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
  ['verein.html', 'Der Verband'], ['nea.html', 'Unsere Nachrichten'], ['tanzgruppe.html', 'Tanzabteilung'],
  ['thraki.html', 'Thrakien', [['thraki.html', 'Thrakien'], ['trachten.html', 'Traditionelle Kostüme'], ['taenze.html', 'Traditionelle Tänze'],
    ['instrumente.html', 'Traditionelle Musikinstrumente'], ['geschichte.html', 'Geschichte'], ['physiognomie.html', 'Physiognome von Thrakien'], ['befreiung.html', 'Befreiung von Thraz']]],
  ['korona.html', 'Die Corona'], ['kontakt.html', 'Kommunikation'],
  ['filoi.html', 'Freunde der Tradition'], ['nutzung.html', 'Nutzungsbedingungen'], ['datenschutz.html', 'Datenschutz'],
];
const parent = { 'ensemble-gross.html': 'tanzgruppe.html', 'ensemble-mittel.html': 'tanzgruppe.html', 'ensemble-klein.html': 'tanzgruppe.html',
  'trachten.html': 'thraki.html', 'taenze.html': 'thraki.html', 'instrumente.html': 'thraki.html', 'geschichte.html': 'thraki.html',
  'physiognomie.html': 'thraki.html', 'befreiung.html': 'thraki.html', 'impressum.html': 'kontakt.html' };
const tiles = l => `<div class="grid">${l.map(([h, t]) => `<a class="tile" href="${h}"><h3>${t}</h3></a>`).join('')}</div>`;
const card = t => `<div class="card reveal">${t}</div>`;

const slides = [
  ['ΠΑΡΑΔΟΣΙΑΚΟΙ ΧΟΡΟΙ', 'Η Θράκη έχει να μας παρουσιάσει ένα δικό της ξεχωριστό και πολύ χαρακτηριστικό μάλιστα μουσικοχορευτικό ύφος και χρώμα, πράγμα που το διαπιστώνουμε όταν βλέπουμε τους υπέροχους Θρακιώτικους χορούς να χορεύονται.', 'tanzgruppe.html'],
  ['Trachten', 'Die farbenfrohen Trachten Thrakiens, mit Stickereien und Westen, werden bei jedem Auftritt getragen.', 'trachten.html'],
  ['Tänze', 'Thrakische Tänze in ihrer ursprünglichen Form, gemeinsam getanzt und weitergegeben.', 'taenze.html'],
  ['Instrumente', 'Musik und Instrumente, die den Tanz begleiten und Thrakien zum Klingen bringen.', 'instrumente.html'],
  ['Geschichte', 'Die Geschichte Thrakiens und des Vereins in Stuttgart.', 'geschichte.html'],
  ['Tanzgruppe', 'Über 50 Tänzerinnen und Tänzer proben einmal pro Woche.', 'tanzgruppe.html'],
];
const home = `<section class="slider" aria-roledescription="carousel" aria-label="Bildergalerie">
${slides.map((s, i) => `<figure class="slide s${i + 1}" role="group" aria-label="${i + 1} von 6"><figcaption class="cap"><h2>${s[0]}</h2><p>${s[1]}</p><a class="more" href="${s[2]}">Μάθετε περισσότερα →</a></figcaption></figure>`).join('\n')}
<div class="ctrl"><button id="pp" type="button" aria-label="Pause">❚❚</button><button id="prev" type="button" aria-label="Zurück">‹</button><button id="next" type="button" aria-label="Weiter">›</button><span id="cnt">1 / 6</span></div></section>`;

const trachten = `<div class="prose">
<figure class="karte"><img src="img/trachten-karte.jpg" alt="Karte Thrakiens mit den traditionellen Trachten der einzelnen Orte" width="888" height="840"></figure>
<p>Lokale Kleidung ist ein Element der Tradition und Kultur, das von Generation zu Generation weitergegeben wird. Jedes Kleidungsstück besitzt bestimmte Merkmale, die von den Bräuchen und Traditionen des jeweiligen Herkunftsortes zeugen.</p>
<p>Der Verein besitzt Trachten aus fast ganz Thrakien, insbesondere aus der Evros-Region. Diese unschätzbaren Trachten vermitteln den Menschen ein Gefühl von Lebendigkeit und Begeisterung für die …</p>
<h2>Traditionelles Bannerkostüm</h2>
<div class="rot" id="rot" data-base="img/trachten-360-" role="group" aria-label="Traditionelles Bannerkostüm in 360 Grad" tabindex="0">
<div class="rot-view"><img id="rot-img" src="img/trachten-360-01.jpg" alt="Tracht der Frauen aus Lavara, Seitenansicht" width="888" height="664" draggable="false"></div>
<div class="rot-ctrl"><button type="button" id="rot-l" aria-label="Nach links drehen">‹</button><button type="button" id="rot-r" aria-label="Nach rechts drehen">›</button><button type="button" id="rot-z" aria-label="Vergrößern">+</button><button type="button" id="rot-a" aria-label="Automatisch drehen">⟳</button></div></div>
<p>Die <strong>Tracht der Frauen</strong> im Dorf Lavara ist deutlich vom benachbarten Soufli beeinflusst. Charakteristisch für die Kleidung ist der Kaftan, ein langes, ärmelloses Kleid mit dreieckiger Öffnung im Brustbereich. Das Oberteil ist eng anliegend und weitet sich ab der Taille, wobei …</p>
<p class="todo">Der restliche Text und die weiteren Ansichten folgen.</p></div>`;
const pages = {
  'verein.html': ['Der Verband', TODO],
  'nea.html': ['Unsere Nachrichten', TODO],
  'tanzgruppe.html': ['Tanzabteilung', card('<p>Ziel der Tanzgruppe ist es, traditionelle thrakische Tänze in ihrer ursprünglichen Form zu lehren und aufzuführen. Über 50 Tänzerinnen und Tänzer gehören dazu. Geprobt wird einmal pro Woche unter der Leitung von Tanzlehrer Charalampos Almpantis, der die Gruppe Anfang 2014 übernommen hat.</p>') +
    tiles([['ensemble-gross.html', 'Großes Ensemble'], ['ensemble-mittel.html', 'Mittleres Ensemble'], ['ensemble-klein.html', 'Kleines Ensemble']]) + TODO],
  'thraki.html': ['Thrakien', tiles([['trachten.html', 'Trachten'], ['taenze.html', 'Tänze'], ['instrumente.html', 'Instrumente'], ['geschichte.html', 'Geschichte']]) + TODO],
  'korona.html': ['Die Corona', TODO],
  'kontakt.html': ['Kommunikation', card('<p class="todo">Platzhalter: Kontaktdaten des Vereins (Anschrift, E-Mail, Telefon). Bewusst kein Formular, damit keine Daten verarbeitet werden.</p>') + tiles([['impressum.html', 'Impressum']])],
  'filoi.html': ['Freunde der Tradition', TODO],
  'nutzung.html': ['Nutzungsbedingungen', TODO],
  'ensemble-gross.html': ['Großes Ensemble', TODO], 'ensemble-mittel.html': ['Mittleres Ensemble', TODO], 'ensemble-klein.html': ['Kleines Ensemble', TODO],
  'trachten.html': ['Traditionelle Kostüme', trachten], 'taenze.html': ['Traditionelle Tänze', TODO],
  'instrumente.html': ['Traditionelle Musikinstrumente', TODO], 'geschichte.html': ['Geschichte', TODO], 'physiognomie.html': ['Physiognome von Thrakien', TODO], 'befreiung.html': ['Befreiung von Thraz', TODO],
  'impressum.html': ['Impressum', card('<p><strong>Angaben gemäß § 5 DDG</strong></p><p class="todo">Platzhalter: Vereinsname (Θρακικός Πολιτιστικός Σύλλογος Στουτγάρδης / Thrakischer Kulturverein Stuttgart e.V.), Anschrift, Vertretungsberechtigte, Registernummer, Kontakt. Vom Verein ausfüllen und rechtlich prüfen lassen.</p>')],
  'datenschutz.html': ['Datenschutzerklärung', card(`<h2>1. Verantwortlicher</h2><p class="todo">Platzhalter: Name und Anschrift des Vereins, E-Mail.</p>
<h2>2. Hosting und Server-Logs</h2><p>Beim Aufruf verarbeitet der Hoster technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer, stabiler Betrieb). Speicherdauer: <span class="todo">Platzhalter laut Hoster-Vertrag</span>.</p>
<h2>3. Keine Cookies, kein Tracking</h2><p>Diese Seite setzt keine Cookies, nutzt keine Analyse- oder Werbedienste und bindet keine externen Inhalte (Schriften, Karten, Videos, Skripte) ein. Die Social-Media-Symbole sind einfache Links ohne Einbindung; erst beim Anklicken verlassen Sie diese Seite.</p>
<h2>4. Ihre Rechte</h2><p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch (Art. 15–21 DSGVO) sowie Beschwerde bei einer Aufsichtsbehörde, z. B. dem Landesbeauftragten für den Datenschutz Baden-Württemberg.</p>
<p class="todo">Vorlage – vor Veröffentlichung rechtlich prüfen lassen. Werden Formulare, Videos oder Karten ergänzt, muss der Text erweitert werden.</p>`)],
};
const ico = {
  f: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21z"/></svg>',
  g: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11v2.4h3.4c-.2 1-1.2 2.9-3.4 2.9a3.7 3.7 0 010-7.4c1.2 0 2 .5 2.4 1l1.7-1.6A6.1 6.1 0 009 6.6a6.2 6.2 0 100 12.4c3.6 0 5.9-2.5 5.9-6.1 0-.4 0-.7-.1-1zm11 0V9.3h-1.6V11h-1.7v1.6h1.7v1.7H20v-1.7h1.7V11z"/></svg>',
  i: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zm0 2a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2zm5 2.6a4.4 4.4 0 110 8.8 4.4 4.4 0 010-8.8zm0 2a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8zm4.6-3.2a1 1 0 110 2 1 1 0 010-2z"/></svg>',
  y: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2C2 8.800 2 12 2 12s0 3.200.4 4.800a2.500 2.500 0 001.800 1.800C5.800 19 12 19 12 19s6.200 0 7.800-.4a2.500 2.500 0 001.800-1.800C22 15.200 22 12 22 12s0-3.200-.4-4.800zM10 15V9l5.200 3z"/></svg>',
};
const social = [['f', 'Facebook'], ['g', 'Google+'], ['i', 'Instagram'], ['y', 'YouTube']];
const socialHtml = `${social.map(([k, n]) => `<a href="kontakt.html" title="${n}" aria-label="${n}">${ico[k]}</a>`).join('')}`;
const partner = `<section class="sponsors" aria-label="Unsere Partner">${[1, 2, 3, 4].map(n => `<img src="img/partner-${n}.jpg" alt="Partner ${n}" loading="lazy">`).join('')}</section>`;
const render = (file, title, body, isHome) => {
  const cur = parent[file] || file;
  const items = nav.map(([h, t, sub]) => {
    const open = sub && cur === h;
    const subHtml = open ? `<ul class="sub">${sub.map(([sh, st]) => `<li><a href="${sh}"${sh === file ? ' aria-current="page"' : ''}>${st}</a></li>`).join('')}</ul>` : '';
    return `<li${open ? ' class="open"' : ''}><a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${t}</a>${subHtml}</li>`;
  }).join('');
  const lang = 'de';
  const main = isHome ? body : `<div class="page"><h1>${title}</h1>${body}${partner}<footer class="foot"><p class="copy">© 2019 - Thrakischer Kulturverein in Stuttgart e.V</p><div class="social foot-social">${socialHtml}</div><p class="legal"><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></p></footer></div>`;
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
<div class="social">${socialHtml}</div></aside>
<main class="stage" id="inhalt">${main}</main>
<button class="totop" id="totop" type="button" aria-label="Nach oben" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 9h-5v9H9v-9H4z"/></svg></button></body></html>
`);
};
render('index.html', '', home, true);
for (const [f, [t, b]] of Object.entries(pages)) render(f, t, b, false);
