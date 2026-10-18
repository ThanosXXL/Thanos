// Erzeugt die Fiverr-Galeriebilder (1280 × 769 px, PNG) aus Beispielbildern und den Paketdaten.
// Aufruf: node tools/build-images.js   (benötigt Playwright; vorher capture.js und build-pdf.js ausführen)
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const BASE = path.resolve(__dirname, '..');
const ROOT = path.resolve(BASE, '..');
const WORK = process.env.WORK_DIR || '/tmp/itw-img';
const OUT = path.join(BASE, 'fiverr-bilder');
const u = (p) => 'file://' + p;
const FONT = (f) => u(path.join(ROOT, 'renderer', 'fonts', f));
const LOGO = u(path.join(ROOT, 'build', 'icon.png'));
const SHOT = (n) => u(path.join(BASE, 'screens', n + '.png'));
const W = 1280, H = 769;

const CSS = `
@font-face{font-family:'Open Sans';font-weight:400;src:url('${FONT('OpenSans-Regular.ttf')}')}
@font-face{font-family:'Open Sans';font-weight:700;src:url('${FONT('OpenSans-Bold.ttf')}')}
*{box-sizing:border-box;margin:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;font-family:'Open Sans','Segoe UI',sans-serif;color:#f3e6c8;
 background:radial-gradient(800px 480px at 80% 0%,rgba(227,185,76,.24),transparent 70%),radial-gradient(640px 420px at 0% 100%,rgba(184,134,43,.18),transparent 70%),#050403}
.a{position:absolute}
.gold{color:#f7dc84;font-weight:700;text-shadow:0 2px 0 #d9a93e,0 4px 0 #b8862b,0 6px 0 #8c6218,0 8px 0 #6f4b10,0 12px 12px rgba(0,0,0,.7),0 0 30px rgba(227,185,76,.4)}
.tile{position:absolute;background:#000;border:2px solid rgba(240,200,100,.65);border-radius:18px;overflow:hidden;box-shadow:0 7px 0 #040302,0 16px 34px rgba(0,0,0,.7),0 0 40px rgba(227,185,76,.3)}
.tile img{display:block;width:100%;height:100%}
.tag{position:absolute;text-align:center;font-weight:700;text-transform:uppercase;color:#f7dc84;white-space:nowrap;text-shadow:0 2px 0 #7a5518,0 3px 0 #3d2a0a,0 0 16px rgba(227,185,76,.5)}
.shot{position:absolute;border-radius:12px;overflow:hidden;border:2px solid rgba(240,200,100,.55);box-shadow:0 9px 0 #040302,0 22px 50px rgba(0,0,0,.75),0 0 50px rgba(227,185,76,.2);background:#000}
.shot img{display:block;width:100%;height:100%;object-fit:cover}
.pill{display:inline-block;padding:5px 20px;border-radius:999px;font-weight:700;color:#2a1b04;border:2px solid #ffe9a3;background:linear-gradient(180deg,#fff0b0,#f0cc66 32%,#c4912f 50%,#a87a22 52%,#dcae45 80%,#f4d478);box-shadow:inset 0 2px 0 #fff8d6,0 4px 0 #6b4a12,0 9px 16px rgba(0,0,0,.55)}
.card{position:absolute;border-radius:20px;border:2px solid rgba(240,200,100,.6);background:linear-gradient(180deg,#2a200f,#0d0905);box-shadow:inset 0 2px 0 rgba(255,236,170,.25),0 8px 0 #040302,0 20px 40px rgba(0,0,0,.65)}
ul.ck{list-style:none;padding:0}
ul.ck li{position:relative;padding-left:34px;margin-bottom:11px;line-height:1.3}
ul.ck li:before{content:'✔';position:absolute;left:0;color:#f0cc66;font-weight:700}
.foot{position:absolute;left:0;right:0;bottom:14px;text-align:center;font-size:13px;color:#b5a27a}
`;

