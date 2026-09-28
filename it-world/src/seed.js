'use strict';
/** Erststart: Mandant „IT - World“ mit Administrator und (optional) realistischen Demo-Daten. */
const crud = require('./crud');
const { tx } = require('./db');
const { createTenant, loadSettings } = require('./app');
const { hashPassword } = require('./auth');

const DEFAULT_ADMIN = { email: 'admin@it-world.de', passwort: 'admin1234' };

function seed(db, { demo = true, log = console.log } = {}) {
  if (db.prepare('SELECT COUNT(*) n FROM tenants').get().n > 0) return null;
  const email = process.env.ADMIN_EMAIL || DEFAULT_ADMIN.email;
  const passwort = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN.passwort;
  const { tenantId, userId } = createTenant(db, {
    firma: 'IT - World', name: 'Administrator', email, passwort, mussAendern: !process.env.ADMIN_PASSWORD,
  });
  const settings = loadSettings(db, tenantId);
  Object.assign(settings.firma, {
    name: 'IT - World', zusatz: 'IT Solutions', strasse: 'Musterstraße 1', plz: '10115', ort: 'Berlin',
    email: '', telefon: '+49 30 1234567', website: 'https://www.it-world.de', ustid: 'DE123456789',
    steuernummer: '30/123/45678', handelsregister: 'HRB 12345 B, Amtsgericht Berlin', geschaeftsfuehrer: '',
    bank: 'Musterbank', iban: 'DE02 1203 0000 0000 2020 51', bic: 'BYLADEM1001',
  });
  Object.assign(settings.social, { linkedin: 'https://www.linkedin.com/', instagram: 'https://www.instagram.com/', facebook: 'https://www.facebook.com/' });
  db.prepare('UPDATE tenants SET settings = ? WHERE id = ?').run(JSON.stringify(settings), tenantId);
  log(`[IT-World] Erster Start: Administrator angelegt → ${email} / ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD)' : passwort} (bitte nach der Anmeldung ändern)`);
  if (demo) {
    seedDemo(db, tenantId, userId);
    log('[IT-World] Demo-Daten wurden angelegt (abschaltbar mit SEED_DEMO=false).');
  }
  return { tenantId, userId };
}

