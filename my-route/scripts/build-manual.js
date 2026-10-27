// Erzeugt das Benutzerhandbuch (A4-PDF + Mobil-PDF) samt Beispielbildern aus der Vollversion.
// Braucht Playwright (nicht Teil der App-Abhängigkeiten): NODE_PATH=$(npm root -g) node scripts/build-manual.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs');
const img = path.join(docs, 'img');
const APP = 'file://' + path.join(root, 'web', 'My-Route-Vollversion.html');
const DL = 'file://' + path.join(root, 'web', 'My-Route-Download.html');
const font = (f) => 'data:font/ttf;base64,' + fs.readFileSync(path.join(root, 'renderer', 'assets', 'fonts', f)).toString('base64');
const logo = 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'renderer', 'assets', 'logo.webp')).toString('base64');
const pkg = require(path.join(root, 'package.json'));

// NUR für die Handbuch-Bilder: OSRM-förmige Beispielwerte (das Handbuch kennzeichnet sie als Beispiel).
function mockOsrm(from, to) {
  const mid = (t, o) => [from[0] + (to[0] - from[0]) * t + o, from[1] + (to[1] - from[1]) * t + o * 0.6];
  const mk = (dur, dist, off) => ({ duration: dur, distance: dist, geometry: { coordinates: [from, mid(0.33, off), mid(0.66, -off), to] } });
  return { code: 'Ok', routes: [mk(1380, 14200, 0), mk(1560, 12300, 0.04), mk(1500, 13600, -0.05)] };
}
async function mockRoutes(ctx) {
  await ctx.route('https://router.project-osrm.org/**', (r) => {
    const m = r.request().url().match(/driving\/([\d.]+),([\d.]+);([\d.]+),([\d.]+)/);
    r.fulfill({ json: mockOsrm([+m[1], +m[2]], [+m[3], +m[4]]), headers: { 'access-control-allow-origin': '*' } });
  });
}

async function shots() {
  fs.mkdirSync(img, { recursive: true });
  const b = await chromium.launch();
  const desk = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, geolocation: { latitude: 52.4731, longitude: 13.401 }, permissions: ['geolocation'] });
  await mockRoutes(desk);
  const p = await desk.newPage();
  await p.goto(APP);
  await p.click('text=Beispielroute laden');
  await p.waitForTimeout(3300);
  await p.screenshot({ path: path.join(img, 's1-start.jpg'), type: 'jpeg', quality: 88 });

  await p.click('.tab[data-view=favorites]');
  await p.fill('#fav-name', 'Mein Lieblingscafé'); await p.fill('#fav-address', 'Unter den Linden 40, Berlin');
  await p.fill('#fav-coords', '52.5170, 13.3888'); await p.fill('#fav-note', 'Bestes Frühstück der Stadt');
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(img, 's2-favoriten.jpg'), type: 'jpeg', quality: 88 });

  await p.click('.tab[data-view=routes]');
  await p.click('#route-list >> text=Bearbeiten');
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(img, 's3-routen.jpg'), type: 'jpeg', quality: 88 });

  await p.click('#route-list .btn:has-text("Live-Optionen")');
  await p.waitForTimeout(1300);
  await p.locator('#live-dialog').screenshot({ path: path.join(img, 's4-live.jpg'), type: 'jpeg', quality: 88 });
  await p.click('#live-close');

  await p.click('.tab[data-view=map]');
  await p.waitForTimeout(1800);
  await p.screenshot({ path: path.join(img, 's5-karte.jpg'), type: 'jpeg', quality: 88 });

  for (const look of ['klar', 'hell']) {
    await p.click('.tab[data-view=start]');
    await p.selectOption('#look-select', look);
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(img, `s8-${look}.jpg`), type: 'jpeg', quality: 88 });
  }

  const phone = await b.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    geolocation: { latitude: 52.4731, longitude: 13.401 }, permissions: ['geolocation'],
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' });
  await mockRoutes(phone);
  const q = await phone.newPage();
  await q.goto(APP);
  await q.click('text=Beispielroute laden');
  await q.waitForTimeout(3300);
  await q.screenshot({ path: path.join(img, 's10-handy-start.jpg'), type: 'jpeg', quality: 88 });
  await q.click('.tab[data-view=drive]');
  await q.waitForTimeout(600);
  await q.evaluate(() => window.scrollTo(0, 330));
  await q.waitForTimeout(500);
  await q.screenshot({ path: path.join(img, 's6-fahrmodus.jpg'), type: 'jpeg', quality: 88 });
  await q.click('#drive-favs .drive-fav >> nth=1');
  await q.waitForTimeout(1300);
  await q.screenshot({ path: path.join(img, 's7-handy-live.jpg'), type: 'jpeg', quality: 88 });

  const dl = await (await b.newContext({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 1.5 })).newPage();
  await dl.goto(DL);
  await dl.waitForTimeout(900);
  await dl.screenshot({ path: path.join(img, 's9-download.jpg'), type: 'jpeg', quality: 88 });
  await b.close();
}

