// Erzeugt die PDFs: Benutzerhandbuch und Fiverr-Angebot (Open Sans, Seitenzahl unten mittig, Copyright-Vermerk).
// Aufruf: node tools/build-pdf.js   (benötigt Playwright/Chromium und pdftotext)
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const BASE = path.resolve(__dirname, '..');
const ROOT = path.resolve(BASE, '..');
const WORK = process.env.WORK_DIR || '/tmp/itw-pdf';
const u = (p) => 'file://' + p;
const FONT = (f) => u(path.join(ROOT, 'renderer', 'fonts', f));
const LOGO = u(path.join(ROOT, 'build', 'icon.png'));
const SHOT = (n) => u(path.join(BASE, 'screens', n + '.png'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

// Preise und Pakete (Quelle für Angebot, Beschreibung und Handbuch)
const PREISE = { basic: '1.800', standard: '3.800', premium: '7.579' };
const INSTALL = { basic: 1, standard: 3, premium: 10 };

const CSS = `
@font-face{font-family:'Open Sans';font-weight:400;src:url('${FONT('OpenSans-Regular.ttf')}')}
@font-face{font-family:'Open Sans';font-weight:700;src:url('${FONT('OpenSans-Bold.ttf')}')}
@page{size:A4;margin:20mm 18mm 24mm 18mm;
  @bottom-center{content:"Seite " counter(page) " von " counter(pages);font-family:'Open Sans';font-weight:700;font-size:9.5pt;color:#8c6218}
  @bottom-left{content:"© 2026 IT-WORLD · Vervielfältigung untersagt";font-family:'Open Sans';font-size:7.5pt;color:#8b7b55;width:62mm}
  @bottom-right{content:"IT-WORLD Compliance-Assistent";font-family:'Open Sans';font-size:7.5pt;color:#8b7b55;width:62mm;text-align:right}}
@page:first{margin:0;@bottom-center{content:none}@bottom-left{content:none}@bottom-right{content:none}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:'Open Sans','Segoe UI',sans-serif;font-size:10pt;line-height:1.5;color:#2b2112}
.cover{width:210mm;height:297mm;background:radial-gradient(150mm 110mm at 70% 18%,rgba(227,185,76,.28),transparent 70%),#050403;color:#f3e6c8;text-align:center;position:relative;page-break-after:always;overflow:hidden}
.cover .tile{position:absolute;left:50mm;top:28mm;width:110mm;height:110mm;border-radius:6mm;overflow:hidden;border:.6mm solid rgba(240,200,100,.65);box-shadow:0 0 12mm rgba(227,185,76,.35)}
.cover .tile img{width:100%;height:100%;display:block}
.cover h1{position:absolute;left:0;right:0;top:152mm;margin:0;font-size:31pt;color:#f7dc84;line-height:1.15;text-shadow:0 .5mm 0 #d9a93e,0 1mm 0 #a67820,0 1.5mm 0 #6f4b10,0 2.5mm 3mm rgba(0,0,0,.7)}
.cover .sub{position:absolute;left:0;right:0;top:186mm;font-size:13pt;letter-spacing:.9mm;text-transform:uppercase}
.cover .ver{position:absolute;left:0;right:0;top:204mm;font-size:11pt;color:#d8c79c}
.cover .copy{position:absolute;left:14mm;right:14mm;bottom:14mm;font-size:8.5pt;color:#b5a27a;line-height:1.5}
h1{font-size:21pt;color:#3d2a0a;margin:0 0 6mm;padding-bottom:2.5mm;border-bottom:.8mm solid #d9a93e;page-break-before:always;page-break-after:avoid}
h1.first{page-break-before:auto}
h2{font-size:13.5pt;color:#8c6218;margin:7mm 0 2mm;page-break-after:avoid}
h3{font-size:11pt;color:#3d2a0a;margin:4mm 0 1mm;page-break-after:avoid}
p{margin:0 0 2.6mm;orphans:3;widows:3}
ul,ol{margin:0 0 3mm;padding-left:6mm}
li{margin-bottom:1mm}
figure{margin:3mm 0;page-break-inside:avoid;text-align:center}
figure img{width:100%;max-height:98mm;object-fit:contain;border:.35mm solid #c9ad66;border-radius:2mm;background:#050403;box-shadow:0 1mm 3mm rgba(60,40,8,.25)}
figure.small img{width:78%}
figcaption{font-size:8.5pt;color:#6e5f3d;margin-top:1.6mm;font-style:italic}
table{width:100%;border-collapse:collapse;margin:2mm 0 4mm;font-size:9.5pt;page-break-inside:auto}
th{background:#f4e6bd;text-align:left;padding:1.8mm 2.2mm;border:.3mm solid #d9c48a;color:#3d2a0a}
td{padding:1.8mm 2.2mm;border:.3mm solid #e3d6ae;vertical-align:top}
tr{page-break-inside:avoid}
table.keep{page-break-inside:avoid}
.box{margin:3mm 0 4mm;padding:3mm 4mm;border-left:1.4mm solid #d9a93e;background:#fbf4de;border-radius:1mm;page-break-inside:avoid}
.box b.t{display:block;color:#8c6218;margin-bottom:.8mm}
.box.warn{border-left-color:#c4432f;background:#fdf0ec}.box.warn b.t{color:#b03520}
.toc{list-style:none;padding:0;margin:0}
.toc li{display:flex;gap:2mm;margin:0;padding:.9mm 0}
.toc li.l1{font-weight:700;margin-top:2.2mm;color:#3d2a0a}
.toc li.l2{padding-left:6mm;font-size:9.8pt}
.toc .dots{flex:1;border-bottom:.3mm dotted #b9a36a;margin-bottom:1.4mm}
.pill{display:inline-block;padding:.3mm 2.4mm;border-radius:99px;background:#f0cc66;color:#2a1b04;font-weight:700;font-size:8.5pt}
.price{font-size:20pt;font-weight:700;color:#8c6218}
.pkg{border:.4mm solid #c9ad66;border-radius:2mm;padding:3.5mm 4.5mm;margin:3mm 0;page-break-inside:avoid;background:#fffdf6}
.pkg h3{margin:0 0 1mm;font-size:14pt;color:#3d2a0a}
.ck{color:#2f7a2b;font-weight:700}.no{color:#b3a780}
code,.mono{font-family:'Consolas','DejaVu Sans Mono',monospace;font-size:9.2pt;background:#f6efd9;padding:.2mm 1.2mm;border-radius:.8mm}
kbd{font-family:inherit;font-size:9pt;border:.3mm solid #c9ad66;background:#fbf4de;padding:0 1.6mm;border-radius:1mm}
`;

// ---------- Hilfsfunktionen für Inhalt und Inhaltsverzeichnis ----------

function makeDoc() {
  const toc = [];
  let figN = 0, idN = 0;
  return {
    toc,
    h1(t, first) { const id = 'k' + ++idN; toc.push({ l: 1, t, id }); return `<h1 id="${id}"${first ? ' class="first"' : ''}>${t}</h1>`; },
    h2(t) { const id = 'k' + ++idN; toc.push({ l: 2, t, id }); return `<h2 id="${id}">${t}</h2>`; },
    fig(file, cap, small) { figN++; return `<figure${small ? ' class="small"' : ''}><img src="${SHOT(file)}"><figcaption>Abbildung ${figN}: ${cap}</figcaption></figure>`; },
    box(kind, title, text) { return `<div class="box ${kind === 'warn' ? 'warn' : ''}"><b class="t">${title}</b>${text}</div>`; }
  };
}

function tocHtml(toc, pages) {
  return '<ul class="toc">' + toc.map((e) => `<li class="l${e.l}"><span>${e.t}</span><span class="dots"></span><span>${pages[e.id] || ''}</span></li>`).join('') + '</ul>';
}

function cover(titel, untertitel, ver) {
  return `<div class="cover"><div class="tile"><img src="${LOGO}"></div><h1>${titel}</h1><div class="sub">${untertitel}</div><div class="ver">${ver}</div>
  <div class="copy">© 2026 IT-WORLD. Alle Rechte vorbehalten. Vervielfältigung, Vermehrung, Kopieren und Weitergabe – auch auszugsweise – sind ohne schriftliche Zustimmung untersagt.</div></div>`;
}

const COPYRIGHT_PAGE = (d) => `${d.h1('Urheberrecht, Nutzungsrecht und Haftung')}
<div class="box"><b class="t">© 2026 IT-WORLD · Alle Rechte vorbehalten</b>
Dieses Dokument und die zugehörige Software „IT-WORLD Compliance-Assistent“ sind urheberrechtlich geschützt. <b>Vervielfältigung, Vermehrung, Kopieren, Weitergabe, Veröffentlichung, Verbreitung und Bearbeitung – auch auszugsweise und in jeder Form (Papier, Datei, Screenshot, Aufnahme) – sind ohne vorherige schriftliche Zustimmung von IT-WORLD untersagt.</b> Zuwiderhandlungen können zivil- und strafrechtlich verfolgt werden (u. a. §§ 97 ff., 106 ff. UrhG).</div>
<h2>Nutzungsrecht</h2>
<p>Mit dem Erwerb erhalten Sie ein einfaches, nicht übertragbares und nicht unterlizenzierbares Recht, die Software für Ihr eigenes Unternehmen zu nutzen. Die Anzahl der zulässigen Installationen richtet sich nach dem erworbenen Paket:</p>
<table><tr><th>Paket</th><th>Zulässige Installationen</th></tr>
<tr><td>Basic</td><td>${INSTALL.basic}</td></tr><tr><td>Standard</td><td>${INSTALL.standard}</td></tr><tr><td>Premium</td><td>${INSTALL.premium}</td></tr></table>
<p>Nicht gestattet sind insbesondere die Weitergabe oder der Weiterverkauf der Software, des Installationspakets oder dieses Handbuchs, das Bereitstellen auf Tauschbörsen, in öffentlichen Ordnern oder Foren, sowie das Zurückentwickeln (Reverse Engineering), soweit nicht zwingend gesetzlich erlaubt.</p>
<h2>Haftungsausschluss</h2>
<p>Der Compliance-Assistent ist eine <b>Orientierungs- und Dokumentationshilfe</b>. Er ersetzt weder eine Rechtsberatung noch eine Zertifizierung oder ein Audit und gibt keine Gewähr für Vollständigkeit oder rechtliche Wirksamkeit. Gesetzliche Vorgaben, Paragrafen und Fristen ändern sich; bitte lassen Sie verbindliche Entscheidungen durch Fachleute prüfen. Alle Abbildungen in diesem Handbuch zeigen <b>fiktive Beispieldaten</b> („Muster Maschinenbau GmbH“).</p>
<h2>Marken und Komponenten Dritter</h2>
<p>Windows, macOS, Linux, Outlook, Google Kalender und weitere genannte Namen sind Marken ihrer jeweiligen Inhaber. Die Software enthält Electron (MIT-Lizenz) und die Schrift Open Sans (SIL Open Font License 1.1).</p>`;

// ---------- Benutzerhandbuch ----------

function manualBody(d) {
  const t = (rows) => '<table>' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? `<th>${c}</th>` : `<td>${c}</td>`)).join('') + '</tr>').join('') + '</table>';
  return `
${d.h1('1 Willkommen und Voraussetzungen')}
<p>Der <b>IT-WORLD Compliance-Assistent</b> hilft kleinen und mittleren Unternehmen, die Anforderungen aus <b>NIS2</b>, <b>DSGVO</b> und <b>IT-Sicherheit</b> strukturiert abzuarbeiten, zu belegen und fristgerecht zu erfüllen: mit Checklisten, Nachweisen, Registern, Meldefristen und fertigen Berichten. Die Anwendung läuft komplett offline auf Ihrem Rechner; Ihre Daten verlassen ihn nie. Vorkenntnisse sind nicht nötig: Jede Anforderung erklärt, was zu tun ist und welche Nachweise typisch sind.</p>
${d.h2('1.1 Was Sie damit tun können')}
<ul>
<li><b>57 Anforderungen</b> aus NIS2, DSGVO und IT-Sicherheit mit Hilfetexten, Rechtsgrundlage und Nachweis-Tipps abarbeiten.</li>
<li><b>Nachweise</b> beschreiben und Dateien verknüpfen, <b>Fristen</b> und Wiedervorlagen setzen.</li>
<li><b>Register</b> führen: Verarbeitungsverzeichnis, Dienstleister und AV-Verträge, Betroffenenanfragen, Schulungen.</li>
<li><b>Meldefristen</b> bei Sicherheitsvorfällen und Datenpannen automatisch berechnen.</li>
<li><b>Dokumentvorlagen</b>, <b>Fristenkalender</b> (.ics), <b>PDF-Bericht</b> und <b>verschlüsselte Datensicherung</b>.</li>
</ul>
${d.h2('1.2 Systemvoraussetzungen')}
${t([['Komponente', 'Voraussetzung'],
  ['Betriebssystem', 'Windows 10 oder 11 (64 Bit) · macOS 12 oder neuer · Linux (64 Bit, aktuelle Distribution, AppImage)'],
  ['Arbeitsspeicher', 'mindestens 4 GB, empfohlen 8 GB'],
  ['Speicherplatz', 'ca. 500 MB für die Anwendung, wenige MB für Ihre Daten'],
  ['Bildschirm', 'mindestens 1280 × 720 Pixel (empfohlen 1920 × 1080)'],
  ['Internet', 'nicht erforderlich – die Anwendung blockiert Netzwerkzugriffe bewusst'],
  ['Rechte', 'Standardinstallation pro Benutzer; keine Administratorrechte erforderlich (Windows)'],
  ['PDF-Betrachter', 'beliebiger Betrachter für Berichte und dieses Handbuch']])}
${d.h2('1.3 Das sollten Sie bereithalten')}
<ul>
<li>Angaben zum Unternehmen: Branche, Anzahl Beschäftigte, Jahresumsatz und Bilanzsumme (für den NIS2-Betroffenheits-Check).</li>
<li>Namen der Verantwortlichen: Geschäftsleitung, IT/Informationssicherheit, Datenschutz.</li>
<li>Eine Liste Ihrer Dienstleister (Hosting, Cloud, IT-Support, Lohnbüro, Newsletter-Tool …) und typischen Verarbeitungstätigkeiten.</li>
<li>Vorhandene Nachweise (Richtlinien, Protokolle, Schulungslisten), die Sie verknüpfen möchten.</li>
</ul>

${d.h1('2 Installation und erster Start')}
${d.h2('2.1 Windows')}
<ol><li>Doppelklick auf die Installationsdatei (<code>.exe</code>) und den Anweisungen folgen.</li><li>Falls Windows SmartScreen warnt („Der Computer wurde durch Windows geschützt“): <b>Weitere Informationen → Trotzdem ausführen</b>. Das betrifft Installationsdateien ohne Code-Signatur.</li><li>Die Anwendung über das Startmenü oder die Desktop-Verknüpfung öffnen.</li></ol>
${d.h2('2.2 macOS')}
<ol><li>Die <code>.dmg</code>-Datei öffnen und das Symbol in den Ordner <b>Programme</b> ziehen.</li><li>Beim ersten Start mit <b>Rechtsklick → Öffnen</b> starten, falls Gatekeeper die Anwendung nicht freigibt.</li></ol>
${d.h2('2.3 Linux')}
<ol><li>Die <code>.AppImage</code>-Datei ausführbar machen: Rechtsklick → Eigenschaften → „Als Programm ausführen“ (oder <code>chmod +x</code>).</li><li>Doppelklick startet die Anwendung. Für AppImages muss FUSE installiert sein (bei aktuellen Distributionen meist vorhanden).</li></ol>
${d.h2('2.4 Erster Start und Datenablage')}
<p>Beim ersten Start öffnet sich die Übersicht ohne Daten. Ihre Eingaben werden automatisch in einer Datei im Benutzerprofil Ihres Betriebssystems gespeichert, nur lesbar für Ihren Benutzer. Der genaue Speicherort steht unter <b>Sicherheit &amp; Datenschutz</b>. Es gibt keine Anmeldung und kein Konto.</p>
${d.box('tip', 'Empfohlene erste Schritte', '1) Unternehmensprofil ausfüllen · 2) NIS2-Betroffenheit prüfen · 3) Verschlüsselung aktivieren · 4) Regelwerke Schritt für Schritt durchgehen.')}
${d.h2('2.5 Update und Deinstallation')}
<p>Zum Aktualisieren installieren Sie die neue Version einfach über die alte; Ihre Daten bleiben erhalten. Eine Deinstallation entfernt das Programm; die Datendatei bleibt bewusst bestehen und kann über <b>Sicherheit &amp; Datenschutz → Alle Daten sicher löschen</b> entfernt werden.</p>

${d.h1('3 Oberfläche und Navigation')}
${d.fig('01-uebersicht', 'Die Oberfläche: Seitenleiste links, Kopfzeile mit Suche, Inhaltsbereich rechts')}
${d.h2('3.1 Aufbau')}
<ul>
<li><b>Seitenleiste:</b> Logo und sechs Menügruppen – <i>Überblick, Regelwerke, Register, Betrieb, Berichte, Einstellungen</i>. Die Zahl in der Markierung zeigt Fortschritt in Prozent oder Handlungsbedarf (rot).</li>
<li><b>Kopfzeile:</b> Titel der Ansicht, Schnellsuche und Ihr Firmenname.</li>
<li><b>Inhaltsbereich:</b> Karten, Listen und Formulare der jeweiligen Ansicht.</li>
<li><b>Fußbereich der Seitenleiste:</b> Sperren (bei aktiver Verschlüsselung), Daten sichern, Sicherung laden.</li>
</ul>
${d.h2('3.2 Menüleiste')}
<p>Zusätzlich gibt es eine Menüleiste mit <b>Datei</b> (Sicherung, Bericht, Fristen-Export, Sperren), <b>Bearbeiten</b> (Standardbefehle, Suche), <b>Gehe zu</b> (alle Ansichten), <b>Ansicht</b> (Zoom, Vollbild) und <b>Hilfe</b>.</p>
${d.h2('3.3 Schnellsuche')}
<p>Mit <kbd>Strg</kbd>+<kbd>K</kbd> (macOS: <kbd>⌘</kbd>+<kbd>K</kbd>) oder dem Suchfeld oben öffnen Sie die Schnellsuche. Sie durchsucht Ansichten, alle Anforderungen, Register-Einträge, Vorfälle und Vorlagen. Mit den Pfeiltasten wählen, mit <kbd>Enter</kbd> springen.</p>
${d.fig('16-suche', 'Schnellsuche: Treffer aus Anforderungen, Registern und Vorlagen', true)}
${d.h2('3.4 Tastenkürzel')}
${t([['Kürzel', 'Funktion'], ['<kbd>Strg/⌘</kbd> + <kbd>K</kbd>', 'Suchen und springen'], ['<kbd>Strg/⌘</kbd> + <kbd>1</kbd> … <kbd>9</kbd>', 'Ansichten wechseln (Übersicht bis Schulungen)'], ['<kbd>Strg/⌘</kbd> + <kbd>S</kbd>', 'Datensicherung erstellen'], ['<kbd>Strg/⌘</kbd> + <kbd>O</kbd>', 'Datensicherung laden'], ['<kbd>Strg/⌘</kbd> + <kbd>P</kbd>', 'Bericht als PDF speichern'], ['<kbd>Strg/⌘</kbd> + <kbd>L</kbd>', 'Anwendung sperren'], ['<kbd>Esc</kbd>', 'Dialog schließen']])}

${d.h1('4 Übersicht')}
<p>Die Übersicht zeigt Ihren Compliance-Stand auf einen Blick.</p>
${d.fig('01-uebersicht', 'Übersicht mit Gesamtfortschritt, Regelwerken, Kennzahlen und nächsten Schritten')}
${t([['Bereich', 'Bedeutung'],
  ['Gesamtfortschritt', 'Gewichteter Erfüllungsgrad über alle Regelwerke: „Erledigt“ zählt 100 %, „In Arbeit“ 50 %, „Offen“ 0 %. „Nicht zutreffend“ bleibt unberücksichtigt.'],
  ['Drei Regelwerke', 'Fortschritt für NIS2, DSGVO und IT-Sicherheit mit Direktlink.'],
  ['Offene Anforderungen', 'Alle Anforderungen, die noch offen oder in Arbeit sind.'],
  ['Überfällige Termine', 'Fällige Aufgaben, Wiedervorlagen, Meldefristen und Prüftermine, deren Datum überschritten ist.'],
  ['Offene Meldefristen', 'Noch nicht erledigte Meldungen aus erfassten Vorfällen.'],
  ['Nachweisquote', 'Anteil der erledigten Anforderungen, für die ein Nachweis hinterlegt ist.'],
  ['Nächste Schritte', 'Offene Anforderungen mit hoher Priorität – ein Klick öffnet die Bearbeitung.'],
  ['Nächste Termine', 'Die nächsten Fristen aus allen Bereichen.'],
  ['Schutz Ihrer Daten', 'Zeigt, ob die Verschlüsselung aktiv ist, und bietet die Aktivierung an.']])}

${d.h1('5 Regelwerke und Anforderungen')}
${d.h2('5.1 NIS2: Betroffenheits-Check')}
<p>Ob die NIS2-Pflichten für Sie gelten, hängt von Sektor und Unternehmensgröße ab. Der Check am Anfang der NIS2-Ansicht wertet Ihre Angaben aus und ordnet Sie als <b>besonders wichtige Einrichtung</b>, <b>wichtige Einrichtung</b> oder <b>voraussichtlich nicht betroffen</b> ein.</p>
${d.fig('02-nis2-check', 'Betroffenheits-Check mit Ergebnis und Begründung')}
<ol><li>Tätigkeitssektor wählen.</li><li>Beschäftigte, Jahresumsatz und Bilanzsumme eintragen (Mio. €).</li><li>Falls zutreffend einen „besonderen Fall“ wählen (z. B. Betreiber Kritischer Anlagen).</li><li>Das Ergebnis erscheint sofort und wird automatisch gespeichert.</li></ol>
${d.box('warn', 'Wichtig', 'Der Check ist eine Orientierung. Verbundene Unternehmen und Partnerunternehmen werden bei der Größenermittlung zusammengerechnet. Lassen Sie die Einstufung bei Zweifeln rechtlich bestätigen.')}
${d.h2('5.2 NIS2, DSGVO und IT-Sicherheit')}
<p>Jedes Regelwerk besteht aus thematischen Gruppen mit Anforderungen. Jede Zeile zeigt Priorität, Rechtsgrundlage, Verantwortliche, Fälligkeit und den Nachweis-Status. Der farbige Balken links zeigt den Status: <b>grün</b> erledigt, <b>gelb</b> in Arbeit, <b>rot</b> offen, <b>grau</b> nicht zutreffend.</p>
${d.fig('03-dsgvo-liste', 'DSGVO-Anforderungen mit Status, Verantwortlichen und Fristen')}
${d.fig('05-itsicherheit', 'IT-Sicherheitsmaßnahmen mit Nachweisen', true)}
<ul><li><b>Schneller Statuswechsel:</b> über das Auswahlfeld rechts in der Zeile.</li><li><b>Filter:</b> Alle / Offen / In Arbeit / Erledigt / Nicht zutreffend über die Schaltflächen über der Liste.</li><li><b>Hinweis „Nachweis fehlt“:</b> erscheint, wenn eine Anforderung erledigt ist, aber kein Nachweis hinterlegt wurde.</li></ul>
${d.h2('5.3 Eine Anforderung bearbeiten')}
<p>Ein Klick auf eine Zeile öffnet den Bearbeitungsdialog. Oben stehen <b>„So gehen Sie vor“</b> und <b>„Typische Nachweise“</b>.</p>
${d.fig('04-anforderung-dialog', 'Bearbeitungsdialog mit Hilfetext, Status, Verantwortlichen, Fälligkeit und Nachweis')}
${t([['Feld', 'Verwendung'],
  ['Status', 'Offen, In Arbeit, Erledigt oder Nicht zutreffend.'],
  ['Verantwortlich', 'Name oder Rolle der zuständigen Person.'],
  ['Fällig bis', 'Frist; erscheint im Fristenkalender und auf der Übersicht.'],
  ['Wiedervorlage', 'Nach „Erledigt“ automatisch erneut prüfen: vierteljährlich, halbjährlich oder jährlich. Der Termin erscheint im Kalender.'],
  ['Nachweis (Beschreibung)', 'Welche Unterlagen liegen vor, wo sind sie abgelegt?'],
  ['Nachweis-Datei', 'Verknüpft eine Datei von Ihrem Rechner. Es wird nur der Pfad gespeichert; die Datei bleibt, wo sie ist. „Im Ordner zeigen“ öffnet den Speicherort.'],
  ['Notizen', 'Interne Hinweise und offene Punkte.']])}
${d.box('tip', 'Gut zu wissen', 'Verknüpfte Dateien werden nie ausgeführt oder kopiert. Netzwerkpfade (UNC) werden aus Sicherheitsgründen nicht geöffnet.')}

${d.h1('6 Register')}
<p>Register sind strukturierte Listen, die Sie fortlaufend pflegen. Alle vier funktionieren gleich: <b>+ Anlegen</b>, bearbeiten, löschen und durchsuchen. Einträge mit Handlungsbedarf tragen rote oder gelbe Markierungen.</p>
${d.h2('6.1 Verarbeitungsverzeichnis (Art. 30 DSGVO)')}
${d.fig('06-vvt', 'Verarbeitungsverzeichnis mit Markierungen für Drittland und besondere Datenkategorien')}
<p>Erfassen Sie je Verarbeitungstätigkeit Zweck, Rechtsgrundlage, betroffene Personen, Datenkategorien, Empfänger, Drittlandübermittlung, Löschfrist und Schutzmaßnahmen. Über <b>Aus Vorlage anlegen</b> starten Sie mit sieben typischen Tätigkeiten: Personalverwaltung, Kundenverwaltung, Website, Newsletter, Bewerbermanagement, Videoüberwachung und IT-Administration.</p>
<p>Automatische Markierungen warnen bei <b>Art. 9</b> (besondere Kategorien), <b>Drittland ohne Garantien</b>, <b>fehlender Rechtsgrundlage</b> und <b>überfälliger Prüfung</b>.</p>
${d.h2('6.2 Dienstleister und AV-Verträge')}
${d.fig('07-dienstleister', 'Dienstleister mit AV-Vertragsstatus, Standort und Risiko')}
<p>Dokumentieren Sie jeden Dienstleister mit Zugriff auf Daten oder Systeme: Leistung, Status des AV-Vertrags, Verarbeitungsstandort, Zertifikate (z. B. ISO 27001, BSI C5), Risiko und nächste Überprüfung. Das deckt die Auftragsverarbeitung (DSGVO) und die Lieferkettensicherheit (NIS2) ab. Markiert werden <b>fehlende AV-Verträge</b>, <b>Drittländer ohne Garantien</b> und überfällige Prüfungen.</p>
${d.h2('6.3 Betroffenenanfragen')}
${d.fig('08-anfragen', 'Betroffenenanfragen mit automatisch berechneter Frist', true)}
<p>Erfassen Sie Eingang, Art (Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit, Widerspruch, Widerruf) und Status. Die Frist beträgt <b>einen Monat</b> ab Eingang und lässt sich durch Haken bei „Fristverlängerung“ auf <b>drei Monate</b> setzen (Art. 12 Abs. 3 DSGVO). „Als beantwortet markieren“ schließt die Anfrage ab.</p>
${d.box('tip', 'Datensparsamkeit', 'Verwenden Sie ein Aktenzeichen oder Kürzel statt des Klarnamens der betroffenen Person.')}
${d.h2('6.4 Schulungen und Nachweise')}
${d.fig('09-schulungen', 'Schulungsnachweise mit Teilnehmerzahl und Wiederholungstermin', true)}
<p>Belegen Sie Awareness-Trainings, NIS2-Pflichtschulungen der Geschäftsleitung, Datenschutzschulungen und Notfallübungen mit Datum, Teilnehmenden, Ablageort des Nachweises und nächstem Wiederholungstermin.</p>

${d.h1('7 Fristen und Vorfälle')}
${d.h2('7.1 Fristenkalender')}
${d.fig('10-kalender', 'Fristenkalender: überfällig, nächste 7 Tage, nächste 30 Tage, später')}
<p>Der Kalender sammelt alle Termine: fällige Aufgaben, Wiedervorlagen, Meldefristen, Anfragen, Dienstleister- und VVT-Prüfungen sowie Schulungswiederholungen. Ein Klick springt zum jeweiligen Eintrag.</p>
<p><b>Export:</b> Mit <b>Als Kalenderdatei exportieren (.ics)</b> erzeugen Sie eine Datei, die Sie in Outlook, Google Kalender oder Apple Kalender importieren. Jeder Termin enthält eine Erinnerung am Vortag.</p>
${d.h2('7.2 Vorfälle und Meldefristen')}
${d.fig('11-vorfaelle', 'Vorfälle mit berechneten Meldefristen und Live-Countdown')}
<p>Erfassen Sie Sicherheitsvorfälle und Datenpannen sofort. Entscheidend ist der <b>Zeitpunkt der Kenntnis</b>: ab dann laufen die Fristen.</p>
${t([['Meldung', 'Frist'], ['NIS2: Frühwarnung an das BSI', '24 Stunden nach Kenntnis'], ['NIS2: Vorfallmeldung mit Erstbewertung', '72 Stunden nach Kenntnis'], ['NIS2: Abschlussbericht', '1 Monat nach der Vorfallmeldung'], ['DSGVO: Meldung an die Aufsichtsbehörde (Art. 33)', '72 Stunden nach Kenntnis']])}
${d.fig('12-vorfall-dialog', 'Vorfall erfassen: Art, Kenntnis-Zeitpunkt, Fristen und Maßnahmen', true)}
<ol><li><b>Vorfall erfassen</b> wählen, Titel, Art und Zeitpunkt der Kenntnis eintragen.</li><li>Die Fristen werden sofort berechnet und als Countdown angezeigt (grün, gelb unter 12 Stunden, rot überfällig).</li><li>Haken setzen, sobald eine Meldung abgegeben wurde.</li><li>Status auf <i>Gemeldet</i> bzw. <i>Abgeschlossen</i> setzen.</li></ol>
${d.box('warn', 'Wichtig', 'Ob ein Vorfall meldepflichtig („erheblich“, Risiko für Betroffene) ist, müssen Sie bewerten. Die Anwendung rechnet Fristen und dokumentiert; sie entscheidet nicht. Auch nicht gemeldete Datenpannen sollten dokumentiert werden (Art. 33 Abs. 5 DSGVO).')}

${d.h1('8 Dokumentvorlagen')}
${d.fig('13-vorlagen', 'Vorlagen mit Vorschau, Kopieren und Speichern')}
<p>Unter <b>Betrieb → Vorlagen</b> finden Sie elf Textvorlagen. Firmenname und Datum werden automatisch eingesetzt. Mit <b>Kopieren</b> legen Sie den Text in die Zwischenablage, mit <b>Als Datei speichern</b> erhalten Sie eine <code>.txt</code>-Datei.</p>
${t([['Gruppe', 'Vorlagen'], ['Meldungen', 'NIS2-Frühwarnung · NIS2-Vorfallmeldung und Abschlussbericht · DSGVO-Meldung an die Aufsichtsbehörde (Art. 33) · Benachrichtigung Betroffener (Art. 34)'], ['Betroffenenrechte', 'Antwort auf ein Auskunftsersuchen (Art. 15)'], ['Datenschutz', 'Verpflichtung der Beschäftigten · Checkliste AV-Vertrag (Art. 28) · Löschkonzept'], ['Richtlinien', 'Informationssicherheitsleitlinie · Incident-Response-Kurzplan · Passwort- und Zugriffsrichtlinie']])}
${d.box('tip', 'Hinweis', 'Prüfen Sie jede Vorlage und passen Sie sie an Ihre Situation an. Die Vorlagen sind Arbeitshilfen und keine Rechtsberatung.')}

${d.h1('9 Bericht, Export und Datensicherung')}
${d.fig('15-bericht', 'Bericht und Datensicherung')}
${d.h2('9.1 Compliance-Bericht')}
<p>Der Bericht fasst Ihren Stand für Geschäftsleitung, Kunden, Versicherer oder Auditoren zusammen: Deckblatt mit Logo, Gesamtfortschritt und Nachweisquote, alle Anforderungen mit Status, Verantwortlichen, Fristen und Nachweisen, die Register, die Vorfälle sowie die letzten Einträge des Änderungsprotokolls samt Integritätsprüfung.</p>
<ul><li><b>Als PDF speichern:</b> fertig zum Weitergeben (auch <kbd>Strg/⌘</kbd>+<kbd>P</kbd>).</li><li><b>Als HTML speichern:</b> einzelne Datei, im Browser lesbar.</li></ul>
${d.h2('9.2 Datensicherung und Wiederherstellung')}
<p><b>Daten sichern</b> erstellt eine JSON-Datei mit allen Eingaben, z. B. für den Gerätewechsel. <b>Sicherung laden</b> spielt sie zurück; vorher erfolgt eine Rückfrage, da die aktuellen Daten ersetzt werden. Ist die Verschlüsselung aktiv, wird auch die Sicherung verschlüsselt und beim Laden nach dem Passwort gefragt. Geladene Dateien werden vor der Übernahme geprüft und bereinigt.</p>
${d.box('warn', 'Achtung', 'Ohne aktivierte Verschlüsselung ist die Sicherungsdatei im Klartext lesbar. Bewahren Sie Sicherungen entsprechend sicher auf.')}

${d.h1('10 Sicherheit und Datenschutz')}
<p>Compliance-Daten enthalten sensible Informationen über Schwachstellen und Vorfälle. Der Bereich <b>Sicherheit &amp; Datenschutz</b> schützt sie.</p>
${d.h2('10.1 Verschlüsselung aktivieren')}
${d.fig('17-sicherheit-aktivieren', 'Verschlüsselung mit Passwort aktivieren')}
<ol><li>Passwort mit mindestens 10 Zeichen eingeben (empfohlen: Passphrase aus mehreren Wörtern) und wiederholen.</li><li><b>Verschlüsselung aktivieren</b> wählen.</li></ol>
<p>Die Daten werden danach mit AES-256-GCM verschlüsselt; der Schlüssel wird per scrypt aus Ihrem Passwort abgeleitet und nur im Arbeitsspeicher gehalten.</p>
${d.box('warn', 'Kein Zurücksetzen möglich', 'Es gibt keine Passwort-Wiederherstellung. Notieren Sie das Passwort sicher und legen Sie regelmäßig Datensicherungen an.')}
${d.h2('10.2 Sperren und Entsperren')}
${d.fig('19-sperrbildschirm', 'Sperrbildschirm', true)}
<p>Sperren Sie die Anwendung über <b>🔒 Sperren</b> oder <kbd>Strg/⌘</kbd>+<kbd>L</kbd>. Sie sperrt sich außerdem automatisch bei Inaktivität (einstellbar von 1 bis 60 Minuten oder aus) sowie bei Bildschirmsperre und Ruhezustand des Betriebssystems. Beim Sperren werden die Daten aus dem Arbeitsspeicher der Oberfläche entfernt. Nach Fehlversuchen steigt die Wartezeit bis zum nächsten Versuch.</p>
${d.h2('10.3 Passwort ändern, Verschlüsselung entfernen')}
${d.fig('18-sicherheit-aktiv', 'Verschlüsselung aktiv: Passwort ändern, sperren, entfernen')}
<p>Bei aktiver Verschlüsselung können Sie das Passwort ändern oder die Verschlüsselung (nach Eingabe des aktuellen Passworts) wieder entfernen. Außerdem legen Sie dort den <b>Benutzernamen für das Änderungsprotokoll</b> und die <b>Auto-Sperre</b> fest.</p>
${d.h2('10.4 Schutzmaßnahmen der Anwendung')}
<ul>
<li><b>Vollständig offline:</b> jede Netzwerkanfrage wird blockiert; keine Telemetrie, kein Auto-Update, keine Konten.</li>
<li><b>Abgeschottete Oberfläche:</b> Chromium-Sandbox, keine Popups, keine fremden Inhalte, strenge Inhaltsrichtlinie.</li>
<li><b>Geprüfte Daten:</b> jede Eingabe und jede importierte Sicherung wird vor dem Speichern per Whitelist geprüft und bereinigt.</li>
<li><b>Sichere Dateien:</b> atomares Schreiben, Zugriffsrechte nur für Ihren Benutzer, automatische Sicherungskopie.</li>
<li><b>Nachweisdateien:</b> nur als Pfad verknüpft, nie ausgeführt.</li>
</ul>
${d.h2('10.5 Datenschutzbeschreibung für Ihr Verzeichnis')}
<p>Unter <b>Datenschutzbeschreibung zur Übernahme</b> finden Sie einen fertigen Textbaustein, den Sie in Ihr Verarbeitungsverzeichnis und Ihre TOM-Dokumentation übernehmen können. Wichtig: Da die Anwendung vollständig lokal arbeitet, erhält IT-WORLD keine Ihrer Daten.</p>
${d.h2('10.6 Alle Daten sicher löschen')}
<p>Entfernt Unternehmensprofil, Bearbeitungsstände, Register, Vorfälle und Protokoll. Datei und Sicherungskopien werden vor dem Löschen überschrieben (Best Effort; bei SSDs zusätzlich die Festplattenverschlüsselung Ihres Betriebssystems nutzen). Zur Sicherheit müssen Sie das Wort <b>LÖSCHEN</b> eintippen. Von Ihnen erstellte Sicherungsdateien an anderen Orten bleiben bestehen.</p>

${d.h1('11 Änderungsprotokoll')}
${d.fig('14-protokoll', 'Änderungsprotokoll mit bestätigter Integrität')}
<p>Jede relevante Änderung (Statuswechsel, Nachweise, Register-Einträge, Vorfälle, Exporte, Einstellungen) wird mit Zeitstempel und Benutzername erfasst. Die Einträge sind kryptografisch (SHA-256) miteinander verkettet. Mit <b>Integrität prüfen</b> sehen Sie, ob das Protokoll lückenlos und unverändert ist; nachträgliche Änderungen oder Löschungen einzelner Einträge werden erkannt. Das unterstützt Ihre Rechenschaftspflicht (Art. 5 Abs. 2 DSGVO). Das Protokoll lässt sich als Textdatei speichern und erscheint im Bericht.</p>

${d.h1('12 Häufige Fragen')}
${t([['Frage', 'Antwort'],
  ['Ich habe mein Passwort vergessen.', 'Es gibt keine Wiederherstellung. Spielen Sie, falls vorhanden, eine Sicherung in einer neuen Installation ein – auch sie benötigt das Passwort. Ohne Passwort sind die Daten nicht lesbar.'],
  ['Wie ziehe ich auf einen neuen Rechner um?', 'Auf dem alten Rechner „Daten sichern“, auf dem neuen die Anwendung installieren und „Sicherung laden“.'],
  ['Können mehrere Personen gleichzeitig arbeiten?', 'Die Daten liegen lokal pro Benutzerprofil; einen gleichzeitigen Mehrbenutzerbetrieb gibt es nicht. Zur Zusammenarbeit geben Sie Datensicherungen oder PDF-Berichte weiter.'],
  ['Die Anwendung startet nicht.', 'Sie kann nur einmal gleichzeitig laufen – prüfen Sie, ob sie bereits geöffnet ist. Unter Linux muss für AppImages FUSE vorhanden sein.'],
  ['Windows oder macOS warnt beim Installieren.', 'Bei Installationsdateien ohne Code-Signatur ist das normal (siehe Kapitel 2). Laden Sie Installer nur aus der Ihnen mitgeteilten Quelle und vergleichen Sie bei Bedarf die Prüfsumme.'],
  ['Warum sind die Daten nicht in der Cloud?', 'Aus Datenschutzgründen: Ihre Compliance-Daten bleiben ausschließlich auf Ihrem Gerät.'],
  ['Ist die Anwendung eine Rechtsberatung oder ein Zertifikat?', 'Nein. Sie ist eine Orientierungs- und Dokumentationshilfe. Verbindliche Entscheidungen sollten Fachleute prüfen.'],
  ['Wo bekomme ich Hilfe?', 'Über die Nachrichtenfunktion Ihrer Bestellung auf Fiverr.']])}
<p style="margin-top:8mm;text-align:center;color:#6e5f3d">© 2026 IT-WORLD · Alle Rechte vorbehalten · Vervielfältigung und Weitergabe untersagt</p>`;
}