function seedDemo(db, tenantId, adminId) {
  let r = 42;
  const rnd = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
  const tenant = db.prepare('SELECT id, slug, name FROM tenants WHERE id = ?').get(tenantId);

  tx(db, () => {
    // Weitere Benutzer
    const users = [
      ['Laura Becker', 'laura.becker@it-world.de', 'manager'],
      ['Jonas Wagner', 'jonas.wagner@it-world.de', 'mitarbeiter'],
      ['Mehmet Yilmaz', 'mehmet.yilmaz@it-world.de', 'mitarbeiter'],
    ].map(([name, email, rolle]) => Number(db.prepare('INSERT INTO users (tenant_id, name, email, rolle, passwort, muss_passwort_aendern) VALUES (?, ?, ?, ?, ?, 1)')
      .run(tenantId, name, email, rolle, hashPassword(`Demo-${Math.random().toString(36).slice(2, 10)}1`)).lastInsertRowid));
    const team = [adminId, ...users];
    const ctx = { db, tenant, user: { id: adminId, name: 'Administrator', rolle: 'admin' }, settings: loadSettings(db, tenantId) };
    const mk = (res, data) => crud.create(ctx, res, data);

    const lieferanten = [
      ['TechDistri GmbH', 'Frank Hoffmann', 'Hamburg'], ['CloudHost AG', 'Sabine Klein', 'Frankfurt am Main'], ['Office Supply KG', 'Peter Braun', 'Köln'],
    ].map(([name, ap, ort]) => mk('lieferanten', { name, ansprechpartner: ap, ort, email: `info@${name.split(' ')[0].toLowerCase()}.de` }));

    const produkte = [
      ['Business-Laptop 14" (i7, 32 GB)', 'Produkt', 'Hardware', 1290, 980, 'Stk', 40, 5],
      ['27" 4K-Monitor', 'Produkt', 'Hardware', 389, 290, 'Stk', 14, 6],
      ['Managed Switch 24 Port', 'Produkt', 'Netzwerk', 549, 410, 'Stk', 25, 3],
      ['WLAN Access Point Wi-Fi 7', 'Produkt', 'Netzwerk', 259, 180, 'Stk', 18, 5],
      ['Microsoft 365 Business Standard', 'Abo / Lizenz', 'Software', 11.7, 9.9, 'Monat', 0, 0],
      ['Managed Backup (pro TB)', 'Abo / Lizenz', 'Cloud', 49, 22, 'Monat', 0, 0],
      ['IT-Support vor Ort', 'Dienstleistung', 'Service', 95, 0, 'Std', 0, 0],
      ['Webentwicklung', 'Dienstleistung', 'Entwicklung', 110, 0, 'Std', 0, 0],
      ['Firewall-Einrichtung (Pauschal)', 'Dienstleistung', 'Security', 890, 0, 'Pauschal', 0, 0],
      ['Webhosting Business', 'Abo / Lizenz', 'Cloud', 29, 8, 'Monat', 0, 0],
    ].map(([name, typ, kategorie, preis, ek, einheit, bestand, min], i) => mk('produkte', {
      name, typ, kategorie, preis, einkaufspreis: ek, einheit, bestand, mindestbestand: min, mwst: '19',
      lieferant_id: typ === 'Produkt' ? lieferanten[0].id : typ === 'Abo / Lizenz' ? lieferanten[1].id : null,
      beschreibung: i === 7 ? 'Konzeption, Design und Umsetzung individueller Webanwendungen.' : '',
    }));

    const firmen = [
      ['Müller Maschinenbau GmbH', 'Maschinenbau', 'Stuttgart', 'Aktiv'], ['Schneider & Partner Steuerberater', 'Beratung', 'München', 'Aktiv'],
      ['Bäckerei Fischer', 'Handel', 'Leipzig', 'Aktiv'], ['Weber Logistik AG', 'Logistik', 'Hamburg', 'Aktiv'],
      ['Zahnarztpraxis Dr. Meyer', 'Gesundheit', 'Köln', 'Aktiv'], ['Autohaus Schulz', 'Automobil', 'Dortmund', 'Aktiv'],
      ['Kanzlei Wolf Rechtsanwälte', 'Recht', 'Düsseldorf', 'Aktiv'], ['Green Energy Solutions', 'Energie', 'Hannover', 'Interessent'],
      ['Stadtwerke Neustadt', 'Öffentlich', 'Neustadt', 'Lead'], ['Hotel Seeblick', 'Gastronomie', 'Konstanz', 'Lead'],
      ['Architekturbüro Klein', 'Architektur', 'Berlin', 'Aktiv'], ['Braun Immobilien', 'Immobilien', 'Frankfurt am Main', 'Inaktiv'],
    ];
    const vornamen = ['Anna', 'Thomas', 'Julia', 'Michael', 'Sarah', 'Stefan', 'Lisa', 'Andreas', 'Katrin', 'Daniel', 'Nina', 'Markus'];
    const nachnamen = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer', 'Koch', 'Richter'];
    const kunden = firmen.map(([name, branche, ort, status], i) => {
      const k = mk('kunden', {
        name, branche, ort, status, typ: 'Firma', land: 'Deutschland', plz: String(10000 + i * 7919).slice(0, 5), strasse: `${pick(['Haupt', 'Bahnhof', 'Garten', 'Industrie', 'Linden'])}straße ${1 + i * 3}`,
        email: `info@${name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z]+/g, '').slice(0, 18)}.de`,
        telefon: `+49 ${200 + i * 13} ${100000 + i * 4711}`, quelle: pick(['Website', 'Empfehlung', 'Messe', 'Social Media', 'Bestandskunde']),
        zustaendig_id: pick(team), zahlungsziel: pick([14, 14, 30]),
      });
      mk('kontakte', { anrede: i % 2 ? 'Herr' : 'Frau', vorname: vornamen[i], nachname: nachnamen[i], kunde_id: k.id, position: pick(['Geschäftsführung', 'IT-Leitung', 'Einkauf', 'Office Management']), email: `${vornamen[i].toLowerCase()}.${nachnamen[i].toLowerCase().replace(/ü/g, 'ue').replace(/ä/g, 'ae')}@example.com`, telefon: `+49 170 ${1000000 + i * 12345}` });
      return k;
    });

    const pos = (p, menge, rabatt = 0) => ({ produkt_id: p.id, bezeichnung: p.name, menge, einheit: p.einheit, preis: p.preis, mwst: 19, rabatt });
    // Rechnungen über 12 Monate
    const aktive = kunden.filter((k) => k.status === 'Aktiv');
    for (let m = 11; m >= 0; m--) {
      const anzahl = 2 + Math.floor(rnd() * 3);
      for (let j = 0; j < anzahl; j++) {
        const kunde = pick(aktive);
        const datum = day(-(m * 30 + Math.floor(rnd() * 25)));
        const positionen = [pos(produkte[6], 2 + Math.floor(rnd() * 14)), pos(pick([produkte[4], produkte[5], produkte[9]]), 1 + Math.floor(rnd() * 20))];
        if (rnd() < 0.4) positionen.push(pos(pick([produkte[0], produkte[1], produkte[2], produkte[3]]), 1 + Math.floor(rnd() * 3)));
        if (rnd() < 0.25) positionen.push(pos(produkte[8], 1));
        const re = mk('rechnungen', { kunde_id: kunde.id, datum, betreff: pick(['IT-Betreuung', 'Hardware & Einrichtung', 'Cloud-Services', 'Wartungsvertrag', 'Netzwerk-Erweiterung']), positionen, einleitung: ctx.settings.texte.rechnungEinleitung });
        crud.update(ctx, 'rechnungen', re.id, { status: 'Offen' });
        const age = m * 30;
        if (age > 30 || rnd() < 0.35) {
          const z = rnd() < 0.9 || age < 45 ? re.brutto : round2(re.brutto / 2);
          mk('zahlungen', { beleg_id: re.id, datum: day(-(Math.max(age - 10, 0))), betrag: z, methode: pick(['Überweisung', 'Überweisung', 'SEPA-Lastschrift', 'PayPal', 'Stripe']), referenz: re.nummer });
        }
      }
    }
    // Offene Angebote & Aufträge
    for (let i = 0; i < 4; i++) {
      const kunde = pick(kunden);
      mk('angebote', { kunde_id: kunde.id, datum: day(-i * 6), betreff: pick(['Modernisierung IT-Arbeitsplätze', 'Neue Unternehmenswebsite', 'Managed Services Paket', 'Netzwerk & WLAN']), status: i < 2 ? 'Versendet' : 'Entwurf', einleitung: ctx.settings.texte.angebotEinleitung, positionen: [pos(produkte[7], 40 + i * 10), pos(produkte[9], 12), pos(produkte[1], 2 + i)] });
    }
    mk('auftraege', { kunde_id: kunden[3].id, datum: day(-3), betreff: 'Rollout 25 Arbeitsplätze', status: 'In Bearbeitung', positionen: [pos(produkte[0], 25, 5), pos(produkte[6], 30)] });

    // Deals
    const deals = [
      ['Managed Services Vertrag', 0, 18000, 'Verhandlung', 70], ['Neue Website + Shop', 7, 9200, 'Angebot', 50], ['Glasfaser & Netzwerk', 8, 35000, 'Qualifiziert', 30],
      ['WLAN-Ausbau Hotel', 9, 7400, 'Neu', 10], ['Cloud-Migration', 1, 12500, 'Gewonnen', 100], ['Security-Audit', 6, 4800, 'Angebot', 60],
      ['Backup-Lösung', 4, 2600, 'Gewonnen', 100], ['ERP-Einführung', 11, 22000, 'Verloren', 0], ['Hardware-Leasing', 5, 15600, 'Verhandlung', 75], ['IT-Schulung Mitarbeiter', 2, 1900, 'Neu', 20],
    ];
    for (const [titel, ki, wert, phase, w] of deals) mk('deals', { titel, kunde_id: kunden[ki].id, wert, phase, wahrscheinlichkeit: w, abschluss: day(Math.floor(rnd() * 60) - 10), zustaendig_id: pick(team) });

    // Projekte, Aufgaben, Zeiten
    const projekte = [
      ['Website-Relaunch', 0, 'Aktiv', 60, 14000, 110], ['Arbeitsplatz-Rollout', 3, 'Aktiv', 35, 38000, 95], ['Cloud-Migration', 1, 'Abgeschlossen', 100, 12500, 95], ['Security-Audit', 6, 'Planung', 0, 4800, 120],
    ].map(([name, ki, status, fortschritt, budget, satz], i) => mk('projekte', { name, kunde_id: kunden[ki].id, status, fortschritt, budget, stundensatz: satz, start: day(-60 + i * 10), ende: day(15 + i * 20), leiter_id: pick(team), beschreibung: `${name} für ${kunden[ki].name}.` }));
    const aufgaben = ['Anforderungen aufnehmen', 'Design-Entwurf abstimmen', 'Server bereitstellen', 'Geräte inventarisieren', 'Images vorbereiten', 'Schulung planen', 'Abnahme-Termin vereinbaren', 'Dokumentation schreiben', 'Firewall-Regeln prüfen', 'Backup testen', 'Lizenzen zuweisen', 'Go-Live vorbereiten'];
    aufgaben.forEach((titel, i) => mk('aufgaben', { titel, projekt_id: projekte[i % 4].id, status: pick(['Offen', 'Offen', 'In Arbeit', 'Review', 'Erledigt']), prioritaet: pick(['Niedrig', 'Normal', 'Normal', 'Hoch', 'Kritisch']), faellig: day(Math.floor(rnd() * 20) - 4), zustaendig_id: i % 3 === 0 ? adminId : pick(team) }));
    for (let i = 0; i < 24; i++) {
      mk('zeiten', { datum: day(-Math.floor(rnd() * 25)), user_id: pick(team), projekt_id: projekte[i % 2].id, stunden: pick([1, 1.5, 2, 3, 4, 6, 8]), beschreibung: pick(['Entwicklung Frontend', 'Abstimmung mit Kunde', 'Einrichtung Clients', 'Konfiguration Server', 'Tests & Fehlerbehebung', 'Dokumentation']), abrechenbar: rnd() > 0.15 });
    }

    // Tickets
    const tickets = [['Drucker im 2. OG druckt nicht', 'Störung', 'Hoch'], ['Neuer Mitarbeiter: Zugang einrichten', 'Anfrage', 'Normal'], ['VPN-Verbindung bricht ab', 'Störung', 'Kritisch'],
      ['Outlook-Postfach voll', 'Anfrage', 'Niedrig'], ['Rechnung RE-Frage zur Position 3', 'Rechnung', 'Normal'], ['Server-Wartung planen', 'Wartung', 'Normal'], ['Software-Installation CAD', 'Installation', 'Normal']];
    tickets.forEach(([betreff, kategorie, prioritaet], i) => mk('tickets', { betreff, kategorie, prioritaet, kunde_id: kunden[i % 7].id, status: pick(['Neu', 'Offen', 'Offen', 'Wartend', 'Gelöst']), zustaendig_id: pick(team), beschreibung: `${betreff} – gemeldet vom Kunden telefonisch.` }));

    // Mitarbeiter
    [['Administrator', 'IT-World', 'Geschäftsführung', 'Geschäftsführer', 0], ['Laura', 'Becker', 'Vertrieb', 'Vertriebsleitung', 1], ['Jonas', 'Wagner', 'Entwicklung', 'Full-Stack-Entwickler', 2], ['Mehmet', 'Yilmaz', 'Support', 'IT-Systemadministrator', 3], ['Sophie', 'Neumann', 'Marketing', 'Online-Marketing', -1]]
      .forEach(([vorname, nachname, abteilung, position, ui], i) => mk('mitarbeiter', { vorname, nachname, abteilung, position, eintritt: day(-400 - i * 200), gehalt: 3800 + i * 450, user_id: ui >= 0 ? team[ui] : null, email: ui > 0 ? db.prepare('SELECT email FROM users WHERE id = ?').get(team[ui]).email : null }));

    // Ausgaben
    const ausgaben = [['Büromiete', 'Miete', 1800], ['Cloud-Server', 'Hosting / Cloud', 420], ['Software-Abos', 'Software / Lizenzen', 260], ['Google Ads', 'Marketing', 350]];
    for (let m = 11; m >= 0; m--) {
      for (const [beschreibung, kategorie, netto] of ausgaben) mk('ausgaben', { datum: day(-(m * 30 + 2)), beschreibung, kategorie, netto: round2(netto * (0.9 + rnd() * 0.2)), mwst: kategorie === 'Miete' ? '0' : '19', lieferant_id: kategorie === 'Hosting / Cloud' ? lieferanten[1].id : null });
      if (rnd() < 0.4) mk('ausgaben', { datum: day(-(m * 30 + 12)), beschreibung: 'Hardware-Einkauf Lager', kategorie: 'Hardware', netto: round2(1500 + rnd() * 4000), mwst: '19', lieferant_id: lieferanten[0].id });
    }

    // Termine
    const at = (d, h) => `${day(d)}T${String(h).padStart(2, '0')}:00`;
    [['Kick-off Website-Relaunch', 'Meeting', 1, 10, 0], ['Rückruf Stadtwerke', 'Anruf', 0, 14, 8], ['Vor-Ort-Service Autohaus', 'Vor-Ort-Termin', 2, 9, 5], ['Webinar: IT-Sicherheit 2026', 'Webinar', 5, 16, null], ['Team-Meeting', 'Intern', 3, 9, null], ['Präsentation Managed Services', 'Meeting', 7, 11, 0]]
      .forEach(([titel, typ, d, h, ki]) => mk('termine', { titel, typ, start: at(d, h), ende: at(d, h + 1), kunde_id: ki !== null ? kunden[ki].id : null, ort: typ === 'Webinar' ? 'Online' : typ === 'Intern' ? 'Büro' : kunden[ki] ? kunden[ki].ort : '' }));
  });
}

const round2 = crud.round2;
module.exports = { seed, DEFAULT_ADMIN };
