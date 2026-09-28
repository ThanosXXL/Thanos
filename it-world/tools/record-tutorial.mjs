// Nimmt das Anleitungsvideo auf (marketing/output/it-world-anleitung.mp4):
// startet die App mit frischen Demo-Daten, klickt sich mit sichtbarem Mauszeiger
// und deutschen Untertiteln durch alle Seiten und wandelt die Aufnahme mit ffmpeg
// in MP4 (H.264) um. Zusätzlich entsteht eine Kapitelliste mit Zeitmarken.
// Benötigt: Playwright + Chromium sowie ffmpeg (im PATH oder über FFMPEG_PATH).
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'marketing', 'output');
const SLIDE = pathToFileURL(path.join(ROOT, 'marketing', 'tutorial-slide.html')).href;
const PORT = 8198;
const BASE = `http://localhost:${PORT}`;
const W = 1280, H = 720;
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Playwright fehlt: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const tmp = mkdtempSync(path.join(tmpdir(), 'itw-video-'));
const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
  env: { ...process.env, PORT: String(PORT), DATA_FILE: path.join(tmp, 'data.json'), DEMO_MODE: 'true', NODE_ENV: 'development', DEPLOY_FAILURE_RATE: '0' },
  stdio: 'ignore',
});
const exited = new Promise(r => server.once('exit', r));

// ---------- Overlays: Mauszeiger mit Klick-Welle + Untertitelleiste ----------
// Läuft in jedem geladenen Dokument (auch nach Seitenwechseln).
function overlayInit() {
  const setup = () => {
    if (document.getElementById('__cursor')) return;
    const cur = document.createElement('div');
    cur.id = '__cursor';
    Object.assign(cur.style, { position: 'fixed', left: '640px', top: '360px', width: '22px', height: '22px', marginLeft: '-4px', marginTop: '-3px',
      zIndex: 2147483647, pointerEvents: 'none', transition: 'transform .12s' });
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.documentElement.append(cur);
    addEventListener('mousemove', e => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', e => {
      cur.style.transform = 'scale(.8)';
      const r = document.createElement('div');
      Object.assign(r.style, { position: 'fixed', left: e.clientX - 18 + 'px', top: e.clientY - 18 + 'px', width: '36px', height: '36px', borderRadius: '50%',
        border: '3px solid #f3cf6b', zIndex: 2147483646, pointerEvents: 'none', transition: 'transform .45s ease-out, opacity .45s ease-out' });
      document.documentElement.append(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 500);
    }, true);
    addEventListener('mouseup', () => { cur.style.transform = ''; }, true);

    const bar = document.createElement('div');
    bar.id = '__caption';
    Object.assign(bar.style, { position: 'fixed', left: '50%', bottom: '26px', transform: 'translateX(-50%)', maxWidth: '1040px', minWidth: '420px',
      padding: '14px 26px 16px', borderRadius: '16px', background: 'rgba(8,7,6,.9)', border: '1px solid rgba(212,165,58,.55)',
      boxShadow: '0 16px 40px rgba(0,0,0,.6)', color: '#fff', fontFamily: 'Montserrat, system-ui, sans-serif', textAlign: 'center',
      zIndex: 2147483645, pointerEvents: 'none', transition: 'opacity .25s', opacity: '0' });
    const chap = document.createElement('div');
    Object.assign(chap.style, { fontSize: '12px', letterSpacing: '.22em', textTransform: 'uppercase', color: '#f3cf6b', fontWeight: '700', marginBottom: '4px' });
    const txt = document.createElement('div');
    Object.assign(txt.style, { fontSize: '21px', fontWeight: '600', lineHeight: '1.4' });
    bar.append(chap, txt);
    document.documentElement.append(bar);
    window.__setCaption = (c, t) => { chap.textContent = c || ''; txt.textContent = t || ''; bar.style.opacity = t ? '1' : '0'; };
    if (window.__pendingCaption) window.__setCaption(...window.__pendingCaption);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
}

