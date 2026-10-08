// End-to-End-Test: Einrichtung, Sperre, Anmeldung, Wiederherstellung, alle Seiten, Datenrechte, Sicherung, Löschung, Migration.
// Aufruf: NODE_PATH=$(npm root -g) node test/e2e.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const APP = 'file://' + path.resolve(__dirname, '../renderer/index.html');
const PW = 'Patienten-Test-Passwort-2026!';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';

// Ersetzt window.welt durch einen Speicher in sessionStorage (wie der Hauptprozess: nur Tresor-Umschläge)
function mockWelt() {
  const k = '__store';
  window.__saved = [];
  window.__writes = [];
  window.welt = {
    loadData: async () => JSON.parse(sessionStorage.getItem(k) || 'null'),
    saveData: async (d) => {
      if (!d || typeof d.vault !== 'number') return false; // wie main.js: kein Klartext
      sessionStorage.setItem(k, JSON.stringify(d)); window.__writes.push(Date.now()); return true;
    },
    saveTextFile: async (o) => { window.__saved.push(o); return { ok: true, name: o.defaultName }; },
    openTextFile: async () => (window.__open || null),
    deleteAllData: async () => { sessionStorage.removeItem(k); return true; }
  };
}

let passed = 0;
const ok = (cond, msg) => { assert(cond, msg); passed++; console.log('  ok  ' + msg); };

