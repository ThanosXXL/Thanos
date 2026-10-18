// Gemeinsames Schema der Register (Verarbeitungsverzeichnis, Dienstleister, Betroffenenanfragen,
// Schulungen). Wird im Renderer (window.SCHEMA) für die Formulare UND im Hauptprozess
// (require) zur Validierung eingelesen – so kann sich beides nie auseinanderentwickeln.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SCHEMA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Feldtypen: text | textarea | select | date | bool | number
  const REGISTER = {
    vvt: {
      id: 'vvt',
      titel: 'Verarbeitungsverzeichnis',
      sub: 'Verzeichnis von Verarbeitungstätigkeiten nach Art. 30 DSGVO',
      einzahl: 'Verarbeitungstätigkeit',
      max: 500,
      titelFelder: ['name'],
      listenFelder: ['rechtsgrundlage', 'empfaenger', 'loeschfrist'],
      fields: [
        { k: 'name', l: 'Bezeichnung', t: 'text', req: true, wide: true, max: 160 },
        { k: 'zweck', l: 'Zweck der Verarbeitung', t: 'textarea', wide: true, max: 1000 },
        { k: 'rechtsgrundlage', l: 'Rechtsgrundlage', t: 'select', o: ['', 'Vertragserfüllung (Art. 6 Abs. 1 lit. b)', 'Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c)', 'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)', 'Einwilligung (Art. 6 Abs. 1 lit. a)', 'Beschäftigungsverhältnis (§ 26 BDSG)', 'Lebenswichtige / öffentliche Interessen (Art. 6 Abs. 1 lit. d/e)'] },
        { k: 'betroffene', l: 'Kategorien betroffener Personen', t: 'text', max: 300 },
        { k: 'datenkategorien', l: 'Kategorien personenbezogener Daten', t: 'textarea', wide: true, max: 1000 },
        { k: 'besondere', l: 'Besondere Kategorien (Art. 9) betroffen, z. B. Gesundheitsdaten', t: 'bool' },
        { k: 'empfaenger', l: 'Empfänger / Empfängerkategorien', t: 'text', max: 300 },
        { k: 'drittland', l: 'Übermittlung in Drittländer', t: 'select', o: ['Nein', 'Ja – mit Garantien (Angemessenheitsbeschluss / SCC)', 'Ja – ohne Garantien (prüfen!)'] },
        { k: 'loeschfrist', l: 'Löschfrist', t: 'text', max: 200 },
        { k: 'tom', l: 'Technische und organisatorische Maßnahmen', t: 'textarea', wide: true, max: 1000 },
        { k: 'verantwortlich', l: 'Verantwortliche Stelle / Fachbereich', t: 'text', max: 160 },
        { k: 'pruefung', l: 'Nächste Überprüfung', t: 'date' }
      ],
      vorlagen: [
        { name: 'Personalverwaltung und Lohnabrechnung', zweck: 'Durchführung des Beschäftigungsverhältnisses, Entgeltabrechnung, Erfüllung von Melde- und Aufbewahrungspflichten', rechtsgrundlage: 'Beschäftigungsverhältnis (§ 26 BDSG)', betroffene: 'Beschäftigte, Bewerbende, Angehörige (Steuer/Sozialversicherung)', datenkategorien: 'Stammdaten, Kontaktdaten, Bankverbindung, Steuer-ID, Sozialversicherungsdaten, Arbeitszeiten, ggf. Gesundheitsdaten (Krankmeldungen)', besondere: true, empfaenger: 'Steuerberatung/Lohnbüro, Sozialversicherungsträger, Finanzamt, Banken', drittland: 'Nein', loeschfrist: 'Gesetzliche Aufbewahrungsfristen (i. d. R. 6–10 Jahre), danach Löschung', tom: 'Zugriff nur Personalabteilung, verschlüsselte Ablage, Berechtigungskonzept' },
        { name: 'Kundenverwaltung (CRM, Angebote, Rechnungen)', zweck: 'Anbahnung und Abwicklung von Verträgen, Rechnungsstellung, Kundenkommunikation', rechtsgrundlage: 'Vertragserfüllung (Art. 6 Abs. 1 lit. b)', betroffene: 'Kunden, Interessenten, Ansprechpartner', datenkategorien: 'Name, Anschrift, E-Mail, Telefon, Vertrags- und Rechnungsdaten, Kommunikationsverlauf', besondere: false, empfaenger: 'Steuerberatung, Zahlungsdienstleister, IT-Dienstleister', drittland: 'Nein', loeschfrist: 'Vertragsende + gesetzliche Aufbewahrung (6/10 Jahre)', tom: 'Rollenbasierter Zugriff, MFA, Backup, Protokollierung' },
        { name: 'Website und Kontaktformular', zweck: 'Bereitstellung der Website, Beantwortung von Anfragen, Sicherheit des Webservers', rechtsgrundlage: 'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)', betroffene: 'Websitebesucher, Anfragende', datenkategorien: 'IP-Adresse, Server-Logdaten, Formulardaten (Name, E-Mail, Nachricht)', besondere: false, empfaenger: 'Hosting-Anbieter', drittland: 'Nein', loeschfrist: 'Server-Logs 7–14 Tage, Anfragen nach Bearbeitung/Verjährung', tom: 'TLS, aktuelles CMS, Spamschutz ohne externe Tracker' },
        { name: 'Newsletter-Versand', zweck: 'Versand von Informationen und Werbung an Abonnenten', rechtsgrundlage: 'Einwilligung (Art. 6 Abs. 1 lit. a)', betroffene: 'Newsletter-Abonnenten', datenkategorien: 'E-Mail-Adresse, Name, Anmeldezeitpunkt, Einwilligungsnachweis, Öffnungs-/Klickstatistik', besondere: false, empfaenger: 'Newsletter-Dienstleister (AVV)', drittland: 'Nein', loeschfrist: 'Bis Widerruf; Nachweis der Einwilligung bis zu 3 Jahre danach', tom: 'Double-Opt-In, Protokollierung, AVV' },
        { name: 'Bewerbermanagement', zweck: 'Durchführung von Bewerbungsverfahren', rechtsgrundlage: 'Beschäftigungsverhältnis (§ 26 BDSG)', betroffene: 'Bewerbende', datenkategorien: 'Kontaktdaten, Lebenslauf, Zeugnisse, Gesprächsnotizen', besondere: false, empfaenger: 'Entscheidungsträger im Unternehmen', drittland: 'Nein', loeschfrist: '6 Monate nach Abschluss des Verfahrens (ohne Einwilligung)', tom: 'Zugriffsbeschränkung, Löschroutine' },
        { name: 'Videoüberwachung Geschäftsräume', zweck: 'Schutz vor Diebstahl und Vandalismus', rechtsgrundlage: 'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)', betroffene: 'Kunden, Beschäftigte, Besucher', datenkategorien: 'Videoaufnahmen', besondere: false, empfaenger: 'Wachdienst, ggf. Polizei im Anlassfall', drittland: 'Nein', loeschfrist: 'Spätestens nach 72 Stunden', tom: 'Hinweisschilder, Zugriff nur Geschäftsleitung, DSFA geprüft' },
        { name: 'IT-Administration und Protokollierung', zweck: 'Sicherstellung von IT-Sicherheit und Betrieb, Fehleranalyse, Erkennung von Angriffen', rechtsgrundlage: 'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)', betroffene: 'Beschäftigte, externe Nutzer', datenkategorien: 'Benutzerkennungen, Anmeldezeiten, IP-Adressen, Systemprotokolle', besondere: false, empfaenger: 'IT-Dienstleister (AVV)', drittland: 'Nein', loeschfrist: '90 Tage bis 12 Monate je nach Protokollart', tom: 'Zugriff nur Administratoren, Manipulationsschutz der Logs' }
      ]
    },
    dienstleister: {
      id: 'dienstleister',
      titel: 'Dienstleister & AV-Verträge',
      sub: 'Auftragsverarbeiter (Art. 28 DSGVO) und Lieferkette (NIS2)',
      einzahl: 'Dienstleister',
      max: 500,
      titelFelder: ['name'],
      listenFelder: ['leistung', 'standort', 'zertifikat'],
      fields: [
        { k: 'name', l: 'Dienstleister', t: 'text', req: true, wide: true, max: 160 },
        { k: 'leistung', l: 'Leistung', t: 'text', max: 300 },
        { k: 'kategorie', l: 'Kategorie', t: 'select', o: ['IT / Cloud / Hosting', 'IT-Support / Managed Service', 'Lohn / Buchhaltung / Steuer', 'Marketing / Newsletter', 'Sonstiges'] },
        { k: 'avv', l: 'AV-Vertrag', t: 'select', o: ['Vertrag liegt vor', 'In Verhandlung', 'Fehlt', 'Nicht erforderlich'] },
        { k: 'avvDatum', l: 'Datum des AV-Vertrags', t: 'date' },
        { k: 'standort', l: 'Verarbeitungsstandort', t: 'select', o: ['EU/EWR (Deutschland)', 'EU/EWR (anderes Land)', 'Drittland mit Garantien', 'Drittland ohne Garantien (prüfen!)'] },
        { k: 'zertifikat', l: 'Zertifikate (ISO 27001, BSI C5, SOC 2 …)', t: 'text', max: 200 },
        { k: 'risiko', l: 'Risiko für Ihr Unternehmen', t: 'select', o: ['Niedrig', 'Mittel', 'Hoch'] },
        { k: 'pruefung', l: 'Nächste Überprüfung', t: 'date' },
        { k: 'kontakt', l: 'Ansprechperson / Meldeweg bei Vorfällen', t: 'text', max: 300 },
        { k: 'notiz', l: 'Notizen', t: 'textarea', wide: true, max: 1000 }
      ]
    },
    anfragen: {
      id: 'anfragen',
      titel: 'Betroffenenanfragen',
      sub: 'Auskunft, Löschung und weitere Rechte nach Art. 12 – 22 DSGVO mit Monatsfrist',
      einzahl: 'Anfrage',
      max: 1000,
      titelFelder: ['art', 'referenz'],
      listenFelder: ['status'],
      fields: [
        { k: 'eingang', l: 'Eingang der Anfrage', t: 'date', req: true },
        { k: 'art', l: 'Art der Anfrage', t: 'select', o: ['Auskunft (Art. 15)', 'Berichtigung (Art. 16)', 'Löschung (Art. 17)', 'Einschränkung (Art. 18)', 'Datenübertragbarkeit (Art. 20)', 'Widerspruch (Art. 21)', 'Widerruf der Einwilligung'] },
        { k: 'referenz', l: 'Aktenzeichen / Kürzel (Klarnamen vermeiden)', t: 'text', max: 100 },
        { k: 'status', l: 'Status', t: 'select', o: ['Offen', 'In Bearbeitung', 'Beantwortet', 'Abgelehnt (mit Begründung)'] },
        { k: 'verlaengert', l: 'Fristverlängerung um 2 Monate mitgeteilt (Art. 12 Abs. 3)', t: 'bool' },
        { k: 'erledigtAm', l: 'Beantwortet am', t: 'date' },
        { k: 'notiz', l: 'Notizen (datensparsam)', t: 'textarea', wide: true, max: 1000 }
      ]
    },
    schulungen: {
      id: 'schulungen',
      titel: 'Schulungen & Nachweise',
      sub: 'Awareness, Datenschutz und Pflichtschulungen der Geschäftsleitung belegen',
      einzahl: 'Schulung',
      max: 500,
      titelFelder: ['thema'],
      listenFelder: ['art', 'teilnehmerzahl'],
      fields: [
        { k: 'thema', l: 'Thema', t: 'text', req: true, wide: true, max: 160 },
        { k: 'art', l: 'Art', t: 'select', o: ['Awareness (alle Beschäftigten)', 'Geschäftsleitung (NIS2)', 'Datenschutz', 'Notfall-/Incident-Übung', 'Sonstiges'] },
        { k: 'datum', l: 'Durchgeführt am', t: 'date' },
        { k: 'teilnehmerzahl', l: 'Anzahl Teilnehmende', t: 'number', max: 6 },
        { k: 'trainer', l: 'Schulende Person / Anbieter', t: 'text', max: 160 },
        { k: 'teilnehmer', l: 'Teilnehmende (Gruppen oder Namen)', t: 'textarea', wide: true, max: 1000 },
        { k: 'nachweis', l: 'Nachweis (Ablageort der Teilnehmerliste / des Zertifikats)', t: 'text', wide: true, max: 300 },
        { k: 'naechste', l: 'Nächste Wiederholung', t: 'date' }
      ]
    }
  };

  const AUTOLOCK_MINUTEN = [0, 1, 5, 10, 15, 30, 60];

  return { REGISTER, AUTOLOCK_MINUTEN };
});
