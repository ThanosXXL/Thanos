'use strict';
/**
 * Zentrale Datenmodell-Definition von IT - World.
 *
 * Aus dieser einen Beschreibung werden erzeugt:
 *  - die SQLite-Tabellen (inkl. automatischer Spalten-Migration, siehe db.js)
 *  - die generische REST-API (Validierung, Suche, Sortierung, CSV-Export/-Import)
 *  - die Oberfläche (Listen, Formulare, Detailseiten) – das Frontend lädt sie über /api/meta.
 *
 * Feldtypen: string, text, email, url, tel, number, money, int, percent, date, datetime,
 *            bool, enum, ref, json
 * Feld-Flags: required, list (Spalte in Tabelle), filter (Filter-Dropdown), readonly
 *            (nur Server setzt), hidden (nie im Formular), auto (Nummernkreis-Präfix),
 *            default ('today', 'me', Wert), min/max, ref (Ziel-Ressource), options (enum)
 */

const ROLES = ['admin', 'manager', 'mitarbeiter', 'lesezugriff'];
const ROLE_LABELS = {
  admin: 'Administrator',
  manager: 'Manager',
  mitarbeiter: 'Mitarbeiter',
  lesezugriff: 'Nur Lesen',
};

const ALL = ROLES;
const WRITERS = ['admin', 'manager', 'mitarbeiter'];
const MANAGEMENT = ['admin', 'manager'];

const MODULES = [
  { key: 'crm', label: 'CRM (Kunden, Kontakte, Verkaufschancen)' },
  { key: 'vertrieb', label: 'Vertrieb (Angebote, Aufträge, Rechnungen, Zahlungen)' },
  { key: 'lager', label: 'Produkte, Lager & Lieferanten' },
  { key: 'projekte', label: 'Projekte & Aufgaben' },
  { key: 'support', label: 'Support-Tickets' },
  { key: 'personal', label: 'Personal & Zeiterfassung' },
  { key: 'finanzen', label: 'Ausgaben & Berichte' },
  { key: 'kalender', label: 'Kalender & Termine' },
  { key: 'dokumente', label: 'Dokumente (Content Upload)' },
];

const PRIO = ['Niedrig', 'Normal', 'Hoch', 'Kritisch'];

const ADRESSE = [
  { name: 'strasse', label: 'Straße', type: 'string' },
  { name: 'plz', label: 'PLZ', type: 'string', max: 10 },
  { name: 'ort', label: 'Ort', type: 'string', list: true },
  { name: 'land', label: 'Land', type: 'string', default: 'Deutschland' },
];

const BELEG_FIELDS = (statusOptions, statusDefault) => [
  { name: 'nummer', label: 'Nummer', type: 'string', readonly: true, list: true, auto: true },
  { name: 'typ', label: 'Typ', type: 'string', hidden: true },
  { name: 'kunde_id', label: 'Kunde', type: 'ref', ref: 'kunden', required: true, list: true },
  { name: 'betreff', label: 'Betreff', type: 'string', list: true },
  { name: 'datum', label: 'Datum', type: 'date', default: 'today', required: true, list: true },
  { name: 'faellig', label: 'Fällig / gültig bis', type: 'date', list: true },
  { name: 'status', label: 'Status', type: 'enum', options: statusOptions, default: statusDefault, list: true, filter: true },
  { name: 'positionen', label: 'Positionen', type: 'json', default: [] },
  { name: 'netto', label: 'Netto', type: 'money', readonly: true },
  { name: 'steuer', label: 'MwSt.', type: 'money', readonly: true },
  { name: 'brutto', label: 'Brutto', type: 'money', readonly: true, list: true },
  { name: 'bezahlt', label: 'Bezahlt', type: 'money', readonly: true },
  { name: 'einleitung', label: 'Einleitungstext', type: 'text' },
  { name: 'notizen', label: 'Schlusstext / Notizen', type: 'text' },
  { name: 'quelle_id', label: 'Erstellt aus', type: 'int', hidden: true },
  { name: 'projekt_id', label: 'Projekt', type: 'ref', ref: 'projekte' },
  { name: 'lager_gebucht', label: 'Lager gebucht', type: 'bool', hidden: true },
];