// Handy-Rahmen für den Responsive-Teil (wird per page.route ausgeliefert)
const PHONE_HTML = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><link rel="stylesheet" href="/style.css"></head>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;gap:80px;background:radial-gradient(700px 500px at 60% 50%,rgba(212,165,58,.18),transparent 70%),#050505">
<div style="max-width:420px"><div class="gold-text" style="font-size:22px;font-weight:900;letter-spacing:.08em">IT - WORLD</div>
<div style="font-size:44px;font-weight:800;line-height:1.1;margin-top:12px">Auch unterwegs<br>voll bedienbar</div>
<div style="color:#bdb6a8;font-size:18px;margin-top:14px">Responsive für Handy, Tablet und Desktop</div></div>
<div style="width:356px;height:640px;border-radius:44px;border:4px solid #d4a53a;padding:10px;background:#0b0a09;box-shadow:0 30px 70px rgba(0,0,0,.8),0 0 40px rgba(212,165,58,.25)">
<iframe id="phone" src="/#/overview" style="width:100%;height:100%;border:0;border-radius:34px;background:#070707"></iframe></div>
<script>const f=document.getElementById('phone');const c=()=>document.getElementById('__cursor');
f.addEventListener('mouseenter',()=>{if(c())c().style.visibility='hidden'});f.addEventListener('mouseleave',()=>{if(c())c().style.visibility='visible'});</script>
</body></html>`;

const wait = (ms) => new Promise(r => setTimeout(r, ms));
let page, chapter = '', caption = '', t0 = 0;
const chapters = [];

async function applyCaption() {
  await page.evaluate(([c, t]) => {
    window.__pendingCaption = [c, t];
    if (window.__setCaption) window.__setCaption(c, t);
  }, [chapter, caption]).catch(() => {});
}
// Neues Kapitel (für Untertitel-Kopfzeile und Kapitelliste)
function chap(name) {
  chapter = name;
  chapters.push([Date.now() - t0, name]);
  console.log(`▶ ${name}`);
}
// Untertitel zeigen und Lesezeit abwarten
async function say(text, extraMs = 0) {
  caption = text;
  await applyCaption();
  const words = text.split(/\s+/).length;
  await wait(Math.max(2600, words * 330) + extraMs);
}
async function point(loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 28 });
  await wait(250);
}
async function click(loc) { await point(loc); await loc.click(); await wait(600); }
async function type(loc, text) { await click(loc); await loc.fill(''); await loc.pressSequentially(text, { delay: 45 }); await wait(300); }
async function select(loc, value) { await point(loc); await loc.selectOption(value); await wait(600); }
async function nav(id) { await click(page.locator(`#nav a[href="#/${id}"]`)); await wait(900); }
async function slide(s, holdMs) {
  await page.goto(SLIDE);
  await page.evaluate((x) => window.setSlide(x), s);
  caption = ''; await applyCaption();
  await wait(holdMs);
}