// ---------- Fiverr-Angebot ----------

function fiverrBody(d) {
  const ck = '<span class="ck">✔</span>', no = '<span class="no">–</span>';
  const rows = [
    ['Leistung', 'Basic', 'Standard', 'Premium'],
    ['Vollversion IT-WORLD Compliance-Assistent (NIS2, DSGVO, IT-Sicherheit, 57 Anforderungen)', ck, ck, ck],
    ['Installer für Windows, macOS und Linux', ck, ck, ck],
    ['Zulässige Installationen', INSTALL.basic, INSTALL.standard, INSTALL.premium],
    ['PDF-Benutzerhandbuch mit Beispielbildern', ck, ck, ck],
    ['Leistungs- und Funktionsbeschreibung', ck, ck, ck],
    ['Einrichtung: Unternehmensprofil, Betroffenheits-Check, Verschlüsselung', no, ck, ck],
    ['Vorbefüllung: Verarbeitungsverzeichnis aus Vorlagen und Dienstleisterliste', no, 'bis 5 Einträge', 'bis 15 Einträge'],
    ['Online-Einführung', no, '45 Minuten', 'Workshop 2 Stunden'],
    ['Individuelle Anpassungen (Firmenname und Logo in Bericht und Vorlagen, bis 10 angepasste Anforderungen/Vorlagen)', no, no, ck],
    ['Auswertung Ihres Ausfüllstands mit Maßnahmenliste als PDF', no, no, ck],
    ['Funktions-Updates während der Laufzeit', no, no, '2'],
    ['Support per Fiverr-Nachrichten', '30 Tage', '60 Tage', '6 Monate'],
    ['Lieferzeit', '1 Tag', '3 Tage', '7 Tage'],
    ['Überarbeitungen', '1', '2', '3'],
    ['Preis', `${PREISE.basic} €`, `${PREISE.standard} €`, `${PREISE.premium} €`]
  ];
  const tbl = '<table>' + rows.map((r, i) => '<tr>' + r.map((c, j) => (i === 0 ? `<th>${c}</th>` : `<td${j === 0 ? '' : ' style="text-align:center"'}>${j === 0 && i === rows.length - 1 ? '<b>Preis</b>' : (i === rows.length - 1 ? `<b style="white-space:nowrap">${c}</b>` : c)}</td>`)).join('') + '</tr>').join('') + '</table>';
  return `
${d.h1('1 Überblick')}
<p><b>Produkt:</b> IT-WORLD Compliance-Assistent, eine Desktop-Software für kleine und mittlere Unternehmen mit Checklisten, Nachweisen und Fristen für NIS2, DSGVO und IT-Sicherheit. Läuft komplett offline unter Windows, macOS und Linux.</p>
<p><b>Drei Pakete:</b> Alle Pakete enthalten die Vollversion, das <b>PDF-Benutzerhandbuch mit Beispielbildern</b> und eine <b>Beschreibung</b>. Standard und Premium ergänzen Einrichtung, Anpassung und Betreuung.</p>
<div style="display:flex;gap:4mm;margin:4mm 0">
<div class="pkg" style="flex:1;text-align:center"><div class="pill">Basic</div><div class="price">${PREISE.basic} €</div>Vollversion + Handbuch</div>
<div class="pkg" style="flex:1;text-align:center"><div class="pill">Standard</div><div class="price">${PREISE.standard} €</div>+ Einrichtung und Onboarding</div>
<div class="pkg" style="flex:1;text-align:center"><div class="pill">Premium</div><div class="price">${PREISE.premium} €</div>+ Anpassung, Workshop, Support</div></div>
${d.box('warn', 'Abgrenzung', 'Der Compliance-Assistent ist eine Orientierungs- und Dokumentationshilfe. Er ersetzt keine Rechtsberatung, kein Audit und keine Zertifizierung; die Pakete enthalten keine rechtliche Prüfung und keine Gewähr für die Konformität Ihres Unternehmens.')}
${d.h2('1.1 Pakete im Vergleich')}
${tbl}
<p style="font-size:9pt;color:#6e5f3d">Alle Leistungen werden über Fiverr bestellt, bezahlt und geliefert. Dienstleistungsanteile (Einrichtung, Workshop, Anpassung) erbringt IT-WORLD persönlich.</p>

${d.h1('2 Beschreibung der Pakete')}
${d.h2('2.1 Basic – Vollversion')}
<div class="pkg"><span class="pill">Basic</span> <span class="price">${PREISE.basic} €</span> · Lieferzeit 1 Tag · 1 Überarbeitung
<p style="margin-top:2mm"><b>Für wen:</b> Unternehmen, die selbst loslegen möchten.</p>
<p><b>Sie erhalten:</b> die Vollversion für ${INSTALL.basic} Installation (Windows, macOS, Linux), das PDF-Benutzerhandbuch mit Beispielbildern und eine Funktions- und Leistungsbeschreibung. 30 Tage Support bei Fragen und Fehlern über die Fiverr-Nachrichten.</p></div>
${d.h2('2.2 Standard – Einrichtung und Onboarding')}
<div class="pkg"><span class="pill">Standard</span> <span class="price">${PREISE.standard} €</span> · Lieferzeit 3 Tage · 2 Überarbeitungen
<p style="margin-top:2mm"><b>Für wen:</b> Unternehmen, die schnell startklar sein wollen.</p>
<p><b>Sie erhalten:</b> alles aus Basic für bis zu ${INSTALL.standard} Installationen, dazu die Einrichtung (Unternehmensprofil, Betroffenheits-Check, Verschlüsselung), die Vorbefüllung von bis zu 5 Einträgen im Verarbeitungsverzeichnis und Ihrer Dienstleisterliste sowie eine Online-Einführung von 45 Minuten. 60 Tage Support.</p></div>
${d.h2('2.3 Premium – Rundum-Paket')}
<div class="pkg"><span class="pill">Premium</span> <span class="price">${PREISE.premium} €</span> · Lieferzeit 7 Tage · 3 Überarbeitungen
<p style="margin-top:2mm"><b>Für wen:</b> Unternehmen mit mehreren Arbeitsplätzen und individuellen Anforderungen.</p>
<p><b>Sie erhalten:</b> alles aus Standard für bis zu ${INSTALL.premium} Installationen, bis zu 15 vorbefüllte Verarbeitungstätigkeiten, individuelle Anpassungen (Firmenname und Logo in Bericht und Vorlagen, bis zu 10 angepasste Anforderungen oder Vorlagen), einen Workshop von 2 Stunden, eine Auswertung Ihres Ausfüllstands mit Maßnahmenliste (PDF), zwei Funktions-Updates und 6 Monate Support.</p></div>

${d.h1('3 Voraussetzungen')}
${d.h2('3.1 Technische Voraussetzungen (Käufer)')}
<table><tr><th>Komponente</th><th>Voraussetzung</th></tr>
<tr><td>Betriebssystem</td><td>Windows 10/11 (64 Bit) · macOS 12 oder neuer · Linux 64 Bit (AppImage)</td></tr>
<tr><td>Hardware</td><td>4 GB RAM (empfohlen 8 GB), ca. 500 MB Speicher, Bildschirm ab 1280 × 720</td></tr>
<tr><td>Internet</td><td>nur für Download und Bestellung; die Anwendung selbst arbeitet offline</td></tr>
<tr><td>Rechte</td><td>Installation pro Benutzer, keine Administratorrechte nötig (Windows); bei nicht signierten Installern können SmartScreen/Gatekeeper warnen (im Handbuch erklärt)</td></tr>
<tr><td>Zusatz</td><td>PDF-Betrachter; für den Online-Termin (Standard/Premium) ein Gerät mit Bildschirmfreigabe</td></tr></table>
${d.h2('3.2 Mitwirkung (Käufer, Standard und Premium)')}
<ul>
<li>Firmendaten: Name, Branche, Anzahl Beschäftigte, Jahresumsatz und Bilanzsumme (für den Betroffenheits-Check).</li>
<li>Namen der Verantwortlichen (Geschäftsleitung, IT, Datenschutz) und eine Liste Ihrer Dienstleister.</li>
<li>Premium: Firmenlogo als PNG (mind. 1000 Pixel) und die gewünschten Anpassungen.</li>
<li>Terminvorschläge für die Online-Einführung bzw. den Workshop.</li>
<li><b>Bitte keine personenbezogenen Daten Dritter über das Fiverr-Chat schicken.</b> Für die Vorbefüllung genügen Firmen- und Dienstleisterbezeichnungen.</li></ul>
${d.h2('3.3 Rahmenbedingungen')}
<ul>
<li><b>Lizenz:</b> einfaches, nicht übertragbares Nutzungsrecht für das eigene Unternehmen im Rahmen der Installationszahl; Weitergabe, Vervielfältigung und Weiterverkauf sind untersagt (siehe Handbuch).</li>
<li><b>Lieferung:</b> Installer, Handbuch (PDF) und Beschreibung über die Fiverr-Lieferung; Prüfsummen zur Kontrolle liegen bei.</li>
<li><b>Keine Rechtsberatung</b> und keine Zertifizierung (siehe Abgrenzung).</li>
<li><b>Kommunikation und Zahlung</b> ausschließlich über Fiverr.</li></ul>
${d.h2('3.4 Voraussetzungen für den Anbieter (Checkliste)')}
<table class="keep"><tr><th>Punkt</th><th>Hinweis</th></tr>
<tr><td>☐ Fiverr-Verkäuferkonto</td><td>Profil vollständig und verifiziert, Gig mit Video und mindestens 3 Bildern (Beispielbilder liegen bei).</td></tr>
<tr><td>☐ Preise und Währung</td><td>Fiverr führt Preise in US-Dollar und behält eine Provision ein (derzeit ca. 20 %). <b>Prüfen Sie in Ihrem Konto die Preisgrenze je Paket:</b> ${PREISE.premium} € liegt gegebenenfalls darüber. Alternativ Zusatzleistungen (Gig Extras) oder ein individuelles Angebot (Custom Offer) nutzen.</td></tr>
<tr><td>☐ Installer bereitstellen</td><td>Über den GitHub-Workflow <code>it-world-compliance-release</code> (Tag <code>it-world-compliance-v${VERSION}</code>) werden Windows-, macOS- und Linux-Installer samt <code>SHA256SUMS.txt</code> gebaut. Optional Code-Signing (Windows) und Notarisierung (macOS), damit keine Warnungen erscheinen.</td></tr>
<tr><td>☐ Rechte an Material</td><td>Nutzungsrechte an der Hintergrundmusik des Demovideos und am Logo sicherstellen.</td></tr>
<tr><td>☐ Leistungen erbringen können</td><td>Einrichtung, Online-Einführung, Workshop, Anpassungen und Support (30 Tage bis 6 Monate) müssen von Ihnen leistbar sein; Umfang bei Bedarf anpassen.</td></tr>
<tr><td>☐ Recht und Steuern</td><td>Gewerbeanmeldung, Umsatzsteuer und Buchführung mit Steuerberatung klären; Lizenztext und Haftungsausschluss rechtlich prüfen lassen.</td></tr>
<tr><td>☐ Datenschutz bei Kunden</td><td>Bei Einrichtung/Workshop keine Kundendaten außerhalb der Sitzung speichern; Verschwiegenheit zusichern.</td></tr></table>

${d.h1('4 Texte für Ihr Fiverr-Gig')}
<p>Die Texte stehen zusätzlich als Textdatei zum Kopieren bereit (<code>fiverr-texte.txt</code>). Zeichenlimits der Fiverr-Eingabemaske bitte beim Eintragen kontrollieren.</p>
${d.h2('4.1 Gig-Titel')}
<div class="box"><b class="t">Deutsch</b>${esc(TEXT.titelDE)}<br><b class="t" style="margin-top:2mm">English</b>${esc(TEXT.titelEN)}</div>
${d.h2('4.2 Gig-Beschreibung (Deutsch)')}
<div class="box" style="white-space:pre-line">${esc(TEXT.beschreibungDE)}</div>
${d.h2('4.3 Paket-Titel und Kurzbeschreibungen')}
<table><tr><th>Paket</th><th>Titel</th><th>Kurzbeschreibung</th></tr>
${['basic', 'standard', 'premium'].map((k) => `<tr><td>${k[0].toUpperCase() + k.slice(1)}</td><td>${esc(TEXT.pkg[k].titel)}</td><td>${esc(TEXT.pkg[k].kurz)}</td></tr>`).join('')}</table>
${d.h2('4.4 Fragen an Käufer (Requirements)')}
<ol>${TEXT.requirements.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
${d.h2('4.5 Häufige Fragen (FAQ)')}
${TEXT.faq.map(([q, a]) => `<p><b>${esc(q)}</b><br>${esc(a)}</p>`).join('')}
${d.h2('4.6 Suchbegriffe (Tags)')}
<p>${TEXT.tags.map((x) => `<span class="pill">${esc(x)}</span>`).join(' ')}</p>
<p style="margin-top:8mm;text-align:center;color:#6e5f3d">© 2026 IT-WORLD · Alle Rechte vorbehalten · Vervielfältigung und Weitergabe untersagt</p>`;
}