// kleine Marke oben links auf den Detailbildern: Logo + klar lesbares „IT Solutions“
const brand = (x = 40, y = 30, s = 96) => `<div class="tile" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:14px"><img src="${LOGO}"></div><div class="tag" style="left:${x - 20}px;width:${s + 40}px;top:${y + s + 8}px;font-size:${Math.round(s / 6.5)}px;letter-spacing:${Math.round(s / 24)}px">IT Solutions</div>`;
const shot = (n, x, y, w, h, extra = '') => `<div class="shot" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}"><img src="${SHOT(n)}"></div>`;
const COPY = '© 2026 IT-WORLD · Alle Rechte vorbehalten · Vervielfältigung untersagt · Orientierungshilfe, keine Rechtsberatung';

const PKG = {
  basic: { n: 'Basic', p: '1.800', d: '1 Tag', col: 'Vollversion + Handbuch', items: ['Vollversion für Windows, macOS und Linux', '1 Installation', 'PDF-Benutzerhandbuch mit Beispielbildern', 'Beschreibung des Funktionsumfangs', '30 Tage Support per Fiverr-Nachricht'], rev: '1 Überarbeitung' },
  standard: { n: 'Standard', p: '3.800', d: '3 Tage', col: '+ Einrichtung und Onboarding', items: ['Alles aus Basic', '3 Installationen', 'Einrichtung: Profil, NIS2-Check, Verschlüsselung', 'Vorbefüllung (bis 5 Verarbeitungstätigkeiten)', 'Online-Einführung 45 Minuten', '60 Tage Support'], rev: '2 Überarbeitungen' },
  premium: { n: 'Premium', p: '7.579', d: '7 Tage', col: '+ Anpassung, Workshop, Support', items: ['Alles aus Standard', '10 Installationen', 'Individuelle Anpassungen (Name, Logo, Texte)', 'Workshop 2 Std. + Auswertung als PDF', 'Bis 15 vorbefüllte Verarbeitungstätigkeiten', '2 Funktions-Updates · 6 Monate Support'], rev: '3 Überarbeitungen' }
};