try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/healthz`)).ok) break; } catch { /* Server startet noch */ }
    await wait(200);
  }
  const launchOpts = { args: ['--allow-file-access-from-files'] };
  if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({ viewport: { width: W, height: H }, bypassCSP: true, recordVideo: { dir: tmp, size: { width: W, height: H } } });
  await context.addInitScript(overlayInit);
  page = await context.newPage();
  t0 = Date.now();
  page.on('load', () => applyCaption());

  // ===== Intro =====
  chap('Einführung');
  await slide({ kicker: 'Video-Anleitung', title: 'Internal Admin\n& Ops Dashboard',
    lines: ['Installation & Start', 'Alle 8 Seiten Schritt für Schritt', 'Rollen, Sicherheit & Betrieb'] }, 6500);

  // ===== Installation =====
  chap('Installation & Start');
  await slide({ kicker: 'Schritt 1', title: 'Installation & Start',
    code: ['# Voraussetzung: Node.js 18 oder neuer', 'cd it-world', 'npm install', 'npm start', '# → im Browser öffnen: http://localhost:8080'] }, 9000);
  await slide({ kicker: 'Alternative', title: 'Start mit Docker',
    code: ['# ADMIN_EMAIL / ADMIN_PASSWORD in docker-compose.yml setzen', 'docker compose up -d --build', '# Daten liegen dauerhaft im Volume „it-world-data“',
      '# Status-Check: http://localhost:8080/healthz'] }, 9000);

  // ===== Login =====
  chap('Anmeldung');
  await page.goto(`${BASE}/login`);
  await wait(800);
  await say('Nach dem Start öffnest du die Adresse im Browser und landest auf der Anmeldeseite.');
  await say('Im Demo-Modus stehen unten Test-Zugänge. Im Produktionsbetrieb gibt es genau ein Admin-Konto aus deinen Einstellungen.');
  await type(page.locator('#email'), 'admin@it-world.local');
  await type(page.locator('#password'), 'ItWorld-Admin-2026');
  await say('E-Mail und Passwort eingeben und auf „Anmelden“ klicken.', -1200);
  await click(page.locator('#loginBtn'));
  await page.waitForURL(`${BASE}/`);
  await wait(1500);

  // ===== Passwort ändern =====
  chap('Passwort ändern');
  await say('Als Erstes solltest du dein Startpasswort ändern – über dein Profil oben rechts.');
  await click(page.locator('#userChip'));
  await click(page.locator('[data-cmd=password]'));
  await type(page.locator('#f_current'), 'ItWorld-Admin-2026');
  await type(page.locator('#f_next'), 'MeinNeuesPasswort2026');
  await type(page.locator('#f_repeat'), 'MeinNeuesPasswort2026');
  await say('Neue Passwörter brauchen mindestens 10 Zeichen mit Buchstaben und Ziffern. Alle anderen Sitzungen werden dabei abgemeldet.');
  await click(page.locator('.modal button[type=submit]'));
  await wait(1200);

  // ===== Übersicht =====
  chap('Übersicht');
  await nav('overview');
  await say('Die Übersicht zeigt dir alles Wichtige auf einen Blick: Services, offene Incidents, Tickets, Deploy-Erfolgsquote, Traffic und aktive Sitzungen.');
  await point(page.locator('.chart svg').first());
  await page.mouse.move(700, 470, { steps: 30 });
  await page.mouse.move(900, 470, { steps: 50 });
  await say('Fährst du mit der Maus über das Diagramm, siehst du die genauen Werte jeder Stunde.');
  await click(page.locator('.seg button', { hasText: 'Tabelle' }).first());
  await say('Mit „Tabelle“ bekommst du dieselben Daten als Liste – praktisch zum Nachlesen.');
  await click(page.locator('.seg button', { hasText: 'Diagramm' }).first());
  await page.mouse.wheel(0, 500); await wait(1200);
  await say('Darunter: Service-Status, aktive Incidents, Tickets nach Status und die letzten Deployments. Die Seite aktualisiert sich automatisch.');
  await page.mouse.wheel(0, -1000); await wait(800);

  // ===== Monitoring =====
  chap('Monitoring');
  await nav('monitoring');
  await say('Im Monitoring siehst du jeden Service mit CPU, Arbeitsspeicher und Latenz. Oben das Detail-Diagramm des gewählten Service.');
  await page.mouse.wheel(0, 450); await wait(900);
  await click(page.locator('.svc', { hasText: 'Payment Service' }));
  await wait(800);
  await page.mouse.wheel(0, -1000); await wait(700);
  await say('Ein Klick auf eine Kachel wählt den Service aus. Der Payment Service ist gerade „Eingeschränkt“ – die Latenz ist erhöht.');
  await click(page.locator('.seg button', { hasText: 'Latenz' }));
  await click(page.locator('.seg button', { hasText: '24 Std.' }));
  await say('Oben wählst du Metrik und Zeitraum – hier die Latenz der letzten 24 Stunden.');
  await click(page.locator('button', { hasText: 'Neustart' }));
  await say('Mit „Neustart“ löst du einen Rolling Restart aus. Kritische Aktionen musst du immer bestätigen.', -800);
  await click(page.locator('.modal .btn-danger'));
  await wait(1200);
  await say('Der Service ist wieder betriebsbereit. Status setzen und Neustarts dürfen Administratoren und Operations.');

  // ===== Incidents =====
  chap('Incidents');
  await nav('incidents');
  await say('Unter Incidents verwaltest du Störungen – nach Schweregrad SEV1 bis SEV4 und Status.');
  await click(page.locator('button', { hasText: 'Incident melden' }));
  await type(page.locator('#f_title'), 'Checkout liefert Fehler 500');
  await select(page.locator('#f_severity'), 'SEV2');
  await select(page.locator('#f_serviceId'), { label: 'API Gateway' });
  await type(page.locator('#f_description'), 'Seit 10:15 Uhr schlagen ca. 5 % der Bestellungen fehl.');
  await say('Titel, Schweregrad, betroffenen Service, Zuständigkeit und eine Beschreibung eintragen – dann „Melden“.', -1000);
  await click(page.locator('.modal button[type=submit]'));
  await wait(1000);
  await click(page.locator('tr', { hasText: 'Checkout liefert Fehler 500' }));
  await say('Ein Klick auf den Incident öffnet die Details mit dem kompletten Verlauf.');
  await type(page.locator('.modal textarea'), 'Ursache gefunden: fehlerhaftes Zertifikat. Fix ist ausgerollt.');
  await select(page.locator('.modal select').nth(0), 'monitoring');
  await say('Updates für das Team schreiben und den Status weiterschalten: Offen, Analyse, Beobachtung, Gelöst.', -800);
  await click(page.locator('.modal button', { hasText: 'Speichern' }));
  await wait(1200);

  // ===== Tickets =====
  chap('Tickets');
  await nav('tickets');
  await say('Die Tickets sind dein Service Desk. Oben kannst du suchen und nach Status, Priorität oder „Nur meine“ filtern.');
  await type(page.locator('.content input[type=search]'), 'SSL');
  await wait(900);
  await say('Die Suche filtert sofort – hier nach „SSL“.', -800);
  await page.locator('.content input[type=search]').fill('');
  await wait(900);
  await click(page.locator('button', { hasText: 'Neues Ticket' }));
  await type(page.locator('#f_title'), 'Neuen Mitarbeiter-Laptop einrichten');
  await type(page.locator('#f_description'), 'Windows 11, Office, VPN und MFA für Sales-Team.');
  await select(page.locator('#f_priority'), 'hoch');
  await select(page.locator('#f_assignee'), { label: 'Sara König' });
  await type(page.locator('#f_requester'), 'Vertrieb');
  await say('Neues Ticket: Titel, Beschreibung, Priorität, zuständige Person und anfragende Stelle – dann „Anlegen“.', -1000);
  await click(page.locator('.modal button[type=submit]'));
  await wait(1000);
  await click(page.locator('tr', { hasText: 'Neuen Mitarbeiter-Laptop einrichten' }));
  await select(page.locator('.modal select').nth(1), 'in Arbeit');
  await type(page.locator('.modal textarea').nth(1), 'Gerät ist bestellt, Einrichtung morgen.');
  await say('Im Ticket änderst du Status und Zuständigkeit und hinterlässt Kommentare für das Team.', -800);
  await click(page.locator('.modal button', { hasText: 'Speichern' }));
  await wait(1000);
  await point(page.locator('a', { hasText: 'CSV-Export' }));
  await say('Mit „CSV-Export“ lädst du alle Tickets als Excel-kompatible Datei herunter.');

  // ===== Deployments =====
  chap('Deployments');
  await nav('deployments');
  await say('Unter Deployments siehst du alle Auslieferungen nach Staging und Produktion – mit Status, Dauer und Notiz.');
  await click(page.locator('button', { hasText: 'Deployment starten' }));
  await select(page.locator('#f_serviceId'), { index: 1 });
  await type(page.locator('#f_version'), 'v2.9.0');
  await select(page.locator('#f_environment'), 'production');
  await type(page.locator('#f_notes'), 'Passkey-Login für alle Kunden');
  await say('Service wählen, neue Version und Umgebung eintragen und starten.', -600);
  await click(page.locator('.modal button[type=submit]'));
  await say('Die Pipeline läuft – der Status wechselt automatisch von „Läuft“ auf „Erfolgreich“.', 2500);
  await page.waitForFunction(() => !document.querySelector('.content')?.textContent.includes('Läuft'), null, { timeout: 20000 }).catch(() => {});
  await wait(800);
  await point(page.locator('button', { hasText: 'Rollback' }).first());
  await say('Geht etwas schief, setzt „Rollback“ den Service auf die vorherige Version zurück.');

  // ===== Benutzer =====
  chap('Benutzer & Rollen');
  await nav('users');
  await say('Benutzer verwalten nur Administratoren. Es gibt drei Rollen: Administrator, Operations und Nur Lesen.');
  await click(page.locator('button', { hasText: 'Benutzer anlegen' }));
  await type(page.locator('#f_name'), 'Lena Schmidt');
  await type(page.locator('#f_email'), 'lena.schmidt@it-world.local');
  await select(page.locator('#f_role'), 'ops');
  await type(page.locator('#f_password'), 'Startpasswort2026');
  await say('Name, E-Mail, Rolle und ein Startpasswort vergeben. Beim ersten Login muss es geändert werden.', -800);
  await click(page.locator('.modal button[type=submit]'));
  await wait(1000);
  const row = page.locator('tr', { hasText: 'Lena Schmidt' });
  await click(row.locator('button', { hasText: 'Passwort zurücksetzen' }));
  await say('Hat jemand sein Passwort vergessen, erzeugst du ein temporäres Passwort.', -1000);
  await click(page.locator('.modal .btn-danger'));
  await wait(800);
  await say('Es wird nur einmal angezeigt – gib es sicher weiter. Deaktivieren oder Rolle ändern geht über „Bearbeiten“.');
  await click(page.locator('.modal button', { hasText: 'Fertig' }));
  await wait(800);

  // ===== Audit-Log =====
  chap('Audit-Log');
  await nav('audit');
  await say('Das Audit-Log protokolliert jede Aktion: wer, was, wann und von welcher IP – auch fehlgeschlagene Logins.');
  await select(page.locator('.content select'), 'ticket');
  await say('Filtere nach Bereich – hier alle Ticket-Aktionen – oder durchsuche das Protokoll. Auch hier gibt es einen CSV-Export.');

  // ===== Einstellungen =====
  chap('Einstellungen');
  await nav('settings');
  await say('In den Einstellungen legst du Firmenname, Alarm-E-Mail, Session-Timeout, SLA-Ziel und das Aktualisierungsintervall fest.');
  await click(page.locator('input[name=maintenanceMode]'));
  await say('Der Wartungsmodus sperrt alle Änderungen für Nicht-Administratoren – ideal für Updates.', -800);
  await click(page.locator('button', { hasText: 'Einstellungen speichern' }));
  await wait(1200);
  await say('Oben erscheint jetzt der Hinweis „Wartungsmodus aktiv“. Zum Beenden einfach wieder abwählen und speichern.');
  await click(page.locator('input[name=maintenanceMode]'));
  await click(page.locator('button', { hasText: 'Einstellungen speichern' }));
  await wait(1000);

  // ===== Handy (App im Handy-Rahmen, gleiche Origin → Sitzung bleibt erhalten) =====
  chap('Auf dem Handy');
  await page.route(`${BASE}/__tutorial-phone`, route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: PHONE_HTML }));
  // Die App verbietet Einbettung (X-Frame-Options/CSP) – nur für diese Aufnahme im Rahmen erlauben
  await page.route(`${BASE}/`, async route => {
    const res = await route.fetch();
    const headers = { ...res.headers() };
    delete headers['x-frame-options']; delete headers['content-security-policy'];
    await route.fulfill({ response: res, headers });
  });
  await page.goto(`${BASE}/__tutorial-phone`);
  const phone = page.frameLocator('#phone');
  await phone.locator('#menuToggle').waitFor();
  await wait(1000);
  await say('Das Dashboard passt sich jedem Bildschirm an – auf Handy und Tablet genauso wie am PC.');
  await click(phone.locator('#menuToggle'));
  await say('Das Menü öffnest du auf dem Handy über das Symbol ☰ oben links.', -800);
  await click(phone.locator('#nav a[href="#/tickets"]'));
  await wait(1500);
  caption = ''; await applyCaption();
  await page.goto(`${BASE}/#/overview`);
  await wait(800);

  // ===== Abmelden =====
  chap('Abmelden');
  await nav('overview');
  await click(page.locator('#userChip'));
  await say('Zum Abmelden öffnest du dein Profil und wählst „Abmelden“. Nach Inaktivität meldet das System dich automatisch ab.', -800);
  await click(page.locator('[data-cmd=logout]'));
  await wait(1500);

  // ===== Produktion & Outro =====
  chap('Tipps für den Betrieb');
  await slide({ kicker: 'Tipps für den Betrieb', title: 'Sicher im\nProduktivbetrieb',
    lines: ['NODE_ENV=production setzen – keine Demo-Konten', 'HTTPS über Reverse-Proxy (nginx, Traefik), COOKIE_SECURE=true',
      'Datendatei bzw. Docker-Volume regelmäßig sichern', 'npm run reset-data setzt Demo-Daten zurück'] }, 11000);
  chap('Abschluss');
  await slide({ kicker: 'Fertig!', title: 'Viel Erfolg mit\ndeinem Dashboard',
    lines: ['Fragen? Schreib mir über den Fiverr-Chat', 'Änderungswünsche = deine Revisionen'] }, 7000);

  const video = page.video();
  await context.close();
  await browser.close();
  const webm = await video.path();

  // ---------- In MP4 umwandeln ----------
  mkdirSync(OUT, { recursive: true });
  const mp4 = path.join(OUT, 'it-world-anleitung.mp4');
  const r = spawnSync(FFMPEG, ['-y', '-i', webm, '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-an', mp4], { stdio: ['ignore', 'ignore', 'pipe'] });
  if (r.status !== 0) {
    const fallback = path.join(OUT, 'it-world-anleitung.webm');
    renameSync(webm, fallback);
    console.error(`ffmpeg nicht verfügbar – Aufnahme als ${fallback} gespeichert.\n${r.stderr || r.error || ''}`);
  } else console.log(`✔ ${path.relative(ROOT, mp4)}`);

  const fmt = (ms) => { const s = Math.round(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const list = chapters.map(([ms, name]) => `${fmt(ms)} ${name}`).join('\n');
  writeFileSync(path.join(OUT, 'it-world-anleitung-kapitel.txt'), `IT - World · Anleitungsvideo – Kapitel\n\n${list}\n`);
  console.log(list);
} finally {
  server.kill('SIGTERM');
  await exited;
  rmSync(tmp, { recursive: true, force: true });
}