const TEXT = {
  titelDE: 'Ich liefere Ihnen Compliance-Software für NIS2, DSGVO und IT-Sicherheit (KMU)',
  titelEN: 'I will deliver NIS2, GDPR and IT security compliance software for your SME',
  beschreibungDE: `NIS2, DSGVO und IT-Sicherheit: Checklisten, Nachweise und Fristen in einer Desktop-Software, die komplett offline läuft.

Der IT-WORLD Compliance-Assistent führt Ihr Unternehmen Schritt für Schritt durch 57 Anforderungen mit Hilfetexten, Rechtsgrundlage und Nachweis-Tipps. Dazu: NIS2-Betroffenheits-Check, Verarbeitungsverzeichnis, Dienstleister und AV-Verträge, Betroffenenanfragen, Schulungen, Fristenkalender (.ics), Meldefristen mit Live-Countdown (24 h / 72 h / 1 Monat), 11 Dokumentvorlagen und ein PDF-Bericht.

Ihre Daten bleiben auf Ihrem Rechner: kein Cloud-Zwang, keine Telemetrie, optional AES-256-verschlüsselt mit Auto-Sperre.

Alle Pakete enthalten die Vollversion für Windows, macOS und Linux, ein PDF-Benutzerhandbuch mit Beispielbildern und eine Funktionsbeschreibung. Standard und Premium bieten zusätzlich Einrichtung, Online-Einführung, Anpassungen und Support.

Hinweis: Orientierungs- und Dokumentationshilfe, keine Rechtsberatung und keine Zertifizierung.`,
  pkg: {
    basic: { titel: 'Basic - Vollversion', kurz: '1 Installation, PDF-Handbuch mit Bildern, Beschreibung, 30 Tage Support' },
    standard: { titel: 'Standard - Einrichtung', kurz: '3 Installationen, Einrichtung, Onboarding 45 Min., Handbuch, 60 Tage Support' },
    premium: { titel: 'Premium - Rundum-Paket', kurz: '10 Installationen, Anpassung, Workshop 2 Std., Handbuch, 6 Monate Support' }
  },
  requirements: [
    'Welches Betriebssystem nutzen Sie (Windows, macOS oder Linux)?',
    'Wie viele Arbeitsplätze sollen die Software nutzen?',
    'Firmenname, Branche und Anzahl Beschäftigte (für den Betroffenheits-Check)?',
    'Standard/Premium: Ihre Terminwünsche für die Online-Einführung. Premium: bitte Firmenlogo als PNG (mind. 1000 Pixel) bereitstellen.'
  ],
  faq: [
    ['Läuft die Software wirklich offline?', 'Ja. Netzwerkzugriffe werden blockiert, es gibt keine Telemetrie und keine Konten. Ihre Daten bleiben lokal.'],
    ['Ersetzt die Software eine Rechtsberatung?', 'Nein. Sie ist eine Orientierungs- und Dokumentationshilfe und keine Zertifizierung.'],
    ['Was passiert bei Passwortverlust?', 'Bei aktivierter Verschlüsselung gibt es keine Wiederherstellung. Legen Sie Datensicherungen an.'],
    ['Darf ich die Software weitergeben?', 'Nein. Sie erhalten ein Nutzungsrecht für Ihr Unternehmen im Rahmen der Installationszahl Ihres Pakets.']
  ],
  tags: ['NIS2', 'DSGVO', 'Compliance', 'IT-Sicherheit', 'Datenschutz']
};

