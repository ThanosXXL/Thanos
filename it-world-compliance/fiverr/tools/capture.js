// Erzeugt die Beispielbilder (Handbuch + Demovideo) aus der echten App mit fiktiven Demodaten.
// Aufruf: xvfb-run -a node tools/capture.js   (benötigt Playwright und die installierte Electron-App)
const path = require('path');
const fs = require('fs');
const { _electron } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..', 'screens');
const UD = '/tmp/itw-demo-ud';

(async () => {
  fs.rmSync(UD, { recursive: true, force: true });
  const app = await _electron.launch({ executablePath: path.join(ROOT, 'node_modules/electron/dist/electron'), args: [ROOT, '--no-sandbox', '--user-data-dir=' + UD] });
  const page = await app.firstWindow();
  await page.waitForSelector('.card');
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- fiktive Demodaten ----
  await page.evaluate(() => {
    const s = App.state, S = App.S;
    const iso = (d) => App.toIso(new Date(Date.now() + d * 86400000));
    s.firma = { name: 'Muster Maschinenbau GmbH', branche: 'Maschinenbau', adresse: 'Musterstraße 1, 12345 Musterstadt', geschaeftsfuehrung: 'Anna Beispiel', itleitung: 'Ben Muster', dsb: 'Carla Demo (extern)', email: 'it@muster-maschinenbau.example', telefon: '+49 30 0000000' };
    s.nis2Check = { sektor: 'industrie', sonderfall: 'keiner', mitarbeiter: '85', umsatz: '14', bilanz: '9', geprueft: new Date().toISOString() };
    s.einstellungen.benutzer = 'B. Muster';
    const done = (id, ev, d) => (s.items[id] = { status: 'erledigt', owner: 'B. Muster', due: '', evidence: ev, note: '', file: '', updated: new Date().toISOString(), intervall: d || '12', geprueft: iso(-20) });
    const wip = (id, own, due, note) => (s.items[id] = { status: 'laeuft', owner: own, due, evidence: '', note: note || '', file: '', updated: new Date().toISOString(), intervall: '', geprueft: '' });
    done('nis2-01', 'Protokoll Betroffenheits-Check vom Oktober', '12'); done('nis2-03', 'Beschluss der Geschäftsleitung, Teilnahmebescheinigung Schulung'); done('nis2-04', 'Leitlinie v1.2, unterzeichnet');
    done('nis2-11', 'Incident-Response-Plan v2, Übungsprotokoll'); done('nis2-19', 'MFA-Abdeckung 100 % laut Benutzerliste');
    wip('nis2-02', 'B. Muster', iso(9), 'Zugang zum BSI-Portal beantragt'); wip('nis2-12', 'IT-Dienstleister', iso(-4), 'Restore-Test steht noch aus');
    wip('nis2-13', 'A. Beispiel', iso(25), 'Lieferantenliste in Arbeit');
    done('dsgvo-01', 'VVT Version 3 im Ordner Datenschutz'); done('dsgvo-10', 'Datenschutzerklärung Website vom September'); done('dsgvo-20', 'AVV-Übersicht, 6 Verträge'); done('dsgvo-31', 'Meldeprozess und Vorfallregister');
    wip('dsgvo-30', 'C. Demo', iso(14), 'TOM-Dokument wird aktualisiert');
    done('it-01', 'Inventarliste (Export)'); done('it-02', 'Patch-Statusbericht Oktober'); done('it-10', 'Benutzerliste mit MFA-Status'); done('it-11', 'Richtlinie, Lizenzliste Passwortmanager'); done('it-20', 'EDR-Konsole Screenshot'); done('it-30', 'Backup-Konzept, Erfolgsprotokolle'); done('it-33', 'Teilnehmerliste Awareness-Training');
    wip('it-31', 'IT-Dienstleister', iso(-4), 'Wiederherstellungstest planen');
    const mk = (key, rec) => Object.assign({ id: App.uid(), erstellt: new Date().toISOString(), geaendert: new Date().toISOString() }, rec);
    for (const v of S.REGISTER.vvt.vorlagen.slice(0, 4)) s.vvt.push(mk('vvt', Object.assign({ pruefung: iso(120), verantwortlich: 'Fachbereich' }, v)));
    s.vvt[1].drittland = 'Ja – ohne Garantien (prüfen!)';
    s.dienstleister.push(mk('d', { name: 'CloudHost Deutschland GmbH', leistung: 'Hosting und Backup', kategorie: 'IT / Cloud / Hosting', avv: 'Vertrag liegt vor', avvDatum: iso(-300), standort: 'EU/EWR (Deutschland)', zertifikat: 'ISO 27001, BSI C5', risiko: 'Hoch', pruefung: iso(40), kontakt: 'support@cloudhost.example', notiz: '' }));
    s.dienstleister.push(mk('d', { name: 'Lohnbüro Muster & Partner', leistung: 'Lohnbuchhaltung', kategorie: 'Lohn / Buchhaltung / Steuer', avv: 'Vertrag liegt vor', avvDatum: iso(-500), standort: 'EU/EWR (Deutschland)', zertifikat: '', risiko: 'Mittel', pruefung: iso(200), kontakt: '', notiz: '' }));
    s.dienstleister.push(mk('d', { name: 'Newsletter-Tool Beispiel Inc.', leistung: 'Newsletter-Versand', kategorie: 'Marketing / Newsletter', avv: 'Fehlt', avvDatum: '', standort: 'Drittland ohne Garantien (prüfen!)', zertifikat: '', risiko: 'Mittel', pruefung: iso(-3), kontakt: '', notiz: 'AVV anfordern' }));
    s.anfragen.push(mk('a', { eingang: iso(-12), art: 'Auskunft (Art. 15)', referenz: 'DSA-2026-004', status: 'In Bearbeitung', verlaengert: false, erledigtAm: '', notiz: '' }));
    s.anfragen.push(mk('a', { eingang: iso(-40), art: 'Löschung (Art. 17)', referenz: 'DSA-2026-003', status: 'Beantwortet', verlaengert: false, erledigtAm: iso(-25), notiz: '' }));
    s.schulungen.push(mk('s', { thema: 'Awareness-Training Phishing und Passwörter', art: 'Awareness (alle Beschäftigten)', datum: iso(-60), teilnehmerzahl: '78', trainer: 'Externer Trainer', teilnehmer: 'Alle Beschäftigten', nachweis: 'Teilnehmerliste im Ordner Schulungen', naechste: iso(305) }));
    s.schulungen.push(mk('s', { thema: 'NIS2-Pflichtschulung Geschäftsleitung', art: 'Geschäftsleitung (NIS2)', datum: iso(-90), teilnehmerzahl: '2', trainer: 'IT-WORLD', teilnehmer: 'Geschäftsleitung', nachweis: 'Zertifikat PDF', naechste: iso(275) }));
    const kn = (h) => App.toLocalInput(new Date(Date.now() - h * 3600000));
    s.vorfaelle = [
      { id: 'v1', titel: 'Phishing-Mail mit Zugangsdatenabfluss', art: 'beides', kenntnis: kn(20), status: 'offen', beschreibung: 'Zwei Konten betroffen, Passwörter zurückgesetzt, Analyse läuft.', massnahmen: 'Konten gesperrt, MFA erzwungen, Postfachregeln geprüft', meldungen: { nis24: true, nis72: false, nis30: false, dsgvo72: false, nis72Zeit: '' } },
      { id: 'v2', titel: 'Fehlversand einer Angebotsliste', art: 'datenpanne', kenntnis: kn(24 * 40), status: 'abgeschlossen', beschreibung: 'Interne Liste an falschen Empfänger.', massnahmen: 'Empfänger zur Löschung aufgefordert, dokumentiert', meldungen: { nis24: false, nis72: false, nis30: false, dsgvo72: true, nis72Zeit: '' } }
    ];
    s.protokoll = [];
    App.log('Verschlüsselung geprüft', '', ''); App.log('Anforderung geändert', 'NIS2: Betroffenheits-Check dokumentiert', 'Status: Offen → Erledigt'); App.log('Dienstleister angelegt', 'CloudHost Deutschland GmbH', 'Dienstleister & AV-Verträge');
    App.log('Vorfall erfasst', 'Phishing-Mail mit Zugangsdatenabfluss', 'Sicherheitsvorfall mit Datenabfluss; Status: Offen'); App.log('Bericht exportiert', 'PDF', '');
    return App.persist();
  });
  await page.evaluate(() => App.render());

  const shot = async (name, prep) => {
    if (prep) await prep();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('Bild', name);
  };
  const go = async (id) => { await page.evaluate((v) => { App.closeModal(); App.go(v); }, id); };
  const item = async (fwId, itId) => page.evaluate(([f, i]) => { const fw = App.C.FRAMEWORKS.find((x) => x.id === f); App.openItemModal(fw, App.allItems(fw).find((x) => x.id === i)); }, [fwId, itId]);

  await shot('01-uebersicht', () => go('dashboard'));
  await shot('02-nis2-check', () => go('nis2'));
  await shot('03-dsgvo-liste', () => go('dsgvo'));
  await shot('04-anforderung-dialog', async () => { await go('nis2'); await item('nis2', 'nis2-12'); });
  await shot('05-itsicherheit', () => go('itsec'));
  await shot('06-vvt', () => go('vvt'));
  await shot('07-dienstleister', () => go('dienstleister'));
  await shot('08-anfragen', () => go('anfragen'));
  await shot('09-schulungen', () => go('schulungen'));
  await shot('10-kalender', () => go('kalender'));
  await shot('11-vorfaelle', () => go('vorfaelle'));
  await shot('12-vorfall-dialog', async () => { await go('vorfaelle'); await page.evaluate(() => App.openVorfallModal(App.state.vorfaelle[0])); });
  await shot('13-vorlagen', async () => { await go('vorlagen'); await page.evaluate(() => { const d = document.querySelector('#content details'); if (d) d.open = true; }); });
  await shot('14-protokoll', async () => { await go('protokoll'); await page.click('text=Integrität prüfen'); });
  await shot('15-bericht', () => go('bericht'));
  await shot('16-suche', async () => { await go('dashboard'); await page.evaluate(() => App.actions.search()); await page.fill('.palette input', 'backup'); });
  await shot('17-sicherheit-aktivieren', () => go('sicherheit'));

  // Verschlüsselung aktivieren und sperren
  await page.evaluate(() => { App.closeModal(); return window.complianceAPI.setPassword('Demo-Passphrase 2026!').then(() => { App.vault.encrypted = true; App.go('sicherheit'); }); });
  await shot('18-sicherheit-aktiv');
  await page.evaluate(() => App.actions.lock());
  await page.waitForSelector('.lock-screen');
  await shot('19-sperrbildschirm');
  await page.close().catch(() => {});
  await app.close();
})();
