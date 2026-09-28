'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const db = require('../src/db');
const { createApp } = require('../src/app');
const { seed } = require('../src/seed');

let server;
let base;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'itw-test-'));

before(async () => {
  const database = db.open(path.join(tmp, 't.db'));
  seed(database, { demo: false, log: () => {} });
  server = http.createServer(createApp(database, { dbFile: path.join(tmp, 't.db'), allowRegistration: true }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

function client() {
  let cookie = '';
  const call = async (method, url, body, headers = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'X-IT-World': '1', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const type = res.headers.get('content-type') || '';
    return { status: res.status, data: type.includes('json') ? await res.json() : await res.text(), headers: res.headers };
  };
  return { call, get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b), del: (u) => call('DELETE', u) };
}

let admin;

test('Anmeldung, Passwortzwang und Passwortwechsel', async () => {
  admin = client();
  assert.equal((await admin.post('/api/auth/login', { email: 'admin@it-world.de', passwort: 'falsch' })).status, 401);
  const r = await admin.post('/api/auth/login', { email: 'admin@it-world.de', passwort: 'admin1234' });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.mussPasswortAendern, true);
  assert.equal((await admin.get('/api/dashboard')).status, 403);
  assert.equal((await admin.post('/api/auth/passwort', { alt: 'admin1234', neu: 'kurz' })).status, 400);
  assert.equal((await admin.post('/api/auth/passwort', { alt: 'admin1234', neu: 'NeuesPasswort1' })).status, 200);
  assert.equal((await admin.get('/api/dashboard')).status, 200);
});

test('CSRF-Schutz: schreibende Anfragen ohne Header werden abgelehnt', async () => {
  const r = await admin.call('POST', '/api/r/kunden', { name: 'X' }, { 'X-IT-World': '' });
  assert.equal(r.status, 403);
});

test('Sicherheits-Header werden gesetzt', async () => {
  const r = await admin.get('/');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
});

test('Kunde anlegen mit Validierung und Nummernkreis', async () => {
  assert.equal((await admin.post('/api/r/kunden', { name: '' })).status, 400);
  assert.equal((await admin.post('/api/r/kunden', { name: 'A', email: 'kein-mail' })).status, 400);
  const r = await admin.post('/api/r/kunden', { name: 'Testkunde GmbH', email: 'info@test.de', zahlungsziel: 10 });
  assert.equal(r.status, 200);
  assert.equal(r.data.nummer, 'K-0001');
  assert.equal(r.data.status, 'Aktiv');
  const list = await admin.get('/api/r/kunden?q=Testkunde');
  assert.equal(list.data.total, 1);
});

test('Rechnung: Summen, Festschreiben, Lagerbuchung, Zahlungen, Storno', async () => {
  const kunde = (await admin.get('/api/r/kunden?q=Testkunde')).data.items[0];
  const prod = (await admin.post('/api/r/produkte', { name: 'Router', preis: 100, bestand: 10, mwst: '19' })).data;
  const re = (await admin.post('/api/r/rechnungen', {
    kunde_id: kunde.id, datum: '2026-01-10',
    positionen: [
      { produkt_id: prod.id, bezeichnung: 'Router', menge: 2, preis: 100, mwst: 19 },
      { bezeichnung: 'Fachbuch', menge: 1, preis: 50, mwst: 7, rabatt: 10 },
    ],
  })).data;
  assert.equal(re.netto, 245);
  assert.equal(re.steuer, 41.15); // 38,00 + 3,15
  assert.equal(re.brutto, 286.15);
  assert.equal(re.faellig, '2026-01-20'); // Zahlungsziel des Kunden
  assert.match(re.nummer, /^RE-\d{4}-0001$/);
  assert.equal((await admin.post('/api/r/zahlungen', { beleg_id: re.id, betrag: 10 })).status, 400, 'Zahlung auf Entwurf');

  await admin.put(`/api/r/rechnungen/${re.id}`, { status: 'Offen' });
  assert.equal((await admin.get(`/api/r/produkte/${prod.id}`)).data.bestand, 8);
  const lock = await admin.put(`/api/r/rechnungen/${re.id}`, { positionen: [{ bezeichnung: 'Neu', menge: 1, preis: 1 }] });
  assert.equal(lock.status, 400, 'festgeschriebene Rechnung ist gesperrt');
  assert.equal((await admin.del(`/api/r/rechnungen/${re.id}`)).status, 400);

  await admin.post('/api/r/zahlungen', { beleg_id: re.id, betrag: 100 });
  let cur = (await admin.get(`/api/r/rechnungen/${re.id}`)).data;
  assert.equal(cur.status, 'Teilbezahlt');
  assert.equal(cur.offen, 186.15);
  assert.equal(cur.ueberfaellig, true);
  await admin.put(`/api/r/rechnungen/${re.id}`, { status: 'Bezahlt' });
  cur = (await admin.get(`/api/r/rechnungen/${re.id}`)).data;
  assert.equal(cur.status, 'Bezahlt');
  assert.equal(cur.bezahlt, 286.15);

  await admin.put(`/api/r/rechnungen/${re.id}`, { status: 'Storniert' });
  assert.equal((await admin.get(`/api/r/produkte/${prod.id}`)).data.bestand, 10, 'Storno bucht Lager zurück');
});

test('Angebot in Auftrag und Rechnung umwandeln', async () => {
  const kunde = (await admin.get('/api/r/kunden?q=Testkunde')).data.items[0];
  const an = (await admin.post('/api/r/angebote', { kunde_id: kunde.id, betreff: 'Website', positionen: [{ bezeichnung: 'Webdesign', menge: 10, preis: 90 }] })).data;
  assert.match(an.nummer, /^AN-/);
  const ab = await admin.post(`/api/r/angebote/${an.id}/umwandeln`, { ziel: 'auftraege' });
  assert.equal(ab.status, 200);
  assert.match(ab.data.nummer, /^AB-/);
  assert.equal(ab.data.netto, 900);
  assert.equal((await admin.get(`/api/r/angebote/${an.id}`)).data.status, 'Angenommen');
  const re = await admin.post(`/api/r/auftraege/${ab.data.id}/umwandeln`, { ziel: 'rechnungen' });
  assert.equal(re.data.brutto, 1071);
  assert.equal((await admin.post(`/api/r/rechnungen/${re.data.id}/umwandeln`, { ziel: 'angebote' })).status, 400);
});

test('Projektzeiten abrechnen', async () => {
  const kunde = (await admin.get('/api/r/kunden?q=Testkunde')).data.items[0];
  const pr = (await admin.post('/api/r/projekte', { name: 'Relaunch', kunde_id: kunde.id, stundensatz: 100 })).data;
  await admin.post('/api/r/zeiten', { projekt_id: pr.id, stunden: 2.5, beschreibung: 'Konzept' });
  await admin.post('/api/r/zeiten', { projekt_id: pr.id, stunden: 1, beschreibung: 'Intern', abrechenbar: false });
  const re = await admin.post(`/api/projekte/${pr.id}/abrechnen`);
  assert.equal(re.status, 200);
  assert.equal(re.data.netto, 250);
  assert.equal((await admin.post(`/api/projekte/${pr.id}/abrechnen`)).status, 400, 'keine doppelte Abrechnung');
});

test('Rollen: Mitarbeiter darf keine Rechnungen/Personal, Lesezugriff nichts schreiben', async () => {
  await admin.post('/api/benutzer', { name: 'Mia', email: 'mia@test.de', rolle: 'mitarbeiter', passwort: 'Start1234x' });
  await admin.post('/api/benutzer', { name: 'Leo', email: 'leo@test.de', rolle: 'lesezugriff', passwort: 'Start1234x' });
  const mia = client();
  await mia.post('/api/auth/login', { email: 'mia@test.de', passwort: 'Start1234x' });
  await mia.post('/api/auth/passwort', { alt: 'Start1234x', neu: 'Mia12345678' });
  assert.equal((await mia.post('/api/r/kunden', { name: 'Von Mia' })).status, 200);
  assert.equal((await mia.post('/api/r/rechnungen', { kunde_id: 1 })).status, 403);
  assert.equal((await mia.get('/api/r/mitarbeiter')).status, 403);
  assert.equal((await mia.get('/api/benutzer')).status, 403);
  const me = (await mia.get('/api/auth/me')).data;
  assert.equal(me.perms.rechnungen.write, false);
  const leo = client();
  await leo.post('/api/auth/login', { email: 'leo@test.de', passwort: 'Start1234x' });
  await leo.post('/api/auth/passwort', { alt: 'Start1234x', neu: 'Leo12345678' });
  assert.equal((await leo.get('/api/r/kunden')).status, 200);
  assert.equal((await leo.post('/api/r/kunden', { name: 'Von Leo' })).status, 403);
});

test('Letzter Administrator kann nicht entfernt werden', async () => {
  const me = (await admin.get('/api/auth/me')).data.user;
  assert.equal((await admin.put(`/api/benutzer/${me.id}`, { rolle: 'manager' })).status, 400);
  assert.equal((await admin.del(`/api/benutzer/${me.id}`)).status, 400);
});

test('Mandantentrennung: registrierte Firma sieht keine fremden Daten', async () => {
  const other = client();
  const reg = await other.post('/api/auth/register', { firma: 'Andere Firma', name: 'Olga', email: 'olga@andere.de', passwort: 'Andere1234', agb: true });
  assert.equal(reg.status, 200);
  assert.equal(reg.data.user.rolle, 'admin');
  assert.equal((await other.get('/api/r/kunden')).data.total, 0);
  assert.equal((await other.get('/api/r/kunden/1')).status, 404);
  assert.equal((await other.put('/api/r/kunden/1', { name: 'Hack' })).status, 404);
  assert.equal((await other.post('/api/r/kontakte', { vorname: 'A', nachname: 'B', kunde_id: 1 })).status, 400, 'fremde Referenz');
  const k = (await other.post('/api/r/kunden', { name: 'Eigener Kunde' })).data;
  assert.equal(k.nummer, 'K-0001', 'eigener Nummernkreis');
  assert.equal((await admin.get(`/api/r/kunden/${k.id}`)).status, 404);
});

test('Öffentliches Formular erzeugt Lead und Autoresponder', async () => {
  const anon = client();
  assert.equal((await anon.post('/api/public/form/it-world', { name: 'Max', email: 'max@example.com' })).status, 400, 'Einwilligung fehlt');
  const r = await anon.post('/api/public/form/it-world', { name: 'Max Muster', firma: 'Muster AG', email: 'max@example.com', nachricht: 'Bitte Angebot', einwilligung: true, interesse: 'Webentwicklung' });
  assert.equal(r.status, 200);
  const k = (await admin.get('/api/r/kunden?q=Muster AG')).data.items[0];
  assert.equal(k.status, 'Lead');
  assert.equal(k.quelle, 'Formular');
  assert.equal((await admin.get(`/api/r/deals?f_kunde_id=${k.id}`)).data.total, 1);
  const mails = (await admin.get('/api/emails')).data.items;
  assert.ok(mails.some((m) => m.an === 'max@example.com' && m.bezug === 'Autoresponder'));
});

test('CSV-Export und -Import', async () => {
  const csv = await admin.get('/api/r/kunden/export.csv');
  assert.equal(csv.status, 200);
  assert.match(csv.data, /Firma \/ Name/);
  const imp = await admin.post('/api/r/kunden/import', { csv: 'Firma / Name;Ort;E-Mail\n"=Böse GmbH";Köln;boese@test.de\nZweite AG;Bonn;\n;;' });
  assert.equal(imp.data.importiert, 2);
  const exp = await admin.get('/api/r/kunden/export.csv?q=Böse');
  assert.match(exp.data, /"'=Böse GmbH"/, 'Formel-Injection wird im Export entschärft');
});

test('Dokument-Upload und Download', async () => {
  const up = await admin.post('/api/dokumente/upload', { datei_name: 'vertrag.txt', mime: 'text/plain', data: Buffer.from('Hallo Welt').toString('base64'), kategorie: 'Vertrag' });
  assert.equal(up.status, 200);
  assert.equal(up.data.groesse, 10);
  const dl = await admin.get(`/api/dokumente/${up.data.id}/download`);
  assert.equal(dl.data, 'Hallo Welt');
  assert.equal(dl.headers.get('content-type'), 'application/octet-stream');
  assert.equal((await admin.del(`/api/r/dokumente/${up.data.id}`)).status, 200);
});

test('Dashboard, Berichte, Kalender und Suche liefern Daten', async () => {
  const d = (await admin.get('/api/dashboard')).data;
  assert.equal(d.verlauf.length, 12);
  assert.ok(d.pipeline.length === 6);
  assert.equal((await admin.get('/api/berichte')).data.monate.length, 12);
  assert.equal((await admin.get('/api/kalender?von=2026-01-01&bis=2026-12-31')).status, 200);
  assert.ok((await admin.get('/api/suche?q=Testkunde')).data.treffer.length >= 1);
});
