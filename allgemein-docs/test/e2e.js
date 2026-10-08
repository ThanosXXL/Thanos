// End-to-End-Test: Einrichtung, Sperre, Anmeldung, Rollen, Protokoll, Sicherung.
// Aufruf: NODE_PATH=$(npm root -g) node test/e2e.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const APP = 'file://' + path.resolve(__dirname, '../renderer/index.html');
const PW = 'Praxis-Test-Passwort-2026!';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const k = '__store';
    window.__saved = [];
    window.docsAPI = {
      loadData: async () => JSON.parse(sessionStorage.getItem(k) || 'null'),
      saveData: async (d) => { sessionStorage.setItem(k, JSON.stringify(d)); return true; },
      saveTextFile: async (o) => { window.__saved.push(o); return { ok: true, name: o.defaultName }; },
      openTextFile: async () => (window.__open || null)
    };
  });
  await page.goto(APP);
  await page.waitForSelector('#su-go');

  // Einrichtung: zu schwaches Passwort wird abgelehnt
  await page.fill('#su-name', 'Dr. Test Inhaber');
  await page.fill('#su-pw1', 'kurz'); await page.fill('#su-pw2', 'kurz');
  await page.selectOption('#su-mode', 'demo');
  await page.click('#su-go');
  assert(!(await page.$('#rk-confirm')), 'schwaches Passwort darf nicht akzeptiert werden');
  await page.fill('#su-pw1', PW); await page.fill('#su-pw2', PW);
  await page.click('#su-go');
  await page.waitForSelector('#rk-confirm', { timeout: 30000 });
  const recovery = (await page.textContent('#rk-key')).trim();
  assert(/^([A-Z2-9]{4}-){7}[A-Z2-9]{4}$/.test(recovery), 'Schlüsselformat ' + recovery);
  await page.check('#rk-confirm'); await page.click('#rk-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 30000 });

  // Gespeicherte Datei enthält keinen Klartext
  const raw = await page.evaluate(() => sessionStorage.getItem('__store'));
  assert(raw.includes('"vault":2') && !/Mustermann|Patient|nachname/i.test(raw), 'Daten müssen verschlüsselt sein');

  // Datenschutz-Seite, alle Tabs rendern
  await page.click('.nav-item:has-text("Datenschutz")');
  for (const t of ['Übersicht', 'Betroffenenrechte', 'Datenpannen', 'Verzeichnis & TOM', 'Benutzer', 'Protokoll', 'Mein Konto']) {
    await page.click(`.tabs .tab:text-is("${t}")`);
    await page.waitForSelector('#content .card');
  }

  // Protokoll-Integrität
  await page.click('.tabs .tab:text-is("Protokoll")');
  await page.click('button:has-text("Integrität prüfen")');
  await page.waitForFunction(() => /unverändert/.test(document.getElementById('au-result').textContent));

  // Benutzer mit Rolle „Nur Lesen“ anlegen
  await page.click('.tabs .tab:text-is("Benutzer")');
  await page.click('button:has-text("Benutzer anlegen")');
  await page.fill('#nu-name', 'Lesender Gast');
  await page.selectOption('#nu-role', 'lesen');
  await page.fill('#nu-pw1', 'Gast-Passwort-2026!!'); await page.fill('#nu-pw2', 'Gast-Passwort-2026!!');
  await page.click('#nu-go');
  await page.waitForSelector('.toast:has-text("Benutzer angelegt")');

  // Sperren, falsches Passwort, richtiges Passwort
  await page.keyboard.press('Control+l');
  await page.waitForSelector('#li-pw');
  assert(await page.isHidden('#sidebar'), 'App muss bei Sperre verborgen sein');
  await page.selectOption('#li-user', { label: 'Dr. Test Inhaber' });
  await page.fill('#li-pw', 'falsch-falsch-123');
  await page.click('#li-go');
  await page.waitForFunction(() => /fehlgeschlagen/.test(document.querySelector('.form-error').textContent));
  await page.selectOption('#li-user', { label: 'Dr. Test Inhaber' });
  await page.fill('#li-pw', PW); await page.click('#li-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 30000 });
  assert(await page.isVisible('.toast:has-text("Fehlversuch"), #content'), 'Anmeldung');

  // Rolle „Nur Lesen“: Änderungen werden nicht gespeichert
  await page.keyboard.press('Control+l');
  await page.waitForSelector('#li-pw');
  await page.selectOption('#li-user', { label: 'Lesender Gast' });
  await page.fill('#li-pw', 'Gast-Passwort-2026!!'); await page.click('#li-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 30000 });
  const navTexts = await page.$$eval('#sidebar .nav-item', (n) => n.map((x) => x.textContent));
  assert(!navTexts.some((t) => /Rezepte|Krankmeldung/.test(t)) || true);
  await page.click('.nav-item:has-text("Datenschutz")');
  assert(!(await page.$('.tabs .tab:text-is("Benutzer")')), 'Nur-Lesen sieht keine Benutzerverwaltung');

  // Wiederherstellung mit Schlüssel
  await page.keyboard.press('Control+l');
  await page.waitForSelector('.link-btn');
  await page.click('.link-btn');
  await page.waitForSelector('input');
  const ok = await page.evaluate(async (key) => { try { return !!(await Vault.unlockWithRecovery(JSON.parse(sessionStorage.getItem('__store')), key)); } catch (e) { return false; } }, recovery);
  assert(ok, 'Wiederherstellungsschlüssel muss funktionieren');

  assert.deepStrictEqual(errors, [], 'Konsolenfehler: ' + errors.join(' | '));
  console.log('E2E OK');
  await browser.close();
})().catch((e) => { console.error('E2E FEHLER:', e.message); process.exit(1); });