const RESOURCES = {
  // ------------------------------------------------------------------ CRM
  kunden: {
    label: 'Kunden', singular: 'Kunde', icon: 'building', module: 'crm',
    title: ['nummer', 'name'], search: ['nummer', 'name', 'email', 'ort', 'branche'],
    sort: 'name', autoPrefix: 'K-', importable: true,
    related: [
      { res: 'kontakte', field: 'kunde_id' },
      { res: 'deals', field: 'kunde_id' },
      { res: 'angebote', field: 'kunde_id' },
      { res: 'rechnungen', field: 'kunde_id' },
      { res: 'projekte', field: 'kunde_id' },
      { res: 'tickets', field: 'kunde_id' },
      { res: 'termine', field: 'kunde_id' },
      { res: 'dokumente', field: 'kunde_id' },
    ],
    fields: [
      { name: 'nummer', label: 'Kd.-Nr.', type: 'string', readonly: true, list: true, auto: true },
      { name: 'name', label: 'Firma / Name', type: 'string', required: true, list: true, max: 200 },
      { name: 'typ', label: 'Typ', type: 'enum', options: ['Firma', 'Privatperson', 'Behörde', 'Verein'], default: 'Firma', filter: true },
      { name: 'status', label: 'Status', type: 'enum', options: ['Lead', 'Interessent', 'Aktiv', 'Inaktiv'], default: 'Aktiv', list: true, filter: true },
      { name: 'branche', label: 'Branche', type: 'string', list: true },
      { name: 'email', label: 'E-Mail', type: 'email', list: true },
      { name: 'telefon', label: 'Telefon', type: 'tel' },
      { name: 'website', label: 'Website', type: 'url' },
      ...ADRESSE,
      { name: 'ustid', label: 'USt-IdNr.', type: 'string' },
      { name: 'zahlungsziel', label: 'Zahlungsziel (Tage)', type: 'int', default: 14, min: 0, max: 365 },
      { name: 'quelle', label: 'Quelle', type: 'enum', options: ['Website', 'Formular', 'Empfehlung', 'Messe', 'Kaltakquise', 'Social Media', 'Bestandskunde', 'Sonstiges'], filter: true },
      { name: 'zustaendig_id', label: 'Zuständig', type: 'ref', ref: 'benutzer', default: 'me' },
      { name: 'notizen', label: 'Notizen', type: 'text' },
    ],
  },
  kontakte: {
    label: 'Kontakte', singular: 'Kontakt', icon: 'users', module: 'crm',
    title: ['vorname', 'nachname'], search: ['vorname', 'nachname', 'email', 'position'],
    sort: 'nachname', importable: true,
    fields: [
      { name: 'anrede', label: 'Anrede', type: 'enum', options: ['Herr', 'Frau', 'Divers', 'Dr.', 'Prof.'] },
      { name: 'vorname', label: 'Vorname', type: 'string', required: true, list: true },
      { name: 'nachname', label: 'Nachname', type: 'string', required: true, list: true },
      { name: 'kunde_id', label: 'Kunde', type: 'ref', ref: 'kunden', list: true },
      { name: 'position', label: 'Position', type: 'string', list: true },
      { name: 'email', label: 'E-Mail', type: 'email', list: true },
      { name: 'telefon', label: 'Telefon', type: 'tel', list: true },
      { name: 'mobil', label: 'Mobil', type: 'tel' },
      { name: 'geburtstag', label: 'Geburtstag', type: 'date' },
      { name: 'newsletter', label: 'Newsletter-Einwilligung', type: 'bool', default: false },
      { name: 'notizen', label: 'Notizen', type: 'text' },
    ],
  },
  deals: {
    label: 'Verkaufschancen', singular: 'Verkaufschance', icon: 'target', module: 'crm',
    title: ['titel'], search: ['titel'], sort: 'abschluss', board: 'phase', boardSum: 'wert',
    fields: [
      { name: 'titel', label: 'Titel', type: 'string', required: true, list: true },
      { name: 'kunde_id', label: 'Kunde', type: 'ref', ref: 'kunden', list: true },
      { name: 'kontakt_id', label: 'Ansprechpartner', type: 'ref', ref: 'kontakte' },
      { name: 'wert', label: 'Wert (netto)', type: 'money', list: true, default: 0 },
      { name: 'phase', label: 'Phase', type: 'enum', options: ['Neu', 'Qualifiziert', 'Angebot', 'Verhandlung', 'Gewonnen', 'Verloren'], default: 'Neu', list: true, filter: true },
      { name: 'wahrscheinlichkeit', label: 'Wahrscheinlichkeit', type: 'percent', default: 10, min: 0, max: 100, list: true },
      { name: 'abschluss', label: 'Erw. Abschluss', type: 'date', list: true },
      { name: 'zustaendig_id', label: 'Zuständig', type: 'ref', ref: 'benutzer', default: 'me', filter: true },
      { name: 'notizen', label: 'Notizen', type: 'text' },
    ],
  },

  // ------------------------------------------------------------ Vertrieb
  angebote: {
    label: 'Angebote', singular: 'Angebot', icon: 'file', module: 'vertrieb',
    table: 'belege', fixed: { typ: 'Angebot' }, autoPrefix: 'AN-', beleg: true,
    title: ['nummer', 'betreff'], search: ['nummer', 'betreff'], sort: 'datum', sortDir: 'desc',
    convert: ['auftraege', 'rechnungen'],
    fields: BELEG_FIELDS(['Entwurf', 'Versendet', 'Angenommen', 'Abgelehnt'], 'Entwurf'),
  },
  auftraege: {
    label: 'Aufträge', singular: 'Auftrag', icon: 'clipboard', module: 'vertrieb',
    table: 'belege', fixed: { typ: 'Auftrag' }, autoPrefix: 'AB-', beleg: true,
    title: ['nummer', 'betreff'], search: ['nummer', 'betreff'], sort: 'datum', sortDir: 'desc',
    convert: ['rechnungen'],
    fields: BELEG_FIELDS(['Offen', 'In Bearbeitung', 'Geliefert', 'Abgerechnet', 'Storniert'], 'Offen'),
  },
  rechnungen: {
    label: 'Rechnungen', singular: 'Rechnung', icon: 'receipt', module: 'vertrieb',
    table: 'belege', fixed: { typ: 'Rechnung' }, autoPrefix: 'RE-', beleg: true,
    title: ['nummer', 'betreff'], search: ['nummer', 'betreff'], sort: 'datum', sortDir: 'desc',
    perm: { read: ALL, write: MANAGEMENT },
    related: [{ res: 'zahlungen', field: 'beleg_id' }],
    fields: BELEG_FIELDS(['Entwurf', 'Offen', 'Teilbezahlt', 'Bezahlt', 'Storniert'], 'Entwurf'),
  },
  zahlungen: {
    label: 'Zahlungen', singular: 'Zahlung', icon: 'card', module: 'vertrieb',
    title: ['referenz'], search: ['referenz', 'notizen'], sort: 'datum', sortDir: 'desc',
    perm: { read: ALL, write: MANAGEMENT },
    fields: [
      { name: 'beleg_id', label: 'Rechnung', type: 'ref', ref: 'rechnungen', required: true, list: true },
      { name: 'datum', label: 'Datum', type: 'date', default: 'today', required: true, list: true },
      { name: 'betrag', label: 'Betrag', type: 'money', required: true, list: true },
      { name: 'methode', label: 'Zahlungsart', type: 'enum', options: ['Überweisung', 'SEPA-Lastschrift', 'PayPal', 'Stripe', 'Kreditkarte', 'Bar', 'Verrechnung'], default: 'Überweisung', list: true, filter: true },
      { name: 'referenz', label: 'Referenz / Verwendungszweck', type: 'string', list: true },
      { name: 'notizen', label: 'Notizen', type: 'text' },
    ],
  },

  // --------------------------------------------------------------- Lager
  produkte: {
    label: 'Produkte & Leistungen', singular: 'Produkt', icon: 'box', module: 'lager',
    title: ['sku', 'name'], search: ['sku', 'name', 'kategorie'], sort: 'name', autoPrefix: 'P-', importable: true,
    fields: [
      { name: 'sku', label: 'Art.-Nr.', type: 'string', readonly: true, list: true, auto: true },
      { name: 'name', label: 'Bezeichnung', type: 'string', required: true, list: true },
      { name: 'typ', label: 'Typ', type: 'enum', options: ['Produkt', 'Dienstleistung', 'Abo / Lizenz'], default: 'Produkt', list: true, filter: true },
      { name: 'kategorie', label: 'Kategorie', type: 'string', list: true, filter: true },
      { name: 'preis', label: 'VK-Preis (netto)', type: 'money', list: true, default: 0 },
      { name: 'einkaufspreis', label: 'EK-Preis (netto)', type: 'money', default: 0 },
      { name: 'mwst', label: 'MwSt.-Satz %', type: 'enum', options: ['19', '7', '0'], default: '19' },
      { name: 'einheit', label: 'Einheit', type: 'enum', options: ['Stk', 'Std', 'Tag', 'Monat', 'Jahr', 'Pauschal', 'Lizenz'], default: 'Stk' },
      { name: 'bestand', label: 'Lagerbestand', type: 'int', default: 0, list: true },
      { name: 'mindestbestand', label: 'Mindestbestand', type: 'int', default: 0 },
      { name: 'lieferant_id', label: 'Lieferant', type: 'ref', ref: 'lieferanten' },
      { name: 'aktiv', label: 'Aktiv', type: 'bool', default: true, list: true },
      { name: 'beschreibung', label: 'Beschreibung', type: 'text' },
    ],
  },
  lieferanten: {
    label: 'Lieferanten', singular: 'Lieferant', icon: 'truck', module: 'lager',
    title: ['name'], search: ['name', 'email', 'ort'], sort: 'name', importable: true,
    related: [{ res: 'produkte', field: 'lieferant_id' }, { res: 'ausgaben', field: 'lieferant_id' }],
    fields: [
      { name: 'name', label: 'Name', type: 'string', required: true, list: true },
      { name: 'ansprechpartner', label: 'Ansprechpartner', type: 'string', list: true },
      { name: 'email', label: 'E-Mail', type: 'email', list: true },
      { name: 'telefon', label: 'Telefon', type: 'tel', list: true },
      { name: 'website', label: 'Website', type: 'url' },
      ...ADRESSE,
      { name: 'kundennummer', label: 'Unsere Kd.-Nr. dort', type: 'string' },
      { name: 'notizen', label: 'Notizen', type: 'text' },
    ],
  },

  // ------------------------------------------------------------ Projekte
  projekte: {
    label: 'Projekte', singular: 'Projekt', icon: 'folder', module: 'projekte',
    title: ['nummer', 'name'], search: ['nummer', 'name'], sort: 'ende', autoPrefix: 'PR-', board: 'status',
    related: [{ res: 'aufgaben', field: 'projekt_id' }, { res: 'zeiten', field: 'projekt_id' }, { res: 'rechnungen', field: 'projekt_id' }],
    fields: [
      { name: 'nummer', label: 'Nr.', type: 'string', readonly: true, list: true, auto: true },
      { name: 'name', label: 'Projektname', type: 'string', required: true, list: true },
      { name: 'kunde_id', label: 'Kunde', type: 'ref', ref: 'kunden', list: true },
      { name: 'status', label: 'Status', type: 'enum', options: ['Planung', 'Aktiv', 'Pausiert', 'Abgeschlossen', 'Abgebrochen'], default: 'Planung', list: true, filter: true },
      { name: 'prioritaet', label: 'Priorität', type: 'enum', options: PRIO, default: 'Normal' },
      { name: 'start', label: 'Start', type: 'date', default: 'today' },
      { name: 'ende', label: 'Deadline', type: 'date', list: true },
      { name: 'budget', label: 'Budget', type: 'money', default: 0, list: true },
      { name: 'stundensatz', label: 'Stundensatz (netto)', type: 'money', default: 95 },
      { name: 'fortschritt', label: 'Fortschritt', type: 'percent', default: 0, min: 0, max: 100, list: true },
      { name: 'leiter_id', label: 'Projektleitung', type: 'ref', ref: 'benutzer', default: 'me' },
      { name: 'beschreibung', label: 'Beschreibung', type: 'text' },
    ],
  },
  aufgaben: {
    label: 'Aufgaben', singular: 'Aufgabe', icon: 'check', module: 'projekte',
    title: ['titel'], search: ['titel', 'beschreibung'], sort: 'faellig', board: 'status',
    fields: [
      { name: 'titel', label: 'Titel', type: 'string', required: true, list: true },
      { name: 'projekt_id', label: 'Projekt', type: 'ref', ref: 'projekte', list: true },
      { name: 'kunde_id', label: 'Kunde', type: 'ref', ref: 'kunden' },
      { name: 'status', label: 'Status', type: 'enum', options: ['Offen', 'In Arbeit', 'Review', 'Erledigt'], default: 'Offen', list: true, filter: true },
      { name: 'prioritaet', label: 'Priorität', type: 'enum', options: PRIO, default: 'Normal', list: true, filter: true },
      { name: 'faellig', label: 'Fällig', type: 'date', list: true },
      { name: 'zustaendig_id', label: 'Zuständig', type: 'ref', ref: 'benutzer', default: 'me', list: true, filter: true },
      { name: 'beschreibung', label: 'Beschreibung', type: 'text' },
    ],
  },

  // ------------------------------------------------------------- Support
  tickets: {
    label: 'Support-Tickets', singular: 'Ticket', icon: 'lifebuoy', module: 'support',
    title: ['nummer', 'betreff'], search: ['nummer', 'betreff', 'beschreibung'], sort: 'created_at', sortDir: 'desc',
    autoPrefix: 'T-', board: 'status',
    fields: [
      { name: 'nummer', label: 'Nr.', type: 'string', readonly: true, list: true, auto: true },
      { name: 'betreff', label: 'Betreff', type: 'string', required: true, list: true },
      { name: 'kunde_id', label: 'Kunde', type: 'ref', ref: 'kunden', list: true },
      { name: 'kontakt_id', label: 'Kontakt', type: 'ref', ref: 'kontakte' },
      { name: 'kategorie', label: 'Kategorie', type: 'enum', options: ['Anfrage', 'Störung', 'Wartung', 'Installation', 'Rechnung', 'Sonstiges'], default: 'Anfrage', filter: true },
      { name: 'prioritaet', label: 'Priorität', type: 'enum', options: PRIO, default: 'Normal', list: true, filter: true },
      { name: 'status', label: 'Status', type: 'enum', options: ['Neu', 'Offen', 'Wartend', 'Gelöst', 'Geschlossen'], default: 'Neu', list: true, filter: true },
      { name: 'zustaendig_id', label: 'Zuständig', type: 'ref', ref: 'benutzer', list: true },
      { name: 'beschreibung', label: 'Beschreibung', type: 'text' },
      { name: 'loesung', label: 'Lösung', type: 'text' },
    ],
  },

  // ------------------------------------------------------------ Personal
  mitarbeiter: {
    label: 'Mitarbeiter', singular: 'Mitarbeiter', icon: 'id', module: 'personal',
    title: ['vorname', 'nachname'], search: ['vorname', 'nachname', 'email', 'position'], sort: 'nachname',
    autoPrefix: 'M-', importable: true,
    perm: { read: MANAGEMENT, write: MANAGEMENT },
    fields: [
      { name: 'personalnr', label: 'Pers.-Nr.', type: 'string', readonly: true, list: true, auto: true },
      { name: 'vorname', label: 'Vorname', type: 'string', required: true, list: true },
      { name: 'nachname', label: 'Nachname', type: 'string', required: true, list: true },
      { name: 'abteilung', label: 'Abteilung', type: 'enum', options: ['Geschäftsführung', 'Vertrieb', 'Entwicklung', 'Support', 'IT-Betrieb', 'Marketing', 'Verwaltung'], list: true, filter: true },
      { name: 'position', label: 'Position', type: 'string', list: true },
      { name: 'email', label: 'E-Mail', type: 'email' },
      { name: 'telefon', label: 'Telefon', type: 'tel' },
      { name: 'eintritt', label: 'Eintritt', type: 'date' },
      { name: 'vertragsart', label: 'Vertragsart', type: 'enum', options: ['Vollzeit', 'Teilzeit', 'Minijob', 'Werkstudent', 'Auszubildende/r', 'Freelancer'], default: 'Vollzeit' },
      { name: 'gehalt', label: 'Bruttogehalt / Monat', type: 'money' },
      { name: 'urlaubstage', label: 'Urlaubstage / Jahr', type: 'int', default: 30 },
      { name: 'status', label: 'Status', type: 'enum', options: ['Aktiv', 'Urlaub', 'Krank', 'Elternzeit', 'Ausgeschieden'], default: 'Aktiv', list: true, filter: true },
      { name: 'user_id', label: 'Benutzerkonto', type: 'ref', ref: 'benutzer' },
      { name: 'notizen', label: 'Notizen', type: 'text' },
    ],
  },
  zeiten: {
    label: 'Zeiterfassung', singular: 'Zeiteintrag', icon: 'clock', module: 'personal',
    title: ['beschreibung'], search: ['beschreibung'], sort: 'datum', sortDir: 'desc',
    fields: [
      { name: 'datum', label: 'Datum', type: 'date', default: 'today', required: true, list: true },
      { name: 'user_id', label: 'Mitarbeiter', type: 'ref', ref: 'benutzer', default: 'me', list: true, filter: true },
      { name: 'projekt_id', label: 'Projekt', type: 'ref', ref: 'projekte', list: true },
      { name: 'stunden', label: 'Stunden', type: 'number', required: true, min: 0, max: 24, list: true },
      { name: 'beschreibung', label: 'Tätigkeit', type: 'string', required: true, list: true },
      { name: 'abrechenbar', label: 'Abrechenbar', type: 'bool', default: true, list: true },
      { name: 'abgerechnet', label: 'Abgerechnet', type: 'bool', default: false, list: true, readonly: true },
    ],
  },

  // ------------------------------------------------------------ Finanzen
  ausgaben: {
    label: 'Ausgaben', singular: 'Ausgabe', icon: 'wallet', module: 'finanzen',
    title: ['beschreibung'], search: ['beschreibung', 'belegnr'], sort: 'datum', sortDir: 'desc',
    perm: { read: MANAGEMENT, write: MANAGEMENT },
    fields: [
      { name: 'datum', label: 'Datum', type: 'date', default: 'today', required: true, list: true },
      { name: 'beschreibung', label: 'Beschreibung', type: 'string', required: true, list: true },
      { name: 'kategorie', label: 'Kategorie', type: 'enum', options: ['Hardware', 'Software / Lizenzen', 'Hosting / Cloud', 'Miete', 'Personal', 'Marketing', 'Reisen', 'Büro', 'Fortbildung', 'Versicherung', 'Sonstiges'], default: 'Sonstiges', list: true, filter: true },
      { name: 'lieferant_id', label: 'Lieferant', type: 'ref', ref: 'lieferanten', list: true },
      { name: 'netto', label: 'Netto', type: 'money', required: true },
      { name: 'mwst', label: 'MwSt.-Satz %', type: 'enum', options: ['19', '7', '0'], default: '19' },
      { name: 'brutto', label: 'Brutto', type: 'money', readonly: true, list: true },
      { name: 'belegnr', label: 'Beleg-Nr.', type: 'string' },
      { name: 'bezahlt', label: 'Bezahlt', type: 'bool', default: true, list: true },
    ],
  },

  // ------------------------------------------------------------ Kalender
  termine: {
    label: 'Termine', singular: 'Termin', icon: 'calendar', module: 'kalender',
    title: ['titel'], search: ['titel', 'ort'], sort: 'start',
    fields: [
      { name: 'titel', label: 'Titel', type: 'string', required: true, list: true },
      { name: 'typ', label: 'Art', type: 'enum', options: ['Meeting', 'Anruf', 'Vor-Ort-Termin', 'Webinar', 'Schulung', 'Intern', 'Urlaub'], default: 'Meeting', list: true, filter: true },
      { name: 'start', label: 'Beginn', type: 'datetime', required: true, list: true },
      { name: 'ende', label: 'Ende', type: 'datetime' },
      { name: 'ort', label: 'Ort / Link', type: 'string', list: true },
      { name: 'kunde_id', label: 'Kunde', type: 'ref', ref: 'kunden', list: true },
      { name: 'user_id', label: 'Verantwortlich', type: 'ref', ref: 'benutzer', default: 'me' },
      { name: 'notizen', label: 'Notizen', type: 'text' },
    ],
  },

  // ----------------------------------------------------------- Dokumente
  dokumente: {
    label: 'Dokumente', singular: 'Dokument', icon: 'paperclip', module: 'dokumente',
    title: ['name'], search: ['name', 'kategorie', 'datei_name'], sort: 'created_at', sortDir: 'desc',
    upload: true,
    fields: [
      { name: 'name', label: 'Titel', type: 'string', required: true, list: true },
      { name: 'kategorie', label: 'Kategorie', type: 'enum', options: ['Vertrag', 'Angebot', 'Rechnung', 'Dokumentation', 'Bild', 'Präsentation', 'Sonstiges'], default: 'Sonstiges', list: true, filter: true },
      { name: 'kunde_id', label: 'Kunde', type: 'ref', ref: 'kunden', list: true },
      { name: 'projekt_id', label: 'Projekt', type: 'ref', ref: 'projekte' },
      { name: 'datei_name', label: 'Datei', type: 'string', readonly: true, list: true },
      { name: 'mime', label: 'Dateityp', type: 'string', readonly: true },
      { name: 'groesse', label: 'Größe (Bytes)', type: 'int', readonly: true, list: true },
      { name: 'pfad', label: 'Pfad', type: 'string', readonly: true, hidden: true },
      { name: 'notizen', label: 'Notizen', type: 'text' },
    ],
  },
};