// ---------- Rendern (zweistufig für das Inhaltsverzeichnis) ----------

async function render(browser, name, build) {
  fs.mkdirSync(WORK, { recursive: true });
  const out = path.join(BASE, name + '.pdf');
  const html = path.join(WORK, name + '.html');
  let pages = {};
  let doc;
  for (let pass = 0; pass < 2; pass++) {
    doc = build(pages);
    fs.writeFileSync(html, doc.html);
    const page = await browser.newPage();
    await page.goto(u(html));
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
    await page.close();
    if (pass === 0) {
      const n = parseInt(execFileSync('pdfinfo', [out]).toString().match(/Pages:\s+(\d+)/)[1], 10);
      const text = [];
      for (let i = 1; i <= n; i++) text.push(execFileSync('pdftotext', ['-f', String(i), '-l', String(i), '-layout', out, '-']).toString().replace(/\s+/g, ' '));
      let from = 3; // Cover (1), Urheberrecht (2), Inhaltsverzeichnis (3) überspringen
      pages = {};
      for (const e of doc.toc) {
        let found = null;
        for (let i = from; i < n; i++) { if (text[i].includes(e.t.replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''))) { found = i + 1; break; } }
        pages[e.id] = found || '';
        if (found) from = found - 1;
      }
      // Seitenzahl des Inhaltsverzeichnisses selbst ist nicht nötig
    }
  }
  const info = execFileSync('pdfinfo', [out]).toString();
  console.log(name + ':', info.match(/Pages:\s+\d+/)[0], '·', (fs.statSync(out).size / 1e6).toFixed(1) + ' MB');
}