const fig = (file, text, cls = '') => `<figure class="${cls}"><img src="img/${file}" alt="${text}"><figcaption>${text}</figcaption></figure>`;

function html() {
  const v = pkg.version;
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>My Route – Benutzerhandbuch</title>
<style>
@font-face{font-family:"Open Sans";font-weight:400;src:url(${font('OpenSans-Regular.ttf')})}
@font-face{font-family:"Open Sans";font-weight:700;src:url(${font('OpenSans-Bold.ttf')})}
:root{--gold:#b9801a;--gold-d:#7a5410;--ink:#2b2316;--soft:#6b5d42;--paper:#fffaf0;--rule:#e6d3a3}
*{box-sizing:border-box}
body{font-family:"Open Sans",sans-serif;color:var(--ink);background:var(--paper);font-size:var(--fs);line-height:1.62;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body.a4{--fs:10.5pt;--cover-h:246mm;--img-w:100%}
body.mobile{--fs:10pt;--cover-h:166mm;--img-w:100%}
@page{background:#fffaf0}
body.a4{} 
h1,h2,h3{font-weight:700;line-height:1.25;break-after:avoid}
h1{color:var(--gold-d);font-size:1.75em;margin:1.4em 0 .3em;padding-bottom:.25em;border-bottom:2px solid var(--rule)}
h1 .num{display:inline-block;min-width:1.5em;color:var(--gold)}
h2{color:var(--gold);font-size:1.18em;margin:1.2em 0 .3em}
p{margin:.55em 0}
ul,ol{margin:.5em 0;padding-left:1.4em} li{margin:.25em 0}
b,strong{color:var(--gold-d)}
.lead{font-size:1.1em;color:var(--soft)}
.note{background:#fff3d6;border-left:4px solid var(--gold);border-radius:8px;padding:.6em 1em;margin:.9em 0;break-inside:avoid}
.note.warn{background:#fde8e1;border-color:#c0583a}
figure{margin:1em 0;text-align:center;break-inside:avoid}
figure img{max-width:var(--img-w);border-radius:10px;border:1px solid var(--rule);box-shadow:0 4px 14px rgba(90,60,10,.18)}
body.a4 figure.phone img{max-width:42%} body.a4 figure.half img{max-width:78%}
figcaption{font-size:.86em;color:var(--soft);margin-top:.45em;font-style:italic}
.cover{height:var(--cover-h);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;break-after:page}
.cover img{width:62%;border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,.3)}
.cover h1{border:0;font-size:2.9em;margin:.7em 0 0;color:var(--gold-d);letter-spacing:.04em}
.cover .sub{letter-spacing:.45em;font-weight:700;color:var(--soft);margin:.2em 0 1.2em;font-size:.95em}
.cover .tag{font-size:1.15em;color:var(--soft);max-width:80%}
.cover .ver{margin-top:2em;color:var(--soft);font-size:.9em}
.toc{break-after:page} .toc h1{margin-top:0}
.toc ol{list-style:none;padding:0;counter-reset:t} .toc li{counter-increment:t;padding:.4em 0;border-bottom:1px dotted var(--rule)}
.toc li::before{content:counter(t) ".";display:inline-block;width:2em;color:var(--gold);font-weight:700}
.steps{counter-reset:s;list-style:none;padding:0} .steps li{counter-increment:s;position:relative;padding:.7em 1em .7em 3.2em;margin:.6em 0;background:#fff3d6;border-radius:12px;break-inside:avoid} .steps li::before{content:counter(s);position:absolute;left:.8em;top:.55em;width:1.7em;height:1.7em;border-radius:50%;background:var(--gold);color:#fff;font-weight:700;text-align:center;line-height:1.7em}
.quick{break-after:page}
.sig{text-align:center;letter-spacing:.4em;color:var(--soft);margin-top:2.5em;font-size:.8em}
table{border-collapse:collapse;width:100%;margin:.8em 0;font-size:.95em;break-inside:avoid} th,td{border:1px solid var(--rule);padding:.4em .6em;text-align:left;vertical-align:top} th{background:#fbefcf;color:var(--gold-d)}
body.a4{} 
@page{size:A4;margin:20mm 18mm 24mm;@bottom-center{content:"– " counter(page) " –";font-family:"Open Sans",sans-serif;font-size:10pt;color:#7a5410}}
@page :first{@bottom-center{content:none}}
</style></head><body class="BODYCLS">
<section class="cover"><img src="${logo}" alt="IT-WORLD Logo"><h1>My Route</h1><div class="sub">BENUTZERHANDBUCH</div><p class="tag">Dein Weg, einmal gespeichert – immer wieder gern gefahren.</p><div class="ver">Version ${v} · IT - WORLD · IT SOLUTIONS</div></section>

<section class="toc"><h1>Das erwartet dich</h1><ol>
<li>Herzlich willkommen</li><li>Installation &amp; Start – auf jedem Gerät</li><li>Dein erster Start</li><li>Favoriten – deine Lieblingsorte (Liste 1 &amp; 2)</li><li>Routen zusammenstellen (Inland &amp; Ausland)</li><li>Route fahren – ein Klick genügt</li><li>Live-Optionen: schnellste, kürzeste, Alternative</li><li>Fahrmodus &amp; Touch – für Auto, Tablet und Handy</li><li>Optik wählen</li><li>Kartenvorschau</li><li>Sichern, Einlesen &amp; Datenschutz</li><li>Hilfe, wenn es mal hakt</li></ol></section>

<section class="quick"><h1 style="margin-top:0">In 3 Minuten startklar</h1>
<p class="lead">Keine Sorge – du brauchst kein Vorwissen. Diese drei Schritte reichen für den Anfang:</p>
<ol class="steps"><li><b>My Route öffnen.</b> Installiere die App oder öffne die Datei <b>My-Route-Vollversion.html</b> – Doppelklick genügt.</li>
<li><b>Beispiel laden.</b> Tippe auf „Beispielroute laden“. Schon siehst du, wie alles aussieht.</li>
<li><b>Losfahren.</b> Tippe bei der Route auf „Route fahren“. Deine Navigation öffnet sich – fertig!</li></ol>
${fig('s1-start.jpg', 'So sieht der Start aus – ein Tipp auf „Route fahren“, und die Reise beginnt.')}
<h2>Kleines Wörterbuch</h2>
<table><tr><th>Wort</th><th>Das bedeutet es</th></tr>
<tr><td>Favorit</td><td>Ein Ort, den du dir gemerkt hast – z. B. „Zuhause“ oder „Büro“.</td></tr>
<tr><td>Favoritenliste</td><td>Zwei Ablagen (Liste 1 und 2), auf die du deine Favoritenorte verteilen kannst.</td></tr>
<tr><td>Inland / Ausland</td><td>Das Gebiet einer Route – so findest du Auslandsrouten schnell wieder.</td></tr>
<tr><td>Stopp</td><td>Ein Favorit, der Teil einer Route ist.</td></tr>
<tr><td>Route</td><td>Mehrere Stopps in einer festen Reihenfolge – mit Namen, damit du sie wiederfindest.</td></tr>
<tr><td>Live-Optionen</td><td>Bis zu drei Wege zu einem Ziel: schnellste, kürzeste, Alternative.</td></tr>
<tr><td>Fahrmodus</td><td>Eine Ansicht mit großen Tasten für Auto, Tablet und Handy.</td></tr></table></section>

<h1><span class="num">1</span>Herzlich willkommen</h1>
<p class="lead">Schön, dass du da bist! My Route ist dein persönlicher Routenplaner: Du sammelst die Orte, die dir etwas bedeuten, stellst daraus Routen zusammen – und fährst sie jederzeit wieder, mit nur einem Klick.</p>
<p>Ob der tägliche Weg zur Arbeit, die Samstagsrunde bei den Lieblingsläden oder die Ausflugstour mit der Familie: Einmal gespeichert, ist alles sofort wieder da. Du musst nichts neu eintippen, nichts suchen und nichts vergessen.</p>
${fig('s1-start.jpg', 'Die Startseite: Deine Lieblingsrouten sind immer nur einen Klick entfernt.')}
<div class="note"><b>Gut zu wissen:</b> My Route braucht kein Konto und zeigt keine Werbung. Deine Orte und Routen bleiben auf deinem Gerät.</div>

<h1><span class="num">2</span>Installation &amp; Start – auf jedem Gerät</h1>
<table><tr><th>Dein Gerät</th><th>So bekommst du My Route</th></tr>
<tr><td>Windows</td><td>Installer <b>My-Route-Setup-${v}.exe</b> laden, doppelklicken, fertig.</td></tr>
<tr><td>macOS</td><td><b>My-Route-${v}-arm64.dmg</b> (Apple Silicon) oder <b>-x64.dmg</b> (Intel) öffnen und das Symbol in „Programme“ ziehen.</td></tr>
<tr><td>Linux</td><td><b>My-Route-${v}.AppImage</b> laden, ausführbar machen und starten.</td></tr>
<tr><td>Android</td><td><b>My-Route-${v}-android.apk</b> laden, öffnen und die Installation bestätigen. Dafür musst du einmalig „Installation aus dieser Quelle“ erlauben.</td></tr>
<tr><td>iPhone, iPad &amp; jeder Browser</td><td><b>My-Route-Vollversion.html</b> öffnen. Die komplette App steckt in dieser einen Datei. Mit „Zum Home-Bildschirm“ im Teilen-Menü legst du sie wie eine App ab.</td></tr></table>
${fig('s9-download.jpg', 'Die Download-Seite erkennt dein Gerät und schlägt den passenden Weg vor.')}
<div class="note">Alle Dateien findest du auf der Download-Seite <b>My-Route-Download.html</b> – ein Klick, und es geht los.</div>

<h1><span class="num">3</span>Dein erster Start</h1>
<p>Beim allerersten Öffnen ist noch alles leer. Tippe auf <b>„Beispielroute laden“</b>: Dann siehst du sofort, wie My Route aussieht – mit fünf Orten in Berlin und einer fertigen Route. Probiere ruhig alles aus; du kannst die Beispiele jederzeit löschen.</p>
<ol><li>Beispielroute laden</li><li>Oben auf <b>Routen</b> tippen und die Route ansehen</li><li>Auf <b>„Route fahren“</b> tippen – deine Navigation öffnet sich mit allen Stopps</li></ol>

<h1><span class="num">4</span>Favoriten – deine Lieblingsorte</h1>
<p>Unter <b>Favoriten</b> speicherst du Orte, die du immer wieder ansteuerst – Zuhause, Büro, dein Lieblingscafé, die Schule der Kinder.</p>
<ul><li><b>Name</b> und <b>Adresse</b> genügen.</li><li><b>Koordinaten</b> sind optional. Mit „Koordinaten zur Adresse finden“ trägt My Route sie für dich ein. Sie brauchst du für die Kartenvorschau, die Reihenfolge-Optimierung und die Live-Optionen.</li><li>Mit <b>Notiz</b> und <b>Symbol</b> machst du den Ort persönlich – z. B. „Parkplatz hinterm Haus“.</li></ul>
<h2>Zwei Favoritenlisten – ohne Obergrenze</h2>
<p>Du kannst so viele Favoriten speichern, wie du möchtest. Damit nichts durcheinandergerät, teilst du sie auf <b>Favoritenliste 1</b> und <b>Favoritenliste 2</b> auf – zum Beispiel Liste 1 für Alltag und Liste 2 für Urlaub und Ausflüge. Beim Speichern wählst du im Feld <b>„Liste“</b> die gewünschte Liste. Oben in den Favoriten schaltest du mit <b>„Alle / Liste 1 / Liste 2“</b> um, und mit dem Knopf <b>„→ Liste 2“</b> (bzw. „→ Liste 1“) auf einer Karte verschiebst du einen Ort jederzeit in die andere Liste. Bei der Routenplanung sind die Orte in der Auswahl nach Listen gruppiert.</p>
${fig('s2-favoriten.jpg', 'Einen neuen Lieblingsort speichern – so einfach geht das.')}
<div class="note">Die Suche nach Koordinaten sendet nur den Adresstext an OpenStreetMap – und nur, wenn du auf den Knopf tippst. Auf dem Handy findet „Mein Standort“ deine aktuelle Position.</div>

<h1><span class="num">5</span>Routen zusammenstellen</h1>
<p>Unter <b>Routen</b> baust du aus deinen Favoriten eine Route:</p>
<ol><li>Gib der Route einen Namen, z. B. „Samstags-Runde“.</li><li>Wähle, womit du unterwegs bist: Auto, zu Fuß, Fahrrad oder Bus &amp; Bahn.</li><li>Lass den Haken bei <b>„Start an meinem aktuellen Standort“</b>, wenn du immer von dort losfährst, wo du gerade bist.</li><li>Füge deine Stopps hinzu und bring sie mit den Pfeilen ↑ ↓ in die richtige Reihenfolge.</li><li>Tippe auf <b>„Route speichern“</b>.</li></ol>
<h2>Inland oder Ausland</h2>
<p>Im Feld <b>„Gebiet“</b> legst du fest, ob die Route im <b>Inland</b> (Deutschland) oder im <b>Ausland</b> verläuft. Bei „Ausland“ wählst du zusätzlich das <b>Land</b>, zum Beispiel Österreich oder Italien. Auf der Startseite, bei den Routen und im Fahrmodus sortierst du mit <b>„Alle / Inland / Ausland“</b> – so findest du deine Auslandsrouten sofort. Praktisch fürs Ausland: Maut bzw. Vignette, Ausweis und Papiere, Handy-Roaming und Tankmöglichkeiten rechtzeitig prüfen.</p>
${fig('s3-routen.jpg', 'Die Route wird Stopp für Stopp zusammengestellt.')}
<h2>Reihenfolge optimieren</h2>
<p>Haben alle Stopps Koordinaten, schlägt My Route mit <b>„Reihenfolge optimieren“</b> eine kürzere Abfolge vor. Der erste Stopp bleibt dein Startpunkt. Verglichen wird die Luftlinie – die genaue Strecke berechnet später dein Karten-Dienst.</p>

<h1><span class="num">6</span>Route fahren – ein Klick genügt</h1>
<p>Auf der Startseite stehen deine Lieblingsrouten (mit dem Stern ⭐ markiert). Ein Tipp auf <b>„Route fahren“</b> öffnet die Navigation mit allen Zwischenstopps.</p>
<table><tr><th>Knopf</th><th>Was passiert</th></tr>
<tr><td>Route fahren</td><td>Öffnet Google Maps (Browser oder App) mit der kompletten Route.</td></tr>
<tr><td>Navi-App (1. Stopp)</td><td>Nur auf Android: startet die Navigation zum ersten Stopp direkt in der Karten-App.</td></tr>
<tr><td>Apple Karten</td><td>Nur auf iPhone, iPad und Mac: öffnet die Route in Apple Karten.</td></tr>
<tr><td>OpenStreetMap</td><td>Wenn alle Stopps Koordinaten haben.</td></tr>
<tr><td>Link kopieren</td><td>Legt den Navigations-Link in die Zwischenablage – zum Teilen oder Weiterleiten.</td></tr></table>
<div class="note">Karten-Dienste erlauben pro Link nur eine begrenzte Zahl an Zwischenstopps. Hat deine Route mehr als zehn Stopps, teilt My Route sie in <b>Teil 1, Teil 2 …</b> auf – fahre sie einfach nacheinander.</div>

<h1><span class="num">7</span>Live-Optionen: schnellste, kürzeste, Alternative</h1>
<p>Vor der Abfahrt lohnt der Blick auf <b>„Live-Optionen“</b>: My Route fragt bei bestehender Internetverbindung die Strecken zu deinem Ziel ab und zeigt dir <b>höchstens drei Möglichkeiten</b> für das Auto:</p>
<ul><li><b>Schnellste</b> – die geringste Fahrzeit,</li><li><b>Kürzeste</b> – die geringste Strecke,</li><li><b>Alternative</b> – eine weitere sinnvolle Strecke, falls es sie gibt.</li></ul>
<p>Ist die schnellste zugleich die kürzeste, steht sie als „Schnellste &amp; kürzeste“ da. Zu jeder Option siehst du Fahrzeit, Kilometer und den Unterschied zur schnellsten – und mit <b>„Diese Strecke fahren“</b> startest du die Navigation.</p>
${fig('s4-live.jpg', 'Drei Strecken zur Auswahl (Beispielwerte im Handbuch – in der App kommen sie live).', 'half')}
<ul><li><b>Start:</b> „Mein Standort“ (auf Handy, Tablet und im Browser) oder ein beliebiger Favorit.</li><li><b>Live aktualisieren:</b> Bleibt das Fenster offen, lädt My Route die Werte jede Minute neu. Die Zeile „🟢 Live · aktualisiert um …“ zeigt dir, dass die Verbindung steht. Bei „🔴“ prüfe bitte dein Internet.</li></ul>
<div class="note">Die Strecken berechnet der OpenStreetMap-Dienst OSRM; dabei werden nur Start- und Zielkoordinaten übertragen – und nur, wenn du „Optionen laden“ wählst. Google Maps kennt keine feste Strecken-Nummer: Für Kürzeste und Alternative setzt My Route deshalb einen Zwischenpunkt auf der gewünschten Strecke, damit die Navigation ihr folgt. Der angezeigte Verkehrsstand ist nicht in Echtzeit eingerechnet – dein Navi korrigiert das unterwegs.</div>

<h1><span class="num">8</span>Fahrmodus &amp; Touch – für Auto, Tablet und Handy</h1>
<p>Der <b>Fahrmodus</b> zeigt deine Routen und Lieblingsziele mit großen Tasten. Er schaltet sich auf Touchscreens automatisch ein; über <b>„Bedienung“</b> oben kannst du zwischen Auto, Touch und Maus wählen.</p>
${fig('s6-fahrmodus.jpg', 'Der Fahrmodus auf dem Handy: große Tasten, ein Tipp genügt.', 'phone')}
<h2>Beispiele aus dem Alltag</h2>
<ul><li><b>Im Auto:</b> Handy oder Tablet in die Halterung, Fahrmodus öffnen, <b>vor der Abfahrt</b> die Route wählen – und los. Die Anzeige lässt sich über die Bildschirmspiegelung deines Autos darstellen, sofern es diese unterstützt.</li><li><b>Auf dem Tablet:</b> Quer gehalten sind die Tasten besonders groß – ideal als Beifahrer-Display.</li><li><b>Auf dem Handy:</b> Das Ziel antippen, Live-Optionen ansehen, Strecke wählen.</li></ul>
${fig('s7-handy-live.jpg', 'Live-Optionen auf dem Handy (Beispielwerte).', 'phone')}
<div class="note warn"><b>Bitte beachten:</b> Bediene dein Gerät nur im Stand. Stelle Ziel und Strecke vor der Abfahrt ein. My Route ist keine integrierte Android-Auto-/CarPlay-App; es startet deine Karten-App, die dich unterwegs führt.</div>

<h1><span class="num">9</span>Optik wählen</h1>
<p>Oben rechts findest du <b>„Optik“</b>. Du hast die Wahl zwischen der glänzenden <b>3D-Gold</b>-Optik mit Animationen, der ruhigen <b>Klar-Dunkel</b>-Optik und der hellen Optik für den Tag. Deine Wahl wird gemerkt.</p>
${fig('s8-klar.jpg', 'Optik „Klar Dunkel“ – ruhig und flach.', 'half')}
${fig('s8-hell.jpg', 'Optik „Hell“ – übersichtlich bei Tageslicht.', 'half')}

<h1><span class="num">10</span>Kartenvorschau</h1>
<p>Unter <b>Karte</b> siehst du, wie deine Stopps zueinander liegen – mit nummerierten Markierungen und einer animierten Linie. Die Vorschau funktioniert ohne Internet. Angezeigt wird die Luftlinie; die echte Strecke ermittelt dein Karten-Dienst.</p>
${fig('s5-karte.jpg', 'Die Kartenvorschau mit Reihenfolge und Luftlinie.', 'half')}

<h1><span class="num">11</span>Sichern, Einlesen &amp; Datenschutz</h1>
<p>Mit <b>„Sichern“</b> speicherst du alle Favoriten und Routen in einer Datei, mit <b>„Einlesen“</b> holst du sie auf einem anderen Gerät zurück – praktisch beim Gerätewechsel.</p>
<ul><li>Deine Daten liegen lokal auf deinem Gerät; es gibt kein Konto und keine Telemetrie.</li><li>Nur auf ausdrücklichen Tipp werden Dienste angesprochen: die Adresssuche (OpenStreetMap), die Live-Optionen (OSRM) und deine Karten-App beim Losfahren.</li><li>Einzelne Orte und Routen löschst du direkt auf ihrer Karte.</li></ul>

<h1><span class="num">12</span>Hilfe, wenn es mal hakt</h1>
<table><tr><th>Das ist passiert</th><th>Das hilft</th></tr>
<tr><td>Für das Ziel fehlen Koordinaten</td><td>Bei den Favoriten die Adresse eintragen und „Koordinaten zur Adresse finden“ wählen.</td></tr>
<tr><td>„Keine Live-Verbindung“</td><td>Internet prüfen und „Optionen laden“ erneut wählen.</td></tr>
<tr><td>„Mein Standort“ funktioniert nicht</td><td>Standortfreigabe in den Geräte-Einstellungen für Browser bzw. App erlauben.</td></tr>
<tr><td>Android blockiert die Installation</td><td>In den Einstellungen die Installation aus dieser Quelle einmalig erlauben.</td></tr>
<tr><td>Daten auf neues Gerät übertragen</td><td>Auf dem alten Gerät „Sichern“, auf dem neuen „Einlesen“.</td></tr></table>
<p>Wir wünschen dir viel Freude und immer eine gute Fahrt!</p>
<div class="sig">IT - WORLD · IT SOLUTIONS</div>
</body></html>`;
}

async function pdfs() {
  const b = await chromium.launch();
  const page = await b.newPage();
  const make = async (cls, out, pageCss) => {
    const f = path.join(docs, 'handbuch-' + cls + '.html');
    fs.writeFileSync(f, html().replace('BODYCLS', cls).replace('</style>', pageCss + '</style>'));
    await page.goto('file://' + f);
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.join(docs, out), preferCSSPageSize: true, printBackground: true });
    fs.unlinkSync(f);
  };
  await make('a4', 'My-Route-Handbuch-A4.pdf', '');
  await make('mobile', 'My-Route-Handbuch-Mobil.pdf', '@page{size:110mm 200mm;margin:12mm 9mm 16mm;@bottom-center{content:"– " counter(page) " –";font-family:"Open Sans",sans-serif;font-size:9pt;color:#7a5410}} @page :first{@bottom-center{content:none}}');
  await b.close();
}

(async () => {
  if (process.argv.includes('--skip-shots') === false) await shots();
  await pdfs();
  console.log('Fertig:', fs.readdirSync(docs).filter((f) => f.endsWith('.pdf')).join(', '));
})();