// Standard-Berechtigungen ergänzen
for (const [key, spec] of Object.entries(RESOURCES)) {
  spec.key = key;
  spec.table = spec.table || key;
  spec.perm = spec.perm || { read: ALL, write: WRITERS };
  spec.sortDir = spec.sortDir || 'asc';
}

const DEFAULT_SETTINGS = {
  firma: {
    name: 'IT - World', zusatz: 'IT Solutions', strasse: '', plz: '', ort: '', land: 'Deutschland',
    email: '', telefon: '', website: '', ustid: '', steuernummer: '', handelsregister: '',
    geschaeftsfuehrer: '', bank: '', iban: '', bic: '',
  },
  finanzen: { waehrung: 'EUR', mwst: 19, zahlungsziel: 14, angebotGueltig: 30, kleinunternehmer: false },
  texte: {
    angebotEinleitung: 'vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot:',
    rechnungEinleitung: 'für unsere Leistungen erlauben wir uns, Ihnen folgenden Betrag in Rechnung zu stellen:',
    fusszeile: 'Vielen Dank für Ihr Vertrauen in IT - World.',
  },
  social: { linkedin: '', xing: '', facebook: '', instagram: '', x: '', youtube: '', github: '' },
  module: Object.fromEntries(MODULES.map((m) => [m.key, true])),
  autoresponder: {
    aktiv: true,
    betreff: 'Ihre Anfrage bei {{firma}}',
    text: 'Hallo {{name}},\n\nvielen Dank für Ihre Anfrage. Wir haben Ihre Nachricht erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.\n\nMit freundlichen Grüßen\nIhr Team von {{firma}}',
    benachrichtigung: true,
  },
};

module.exports = { ROLES, ROLE_LABELS, MODULES, RESOURCES, DEFAULT_SETTINGS, WRITERS, MANAGEMENT };