async function setup(page, { mode = 'demo' } = {}) {
  await page.goto(APP);
  await page.waitForSelector('#su-go');
  await page.fill('#su-name', 'Anna Berger');
  await page.selectOption('#su-mode', mode);
  await page.fill('#su-pw1', 'kurz'); await page.fill('#su-pw2', 'kurz');
  await page.click('#su-go');
  ok(!(await page.$('#rk-confirm')), 'schwaches Passwort wird abgelehnt');
  await page.fill('#su-pw1', PW); await page.fill('#su-pw2', PW + 'x');
  await page.click('#su-go');
  ok(/stimmen nicht/.test(await page.textContent('.form-error')), 'unterschiedliche Passwörter werden abgelehnt');
  await page.fill('#su-pw2', PW);
  await page.click('#su-go');
  await page.waitForSelector('#rk-confirm', { timeout: 30000 });
  const recovery = (await page.textContent('#rk-key')).trim();
  ok(/^([A-Z2-9]{4}-){7}[A-Z2-9]{4}$/.test(recovery), 'Wiederherstellungsschlüssel hat das erwartete Format');
  ok(await page.isDisabled('#rk-go'), 'Weiter erst nach Bestätigung des Schlüssels');
  await page.check('#rk-confirm'); await page.click('#rk-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 30000 });
  return recovery;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', (r) => { const f = (r.failure() || {}).errorText || ''; if (!/ABORTED/.test(f)) errors.push('Anfrage fehlgeschlagen: ' + r.url() + ' ' + f); });
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  watch(page);
  await page.clock.install();
  await page.addInitScript(mockWelt);

  console.log('Einrichtung');
  ok(await page.evaluate(() => true), 'Seite lädt');
  const recovery = await setup(page);
  const raw = await page.evaluate(() => sessionStorage.getItem('__store'));
  ok(raw.includes('"vault":1') && !/Berger|Ramipril|Penicillin|medikamente|profil/i.test(raw), 'gespeicherte Datei enthält keinen Klartext');
  ok(JSON.parse(raw).users[0].id === 'patient', 'Umschlag enthält nur die Kennung, keine Gesundheitsdaten');

  console.log('Alle Seiten');
  const navCount = await page.$$eval('#sidebar .nav-item', (n) => n.length);
  ok(navCount === 16, 'Menü hat 16 Einträge in 4 Gruppen: ' + navCount);
  ok((await page.$$eval('#sidebar .nav-group', (n) => n.map((x) => x.textContent))).join('|') === 'Übersicht|Meine Gesundheit|Organisation|System', 'Menügruppen');
  const pages = await page.$$eval('#sidebar .nav-item', (n) => n.map((x) => x.querySelector('span').textContent));
  for (const label of pages) {
    await page.click(`#sidebar .nav-item:has(span:text-is("${label}"))`);
    await page.waitForSelector('#content .view');
    const h1 = await page.textContent('#content h1');
    ok(h1.length > 0 && (await page.$$eval('#content .card', (c) => c.length)) > 0, `Seite „${label}“ rendert (${h1.trim().slice(0, 28)})`);
  }

  console.log('Laborergebnisse');
  await page.click('#sidebar .nav-item:has(span:text-is("Laborergebnisse"))');
  ok((await page.$$eval('.lab-overview tbody tr', (r) => r.length)) === 14, '14 Laborwerte im Überblick');
  ok((await page.$$('.lab-overview .pill.danger')).length > 0 && (await page.$$('.lab-overview .pill.warn')).length > 0 && (await page.$$('.lab-overview .pill.ok')).length > 0, 'Ampel zeigt grün, gelb und rot');
  await page.click('tr[data-param="LDL-Cholesterin"]');
  await page.waitForSelector('.modal svg.lab-chart');
  ok((await page.$$('.modal svg.lab-chart circle')).length === 3, 'Linienverlauf mit 3 Messpunkten');
  await page.click('#kind-bar');
  ok((await page.$$('.modal svg.lab-chart rect.bar')).length === 3, 'Balkenansicht mit 3 Balken');
  ok(await page.isVisible('.modal .ref-band'), 'Referenzband sichtbar');
  await page.keyboard.press('Escape');
  await page.click('.item.clickable:has-text("Laborbefund vom") >> nth=0');
  await page.waitForSelector('.modal .lab-table');
  await page.keyboard.press('Escape');

  console.log('E-Rezepte');
  await page.click('#sidebar .nav-item:has(span:text-is("E-Rezepte"))');
  ok(/Demo – kein gültiger E-Rezept-Token/.test(await page.textContent('.demo-banner')), 'Demo-Hinweis auf der Seite');
  ok((await page.$$('.er-card svg.qr')).length === 4, 'vier Rezepte mit QR-Code');
  await page.click('.er-card >> nth=0');
  await page.waitForSelector('.modal svg.qr');
  ok(/Demo – kein gültiger E-Rezept-Token/.test(await page.textContent('.modal .er-qr')), 'Demo-Hinweis am QR-Code');
  await page.click('#er-redeem');
  await page.waitForSelector('#er-reopen');
  ok(/eingelöst/.test(await page.textContent('.modal .er-head')), 'Einlösung simulieren setzt Status „eingelöst“');
  await page.keyboard.press('Escape');

  console.log('Krankmeldungen, Überweisungen, Karte');
  await page.click('#sidebar .nav-item:has(span:text-is("Krankmeldungen"))');
  ok(/digital an Krankenkasse gesendet/.test(await page.textContent('.item[data-au]')) && /Kopie für Arbeitgeber/.test(await page.textContent('.item[data-au]')), 'eAU-Status-Pillen');
  await page.click('.item[data-au] >> nth=0');
  await page.waitForSelector('.paper-au');
  const auLabels = () => page.$$eval('.paper-au .pf-l', (n) => n.map((x) => x.textContent));
  ok((await auLabels()).includes('Diagnose'), 'Patientenkopie zeigt die Diagnose');
  await page.click('#au-ag');
  ok(!(await auLabels()).includes('Diagnose') && !/Bronchitis/.test(await page.textContent('.paper-au')), 'Arbeitgeber-Kopie zeigt keine Diagnose');
  await page.keyboard.press('Escape');
  await page.click('#sidebar .nav-item:has(span:text-is("Überweisungen"))');
  ok((await page.$$('.item[data-ue]')).length === 3, 'drei Überweisungen');
  await page.click('.item[data-ue] >> nth=0');
  await page.waitForSelector('.paper-ue');
  await page.keyboard.press('Escape');
  await page.click('#sidebar .nav-item:has(span:text-is("Gesundheitskarte"))');
  await page.waitForSelector('.egk', { state: 'visible' });
  ok(true, '3D-Karte sichtbar');
  await page.click('#karte-flip');
  await page.waitForSelector('.egk.back', { state: 'visible' });
  ok(true, 'Kartenrückseite');
  await page.click('#kv-toggle');
  ok(/X123456789/.test(await page.textContent('.kv')), 'Versichertennummer lässt sich einblenden');

  console.log('Vorsorge & Impfungen, Medikamentensuche');
  await page.click('#sidebar .nav-item:has(span:text-is("Vorsorge & Impfungen"))');
  ok((await page.$$('.bell-toggle')).length === 9, 'Erinnerungsglocken für Vorsorge und Impfungen');
  const pressed = () => page.$eval('.bell-toggle >> nth=2', (b) => b.getAttribute('aria-pressed'));
  const was = await pressed();
  await page.click('.bell-toggle >> nth=2');
  ok((await pressed()) !== was, 'Erinnerung umschaltbar');
  await page.click('#sidebar .nav-item:has(span:text-is("Medikamentensuche"))');
  await page.fill('#kat-input', 'ramip');
  await page.waitForSelector('.med-res');
  ok(/Ramipril/.test(await page.textContent('.med-res')) && /C09AA05/.test(await page.textContent('.med-res')), 'Suche findet Ramipril mit ATC-Code');
  await page.click('.med-res >> nth=0 >> .med-packs .chip >> nth=1');
  await page.click('.med-res >> nth=0 >> text=Zu meinen Medikamenten hinzufügen');
  await page.fill('#med-name', await page.inputValue('#med-name'));
  await page.check('[data-z="abends"]');
  await page.click('#med-save');
  await page.click('#sidebar .nav-item:has(span:text-is("Medikamente"))');
  ok((await page.$$eval('.item .title', (t) => t.filter((x) => /^Ramipril 2,5 mg$/.test(x.textContent)).length)) === 2, 'Treffer wurde zu den Medikamenten hinzugefügt (morgens und abends)');

  console.log('Datenschutz & Sicherheit');
  await page.click('#sidebar .nav-item:has(span:text-is("Datenschutz & Sicherheit"))');
  ok(/Sicherheitsprüfungen/.test(await page.textContent('.sec-hero')), 'Sicherheits-Check zeigt Auswertung');
  for (const t of ['Sicherheits-Check', 'Passwort & Sperre', 'Meine Daten', 'Sicherung', 'Einwilligungen & Hinweise']) {
    await page.click(`.tabs .tab:text-is("${t}")`);
    await page.waitForSelector('#content .card');
  }
  await page.click('.tabs .tab:text-is("Passwort & Sperre")');
  await page.selectOption('#autolock', '1');
  ok(true, 'automatische Sperre auf 1 Minute gestellt');
  // Passwort ändern
  const PW2 = 'Neues-Test-Passwort-2027!';
  await page.fill('#pc-cur', 'falsch-falsch-123'); await page.fill('#pc-pw1', PW2); await page.fill('#pc-pw2', PW2);
  await page.click('#pc-go');
  await page.waitForFunction(() => /aktuelle Passwort ist falsch/.test(document.querySelector('.form-error').textContent));
  ok(true, 'Passwortwechsel verlangt das aktuelle Passwort');
  await page.fill('#pc-cur', PW);
  await page.click('#pc-go');
  await page.waitForSelector('.toast:has-text("Passwort geändert")');
  ok(true, 'Passwort geändert');

  console.log('Sperre und Anmeldung');
  await page.keyboard.press('Control+l');
  await page.waitForSelector('#li-pw');
  ok(await page.isHidden('#sidebar'), 'App ist bei Sperre verborgen');
  ok((await page.textContent('#security-root')).indexOf('Ramipril') < 0, 'bei Sperre keine Daten im DOM');
  await page.fill('#li-pw', PW); await page.click('#li-go');
  await page.waitForFunction(() => /fehlgeschlagen/.test(document.querySelector('.form-error').textContent));
  ok(true, 'altes Passwort wird nach der Änderung abgelehnt');
  await page.fill('#li-pw', PW2); await page.click('#li-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 30000 });
  await page.waitForSelector('.modal:has-text("Sicherheitshinweis")');
  ok(/1 fehlgeschlagenen/.test(await page.textContent('.modal')), 'Fehlversuch wird nach dem Entsperren gemeldet');
  await page.keyboard.press('Escape');

  console.log('Automatische Sperre');
  await page.clock.fastForward('02:30');
  await page.waitForSelector('#li-pw');
  ok(/Automatisch gesperrt/.test(await page.textContent('.form-error')), 'Sperre nach Inaktivität');
  await page.fill('#li-pw', PW2); await page.click('#li-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 30000 });

  console.log('Wiederherstellung');
  await page.keyboard.press('Control+l');
  await page.waitForSelector('.link-btn');
  await page.click('.link-btn');
  await page.fill('#rc-key', 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH');
  await page.fill('#rc-pw1', 'Wieder-Neues-Passwort-2028!'); await page.fill('#rc-pw2', 'Wieder-Neues-Passwort-2028!');
  await page.click('#rc-go');
  await page.waitForFunction(() => /ungültig/.test(document.querySelector('.form-error').textContent));
  ok(true, 'falscher Wiederherstellungsschlüssel wird abgelehnt');
  await page.fill('#rc-key', recovery.toLowerCase());
  await page.click('#rc-go');
  await page.waitForSelector('#rk-confirm2', { timeout: 30000 });
  const recovery2 = (await page.textContent('#rk-key2')).trim();
  ok(recovery2 !== recovery, 'nach der Wiederherstellung wird ein neuer Schlüssel angeboten');
  await page.check('#rk-confirm2'); await page.click('#rk-go2');
  await page.waitForSelector('.toast:has-text("Neuer Wiederherstellungsschlüssel")');
  const stillOld = await page.evaluate(async (key) => { try { await Vault.unlockWithRecovery(JSON.parse(sessionStorage.getItem('__store')), key); return true; } catch (e) { return false; } }, recovery);
  const newOk = await page.evaluate(async (key) => { try { await Vault.unlockWithRecovery(JSON.parse(sessionStorage.getItem('__store')), key); return true; } catch (e) { return false; } }, recovery2);
  ok(!stillOld && newOk, 'alter Schlüssel ungültig, neuer Schlüssel gültig');
  const PW3 = 'Wieder-Neues-Passwort-2028!';

  console.log('Datenrechte, Sicherung');
  await page.click('#sidebar .nav-item:has(span:text-is("Datenschutz & Sicherheit"))');
  await page.click('.tabs .tab:text-is("Meine Daten")');
  await page.click('#ds-auskunft');
  await page.waitForSelector('.paper-ask');
  ok(/Art\. 15/.test(await page.textContent('.paper-ask')) && /Keine\. Daten werden nicht übermittelt/.test(await page.textContent('.paper-ask')), 'Auskunftsblatt (Art. 15) mit Empfängerangabe');
  await page.keyboard.press('Escape');
  await page.click('#ds-export');
  await page.fill('#ra-pw', 'falsch'); await page.click('#ra-go');
  await page.waitForFunction(() => /Passwort falsch/.test(document.querySelector('.modal .form-error').textContent));
  ok(true, 'Datenkopie verlangt das richtige Passwort');
  await page.fill('#ra-pw', PW3); await page.click('#ra-go');
  await page.waitForFunction(() => window.__saved.length === 1);
  const copy = JSON.parse(await page.evaluate(() => window.__saved[0].text));
  ok(copy.daten.profil.name === 'Anna Berger' && /Art\. 20/.test(copy.grundlage), 'Datenkopie (Art. 20) enthält die Daten als JSON');
  await page.click('.tabs .tab:text-is("Sicherung")');
  await page.click('#bk-export');
  await page.waitForFunction(() => window.__saved.length === 2);
  const backup = await page.evaluate(() => window.__saved[1].text);
  const be = JSON.parse(backup);
  ok(be.vault === 1 && !/Berger|Ramipril/.test(backup), 'Sicherung ist ein verschlüsselter Umschlag ohne Klartext');
  ok(/pwbackup/.test(await page.evaluate(() => window.__saved[1].defaultName)), 'Sicherungsdatei endet auf .pwbackup');
  // Sicherung einspielen: erst etwas ändern, dann zurückspielen
  await page.click('#sidebar .nav-item:has(span:text-is("Meine Termine"))');
  const before = (await page.$$('.item')).length;
  await page.click('.item >> nth=0 >> button[title="Termin löschen"]');
  await page.click('.modal .btn.danger');
  ok((await page.$$('.item')).length === before - 1, 'Eintrag gelöscht');
  await page.evaluate((b) => { window.__open = { name: 'x.pwbackup', text: b }; }, backup);
  await page.click('#sidebar .nav-item:has(span:text-is("Datenschutz & Sicherheit"))');
  await page.click('.tabs .tab:text-is("Sicherung")');
  await page.click('#bk-import');
  await page.click('.modal .btn.danger');
  await page.waitForSelector('#li-pw');
  await page.fill('#li-pw', PW3); await page.click('#li-go');
  await page.waitForSelector('#sidebar .nav-item', { timeout: 30000 });
  await page.click('#sidebar .nav-item:has(span:text-is("Meine Termine"))');
  ok((await page.$$('.item')).length === before, 'Sicherung eingespielt: gelöschter Eintrag ist zurück');

  console.log('Einwilligungen, Löschung');
  await page.click('#sidebar .nav-item:has(span:text-is("Datenschutz & Sicherheit"))');
  await page.click('.tabs .tab:text-is("Einwilligungen & Hinweise")');
  await page.uncheck('#cons-befundbilder');
  await page.click('#sidebar .nav-item:has(span:text-is("Befunde"))');
  ok(await page.isDisabled('button:has-text("Befund hochladen")'), 'ohne Einwilligung ist das Hochladen gesperrt');
  await page.click('#sidebar .nav-item:has(span:text-is("Datenschutz & Sicherheit"))');
  await page.click('.tabs .tab:text-is("Meine Daten")');
  await page.click('#ds-clear');
  await page.click('.modal .btn.danger');
  await page.click('#sidebar .nav-item:has(span:text-is("Medikamente"))');
  ok(await page.isVisible('.empty'), 'Alle Einträge löschen leert die Listen');
  await page.click('#sidebar .nav-item:has(span:text-is("Datenschutz & Sicherheit"))');
  await page.click('.tabs .tab:text-is("Meine Daten")');
  await page.click('#ds-wipe');
  ok(await page.isDisabled('#del-go'), 'endgültiges Löschen verlangt Bestätigung');
  await page.fill('#del-word', 'LÖSCHEN'); await page.fill('#del-pw', 'falsch-falsch-123');
  await page.click('#del-go');
  await page.waitForFunction(() => /Passwort falsch/.test(document.querySelector('.modal .form-error').textContent));
  ok(true, 'Löschen verlangt das richtige Passwort');
  await page.fill('#del-pw', PW3); await page.click('#del-go');
  await page.waitForSelector('#su-go');
  ok((await page.evaluate(() => sessionStorage.getItem('__store'))) === null, 'Datendatei wurde gelöscht (Art. 17), Einrichtung startet neu');

  // Migration von Klartext-Altdaten
  console.log('Migration');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p2 = await ctx2.newPage();
  watch(p2);
  await p2.addInitScript(mockWelt);
  await p2.addInitScript(() => { if (!sessionStorage.getItem('__store')) sessionStorage.setItem('__store', JSON.stringify({ demo: false, profil: { name: 'Karl Alt', geb: '1960-01-01', allergien: '', notfall: '', praxis: 'Alte Praxis', avatar: 'a2' }, termine: [], medikamente: [{ id: 'm1', name: 'Altmedikament 10 mg', hinweis: '', zeiten: ['morgens'] }], einnahmen: {}, werte: [], befunde: [], nachrichten: [] })); });
  await p2.goto(APP);
  await p2.waitForSelector('#su-go');
  ok(/früheren Version/.test(await p2.textContent('.lock-note')), 'Altdaten werden erkannt');
  ok((await p2.inputValue('#su-name')) === 'Karl Alt' && (await p2.inputValue('#su-mode')) === 'legacy', 'Altdaten-Übernahme ist vorausgewählt');
  await p2.fill('#su-pw1', PW); await p2.fill('#su-pw2', PW);
  await p2.click('#su-go');
  await p2.waitForSelector('#rk-confirm', { timeout: 30000 });
  await p2.check('#rk-confirm'); await p2.click('#rk-go');
  await p2.waitForSelector('#sidebar .nav-item', { timeout: 30000 });
  await p2.click('#sidebar .nav-item:has(span:text-is("Medikamente"))');
  ok(/Altmedikament 10 mg/.test(await p2.textContent('#content')), 'Altdaten wurden übernommen');
  for (const label of ['Laborergebnisse', 'E-Rezepte', 'Krankmeldungen', 'Überweisungen', 'Gesundheitskarte', 'Vorsorge & Impfungen', 'Medikamentensuche', 'Datenschutz & Sicherheit']) {
    await p2.click(`#sidebar .nav-item:has(span:text-is("${label}"))`);
    await p2.waitForSelector('#content .view');
  }
  ok(true, 'neue Seiten rendern auch mit migrierten Altdaten (leere Listen)');
  const raw2 = await p2.evaluate(() => sessionStorage.getItem('__store'));
  ok(JSON.parse(raw2).vault === 1 && !/Altmedikament|Karl/.test(raw2), 'migrierte Datei ist verschlüsselt');
  // Neuladen: Anmeldung statt Daten
  await p2.reload();
  await p2.waitForSelector('#li-pw');
  ok(await p2.isHidden('#sidebar'), 'nach Neustart ist die App gesperrt');
  await ctx2.close();

  assert.deepStrictEqual(errors, [], 'Konsolenfehler: ' + errors.join(' | '));
  passed++;
  console.log(`E2E OK – ${passed} Prüfungen bestanden, keine Konsolenfehler`);
  await browser.close();
})().catch((e) => { console.error('E2E FEHLER:', e.message); process.exit(1); });
