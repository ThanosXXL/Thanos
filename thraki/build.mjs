// Erzeugt alle HTML-Seiten. Aufruf: node build.mjs
import { writeFileSync } from 'node:fs';
const TODO = '<p class="todo">Platzhalter – Originaltext von thraki.de hier einfügen (in <code>build.mjs</code>).</p>';
const nav = [
  ['index.html', 'Startseite'],
  ['sep', 'Ensembles'],
  ['ensemble-gross.html', 'Großes Ensemble'],
  ['ensemble-mittel.html', 'Mittleres Ensemble'],
  ['ensemble-klein.html', 'Kleines Ensemble'],
  ['sep', 'Thrakien'],
  ['trachten.html', 'Trachten'],
  ['taenze.html', 'Tänze'],
  ['instrumente.html', 'Instrumente'],
  ['geschichte.html', 'Geschichte'],
  ['sep', 'Verein'],
  ['tanzgruppe.html', 'Tanzgruppe'],
];
const pages = {
  'index.html': ['Willkommen beim Thrakischen Kulturverein Stuttgart', `<div class="hero"><p>Wir pflegen thrakische Tänze, Lieder und Bräuche – lebendig, gemeinsam und mit Freude.</p></div>
<div class="grid">${nav.filter(n => n[0] !== 'sep' && n[0] !== 'index.html').map(n => `<a class="tile" href="${n[0]}"><h3>${n[1]}</h3><p>Mehr erfahren →</p></a>`).join('')}</div>${TODO}`],
  'ensemble-gross.html': ['Großes Ensemble', TODO],
  'ensemble-mittel.html': ['Mittleres Ensemble', TODO],
  'ensemble-klein.html': ['Kleines Ensemble', TODO],
  'trachten.html': ['Thrakische Trachten', TODO],
  'taenze.html': ['Thrakische Tänze', TODO],
  'instrumente.html': ['Thrakische Instrumente', TODO],
  'geschichte.html': ['Geschichte', TODO],
  'tanzgruppe.html': ['Tanzgruppe', `<div class="card reveal"><p>Ziel der Gruppe ist es, traditionelle thrakische Tänze in ihrer ursprünglichen Form zu lehren und aufzuführen. Über 50 Tänzerinnen und Tänzer gehören dazu. Geprobt wird einmal pro Woche unter der Leitung von Tanzlehrer Charalampos Almpantis, der die Gruppe Anfang 2014 übernommen hat.</p></div>${TODO}`],
  'impressum.html': ['Impressum', `<div class="card"><p><strong>Angaben gemäß § 5 DDG</strong></p><p class="todo">Platzhalter: Vereinsname, Anschrift, Vertretungsberechtigte, Registernummer (Vereinsregister), Kontakt (E-Mail, Telefon). Bitte vom Verein ausfüllen und rechtlich prüfen lassen.</p></div>`],
  'datenschutz.html': ['Datenschutzerklärung', `<div class="card">
<h2>1. Verantwortlicher</h2><p class="todo">Platzhalter: Name und Anschrift des Vereins, E-Mail.</p>
<h2>2. Hosting und Server-Logs</h2><p>Beim Aufruf dieser Seite verarbeitet der Hoster technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (sicherer, stabiler Betrieb). Speicherdauer: <span class="todo">Platzhalter laut Hoster-Vertrag</span>.</p>
<h2>3. Keine Cookies, kein Tracking</h2><p>Diese Seite setzt keine Cookies, nutzt keine Analyse- oder Werbedienste und bindet keine externen Inhalte (Schriften, Karten, Videos, Skripte) ein. Alle Schriften und Dateien werden vom eigenen Server geliefert.</p>
<h2>4. Ihre Rechte</h2><p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie auf Beschwerde bei einer Aufsichtsbehörde, z. B. dem Landesbeauftragten für den Datenschutz Baden-Württemberg.</p>
<p class="todo">Hinweis: Vorlage – vor Veröffentlichung rechtlich prüfen lassen. Werden später Formulare, Videos oder Karten ergänzt, muss dieser Text erweitert werden.</p></div>`],
};
for (const [file, [title, body]] of Object.entries(pages)) {
  const items = nav.map(([h, t]) => h === 'sep' ? `<li class="sep">${t}</li>` :
    `<li><a href="${h}"${h === file ? ' aria-current="page"' : ''}>${t}</a></li>`).join('');
  writeFileSync(file, `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} – Thraki Stuttgart</title>
<meta name="description" content="Thrakischer Kulturverein Stuttgart – Tänze, Trachten, Instrumente und Geschichte Thrakiens.">
<meta name="referrer" content="no-referrer"><link rel="stylesheet" href="css/style.css"><script src="js/main.js" defer></script></head>
<body><a class="skip" href="#inhalt">Zum Inhalt springen</a>
<div class="layout"><aside class="side"><div class="logo" aria-hidden="true"></div>
<a class="brand" href="index.html">Θρακικός Πολιτιστικός Σύλλογος<small>Stuttgart</small></a>
<button class="menu-btn" aria-expanded="false" aria-controls="nav">☰ Menü</button>
<nav aria-label="Hauptnavigation"><ul class="nav" id="nav">${items}</ul></nav></aside>
<button class="music-btn" id="music" aria-pressed="false" title="Hintergrundmusik an/aus">♪ Musik</button>
<audio id="bgm" src="img/hintergrund.mp3" loop preload="none"></audio>
<main id="inhalt"><h1>${title}</h1>${body}
<footer><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></footer></main></div></body></html>
`);
}