const images = {
  '01-fiverr-hero': () => `
    <div class="tile" style="left:50px;top:44px;width:250px;height:250px"><img src="${LOGO}"></div>
    <div class="tag" style="left:30px;width:290px;top:306px;font-size:30px;letter-spacing:8px">IT Solutions</div>
    <div class="a gold" style="left:50px;top:372px;width:600px;font-size:50px;line-height:1.12">Compliance-Software<br>für NIS2, DSGVO<br>und IT-Sicherheit</div>
    <div class="a" style="left:50px;top:560px;font-size:27px;line-height:1.4">Checklisten · Nachweise · Fristen<br>für kleine und mittlere Unternehmen</div>
    <div class="a" style="left:50px;top:652px"><span class="pill" style="font-size:19px">Windows</span> <span class="pill" style="font-size:19px">macOS</span> <span class="pill" style="font-size:19px">Linux</span> <span class="pill" style="font-size:19px">Läuft offline</span></div>
    ${shot('11-vorfaelle', 700, 330, 520, 325, 'transform:rotate(2.2deg)')}
    ${shot('01-uebersicht', 640, 70, 560, 350, 'transform:rotate(-1.8deg)')}
    <div class="foot">${COPY}</div>`,
  '02-fiverr-pakete': () => `
    ${brand(1130, 22, 80)}
    <div class="a gold" style="left:50px;top:26px;font-size:50px">Wählen Sie Ihr Paket</div>
    <div class="a" style="left:52px;top:92px;font-size:21px;color:#d8c79c">Alle Pakete: Vollversion · PDF-Benutzerhandbuch mit Beispielbildern · Beschreibung</div>
    ${['basic', 'standard', 'premium'].map((k, i) => { const p = PKG[k]; return `<div class="card" style="left:${50 + i * 400}px;top:140px;width:380px;height:575px;padding:22px 24px">
      <span class="pill" style="font-size:24px">${p.n}</span>
      <div class="gold" style="font-size:58px;margin:10px 0 0;line-height:1.1">${p.p} €</div>
      <div style="font-size:17px;color:#d8c79c;margin-bottom:14px">${p.col}</div>
      <ul class="ck" style="font-size:18px">${p.items.map((x) => `<li>${x}</li>`).join('')}</ul>
      <div class="a" style="left:24px;bottom:18px;font-size:17px;color:#f7dc84;font-weight:700">Lieferzeit ${p.d} · ${p.rev}</div></div>`; }).join('')}
    <div class="foot">${COPY}</div>`,
  '03-fiverr-funktionen': () => `
    ${brand(1130, 22, 80)}
    <div class="a gold" style="left:50px;top:26px;font-size:46px">Alles für NIS2, DSGVO und IT-Sicherheit</div>
    <div class="a" style="left:52px;top:88px;font-size:21px;color:#d8c79c">57 Anforderungen · Register · Meldefristen · Vorlagen · Bericht · komplett offline</div>
    ${[['01-uebersicht', 'Übersicht'], ['04-anforderung-dialog', 'Nachweise und Fristen'], ['11-vorfaelle', 'Meldefristen mit Countdown'], ['06-vvt', 'Verarbeitungsverzeichnis'], ['10-kalender', 'Fristenkalender (.ics)'], ['13-vorlagen', '11 Dokumentvorlagen']].map(([n, c], i) => {
      const x = 45 + (i % 3) * 405, y = 135 + Math.floor(i / 3) * 290;
      return shot(n, x, y, 380, 238) + `<div class="a" style="left:${x}px;top:${y + 246}px;width:380px;text-align:center;font-size:19px;font-weight:700;color:#f7dc84">${c}</div>`; }).join('')}
    <div class="foot">${COPY}</div>`,
  '07-fiverr-voraussetzungen': () => `
    ${brand(40, 28, 96)}
    <div class="a gold" style="left:190px;top:36px;font-size:46px">Voraussetzungen</div>
    <div class="a" style="left:192px;top:100px;font-size:21px;color:#d8c79c">Das benötigen Sie, damit es sofort losgehen kann</div>
    <div class="card" style="left:40px;top:196px;width:590px;height:500px;padding:26px 30px"><div class="gold" style="font-size:30px;margin-bottom:16px">Technik</div>
      <ul class="ck" style="font-size:23px"><li>Windows 10/11 (64 Bit), macOS 12+ oder Linux (64 Bit)</li><li>4 GB RAM (empfohlen 8 GB), ca. 500 MB Speicher</li><li>Bildschirm ab 1280 × 720</li><li>Kein Internet nötig: die Software arbeitet offline</li><li>Keine Administratorrechte erforderlich (Windows)</li><li>PDF-Betrachter für Handbuch und Bericht</li></ul></div>
    <div class="card" style="left:650px;top:196px;width:590px;height:500px;padding:26px 30px"><div class="gold" style="font-size:30px;margin-bottom:16px">Von Ihnen</div>
      <ul class="ck" style="font-size:23px"><li>Ihr Betriebssystem und die Anzahl der Arbeitsplätze</li><li>Firmenname, Branche, Anzahl Beschäftigte</li><li>Standard und Premium: Terminwunsch für die Online-Einführung</li><li>Premium: Firmenlogo als PNG (mind. 1000 Pixel)</li><li>Bitte keine personenbezogenen Daten Dritter im Chat</li></ul>
      <div class="a" style="left:30px;right:30px;bottom:20px;font-size:16px;color:#b5a27a;line-height:1.35">Orientierungs- und Dokumentationshilfe, keine Rechtsberatung und keine Zertifizierung.</div></div>
    <div class="foot">${COPY}</div>`,
  '08-fiverr-handbuch': () => `
    ${brand(40, 28, 96)}
    <div class="a gold" style="left:190px;top:34px;font-size:44px;line-height:1.1">PDF-Benutzerhandbuch<br>inklusive Beispielbildern</div>
    <div class="a" style="left:192px;top:140px;font-size:22px;color:#d8c79c">25 Seiten · Schritt für Schritt erklärt · in allen Paketen enthalten</div>
    <div class="shot" style="left:70px;top:230px;width:300px;height:424px;transform:rotate(-5deg)"><img src="${u(path.join(WORK, 'pdf-01.png'))}"></div>
    <div class="shot" style="left:380px;top:215px;width:320px;height:452px"><img src="${u(path.join(WORK, 'pdf-09.png'))}"></div>
    <div class="shot" style="left:720px;top:230px;width:300px;height:424px;transform:rotate(4deg)"><img src="${u(path.join(WORK, 'pdf-13.png'))}"></div>
    <div class="a" style="left:1050px;top:262px;width:200px;font-size:19px;line-height:1.55"><span class="pill" style="font-size:17px;margin-bottom:12px">Inhalt</span><br>Installation<br>Bedienung<br>Regelwerke<br>Register<br>Fristen<br>Sicherheit</div>
    <div class="foot">${COPY}</div>`,
  '09-fiverr-sicherheit': () => `
    ${brand(40, 28, 96)}
    <div class="a gold" style="left:190px;top:34px;font-size:44px;line-height:1.1">Ihre Daten bleiben<br>bei Ihnen</div>
    <ul class="ck a" style="left:60px;top:252px;width:560px;font-size:25px">
      <li>Komplett offline: kein Cloud-Zwang, keine Telemetrie</li><li>Optional AES-256-verschlüsselt mit Passwort</li><li>Automatische Sperre bei Inaktivität</li><li>Manipulationserkennendes Änderungsprotokoll</li><li>Sicheres Löschen aller Daten</li></ul>
    ${shot('19-sperrbildschirm', 650, 96, 560, 350, 'transform:rotate(1.5deg)')}
    ${shot('18-sicherheit-aktiv', 704, 424, 520, 288, 'transform:rotate(-1.5deg)')}
    <div class="foot">${COPY}</div>`
};
for (const k of ['basic', 'standard', 'premium']) {
  const n = { basic: '04', standard: '05', premium: '06' }[k];
  const shots = { basic: [['01-uebersicht', 600, 200, 640, 400]], standard: [['04-anforderung-dialog', 640, 96, 590, 369], ['06-vvt', 704, 392, 528, 330]], premium: [['15-bericht', 640, 96, 590, 369], ['10-kalender', 704, 392, 528, 330]] }[k];
  images[`${n}-fiverr-${k}`] = () => { const p = PKG[k]; return `
    ${brand(40, 28, 96)}
    <div class="a" style="left:190px;top:40px"><span class="pill" style="font-size:34px">${p.n}</span></div>
    <div class="a gold" style="left:190px;top:100px;font-size:78px;line-height:1">${p.p} €</div>
    <div class="a" style="left:192px;top:196px;font-size:22px;color:#d8c79c">${p.col}</div>
    <ul class="ck a" style="left:48px;top:262px;width:560px;font-size:23px">${p.items.map((x) => `<li>${x}</li>`).join('')}</ul>
    <div class="a" style="left:48px;top:${k === 'basic' ? 560 : 640}px"><span class="pill" style="font-size:18px">Lieferzeit ${p.d}</span> <span class="pill" style="font-size:18px">${p.rev}</span></div>
    ${shots.map((s) => shot(...s)).join('')}
    <div class="foot">${COPY}</div>`; };
}

(async () => {
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
  const manual = path.join(BASE, 'IT-WORLD-Compliance-Assistent-Benutzerhandbuch.pdf');
  for (const pg of [1, 9, 13]) execFileSync('pdftoppm', ['-r', '90', '-png', '-singlefile', '-f', String(pg), '-l', String(pg), manual, path.join(WORK, 'pdf-' + String(pg).padStart(2, '0'))]);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const [name, fn] of Object.entries(images).sort()) {
    const f = path.join(WORK, name + '.html');
    fs.writeFileSync(f, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${fn()}</body></html>`);
    await page.goto(u(f));
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all(Array.from(document.images).map((i) => (i.complete ? 1 : new Promise((r) => (i.onload = r))))));
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('Bild', name);
  }
  await browser.close();
})();