(async () => {
  const browser = await chromium.launch();
  const make = (title, sub, ver, bodyFn, includeCopy) => (pages) => {
    const d = makeDoc();
    const copy = COPYRIGHT_PAGE(d);
    const body = bodyFn(d);
    const tocBlock = `<h1 class="first" style="page-break-before:always">Inhaltsverzeichnis</h1>${tocHtml(d.toc.filter((e) => e.t !== 'Urheberrecht, Nutzungsrecht und Haftung'), pages)}`;
    return { toc: d.toc, html: `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${cover(title, sub, ver)}${copy}${tocBlock}${body}</body></html>` };
  };
  await render(browser, 'IT-WORLD-Compliance-Assistent-Benutzerhandbuch', make('Benutzerhandbuch', 'IT-WORLD Compliance-Assistent<br>NIS2 · DSGVO · IT-Sicherheit', `Version ${VERSION} · Stand Oktober 2026`, manualBody));
  await render(browser, 'IT-WORLD-Compliance-Assistent-Fiverr-Angebot', make('Fiverr-Angebot', 'IT-WORLD Compliance-Assistent<br>Basic · Standard · Premium', `Pakete, Beschreibung und Voraussetzungen · Stand Oktober 2026`, fiverrBody));
  await browser.close();

  // Texte zum Kopieren (inkl. Zeichenzählung nach den üblichen Fiverr-Limits)
  const lim = (s, n, label) => { if (s.length > n) throw new Error(`${label}: ${s.length} > ${n} Zeichen`); return `${s}   [${s.length}/${n}]`; };
  const txt = [
    'FIVERR-TEXTE · IT-WORLD Compliance-Assistent',
    '© 2026 IT-WORLD. Alle Rechte vorbehalten. Vervielfältigung und Weitergabe untersagt.', '',
    '=== GIG-TITEL (max. 80 Zeichen) ===', lim(TEXT.titelDE, 80, 'Titel DE'), lim(TEXT.titelEN, 80, 'Titel EN'), '',
    '=== GIG-BESCHREIBUNG (max. 1200 Zeichen) ===', lim(TEXT.beschreibungDE, 1200, 'Beschreibung'), '',
    '=== PAKETE (Titel max. 25 Zeichen, Beschreibung max. 100 Zeichen) ===',
    ...['basic', 'standard', 'premium'].flatMap((k) => [`${k.toUpperCase()}  ${PREISE[k]} EUR`, '  Titel: ' + lim(TEXT.pkg[k].titel, 25, k + ' Titel'), '  Beschreibung: ' + lim(TEXT.pkg[k].kurz, 100, k + ' Beschreibung')]), '',
    '=== FRAGEN AN KÄUFER ===', ...TEXT.requirements.map((r, i) => `${i + 1}. ${r}`), '',
    '=== FAQ ===', ...TEXT.faq.flatMap(([q, a]) => [`F: ${q}`, `A: ${a}`, '']),
    '=== TAGS (max. 5) ===', TEXT.tags.join(', '), ''
  ].join('\n');
  fs.writeFileSync(path.join(BASE, 'fiverr-texte.txt'), txt);
  console.log('fiverr-texte.txt geschrieben');
})().catch((e) => { console.error(e); process.exit(1); });
