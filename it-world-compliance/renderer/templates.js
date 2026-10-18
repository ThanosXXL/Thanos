// Dokumentvorlagen. Platzhalter: [FIRMA], [DATUM] werden beim Kopieren/Speichern ersetzt.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VORLAGEN = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return [
    {
      id: 'bsi-erstmeldung',
      gruppe: 'Meldungen',
      titel: 'NIS2: Frühwarnung an das BSI (innerhalb 24 Std.)',
      text: `FRÜHWARNUNG – ERHEBLICHER SICHERHEITSVORFALL
Einrichtung: [FIRMA]
Datum/Uhrzeit der Meldung: [DATUM]

1. Kenntnisnahme des Vorfalls
   Zeitpunkt der Kenntnis: ______________________
   Ansprechperson (24/7 erreichbar): ______________________  Telefon: ______________

2. Erste Einschätzung
   [ ] Verdacht auf rechtswidrige oder böswillige Handlung
   [ ] Auswirkungen auf andere Mitgliedstaaten (grenzüberschreitend) möglich
   [ ] Ursache noch unklar

3. Kurzbeschreibung (was ist bekannt?)
   ____________________________________________________________

4. Bereits eingeleitete Sofortmaßnahmen
   ____________________________________________________________

Hinweis: Die Vorfallmeldung mit erster Bewertung (Schweregrad, Auswirkungen, Kompromittierungsindikatoren) folgt innerhalb von 72 Stunden nach Kenntnis, der Abschlussbericht spätestens einen Monat danach.`
    },
    {
      id: 'bsi-vorfallmeldung',
      gruppe: 'Meldungen',
      titel: 'NIS2: Vorfallmeldung und Abschlussbericht (72 Std. / 1 Monat)',
      text: `VORFALLMELDUNG / ABSCHLUSSBERICHT
Einrichtung: [FIRMA]    Datum: [DATUM]
Bezug zur Frühwarnung vom: ______________________

A) Vorfallmeldung (innerhalb 72 Stunden)
   - Erste Bewertung des Vorfalls, Schweregrad: ______________________
   - Betroffene Systeme/Dienste und Auswirkungen: ______________________
   - Kompromittierungsindikatoren (IoC), soweit bekannt: ______________________
   - Aktualisierung der Frühwarnung: ______________________

B) Abschlussbericht (spätestens 1 Monat nach der Vorfallmeldung)
   - Ausführliche Beschreibung inkl. Schweregrad und Auswirkungen: ______________________
   - Art der Bedrohung bzw. Ursache (Root Cause): ______________________
   - Ergriffene und laufende Abhilfemaßnahmen: ______________________
   - Gegebenenfalls grenzüberschreitende Auswirkungen: ______________________
   - Lessons Learned / geplante Verbesserungen: ______________________`
    },
    {
      id: 'dsgvo-art33',
      gruppe: 'Meldungen',
      titel: 'DSGVO: Meldung einer Datenpanne an die Aufsichtsbehörde (Art. 33)',
      text: `MELDUNG EINER VERLETZUNG DES SCHUTZES PERSONENBEZOGENER DATEN (Art. 33 DSGVO)
Verantwortlicher: [FIRMA]    Datum der Meldung: [DATUM]
Zeitpunkt der Kenntnis (Frist: 72 Stunden): ______________________
Verzögerungsgrund bei Überschreitung der Frist: ______________________

1. Art der Verletzung (Verlust der Vertraulichkeit / Integrität / Verfügbarkeit)
   Beschreibung: ______________________
2. Kategorien und ungefähre Zahl der betroffenen Personen: ______________________
3. Kategorien und ungefähre Zahl der betroffenen Datensätze: ______________________
4. Name und Kontaktdaten der/des Datenschutzbeauftragten bzw. einer sonstigen Anlaufstelle: ______________________
5. Wahrscheinliche Folgen der Verletzung: ______________________
6. Ergriffene oder vorgeschlagene Maßnahmen (inkl. Abmilderung nachteiliger Folgen): ______________________
7. Hohes Risiko für die Betroffenen? [ ] ja (Benachrichtigung nach Art. 34)  [ ] nein – Begründung: ______________________`
    },
    {
      id: 'dsgvo-art34',
      gruppe: 'Meldungen',
      titel: 'DSGVO: Benachrichtigung betroffener Personen (Art. 34)',
      text: `Betreff: Wichtige Information zum Schutz Ihrer Daten

Sehr geehrte Damen und Herren,

bei [FIRMA] ist am ______________ ein Sicherheitsvorfall aufgetreten, von dem auch personenbezogene Daten von Ihnen betroffen sein können.

Was ist passiert: ______________________
Welche Daten sind betroffen: ______________________
Mögliche Folgen für Sie: ______________________
Was wir getan haben: ______________________
Was Sie tun können (z. B. Passwörter ändern, auf verdächtige Nachrichten achten): ______________________

Bei Fragen erreichen Sie unseren Ansprechpartner unter: ______________________

Wir bedauern den Vorfall und bitten um Entschuldigung.

Mit freundlichen Grüßen
[FIRMA]`
    },
    {
      id: 'auskunft',
      gruppe: 'Betroffenenrechte',
      titel: 'DSGVO: Antwort auf ein Auskunftsersuchen (Art. 15)',
      text: `Betreff: Ihre Anfrage vom ______________ nach Art. 15 DSGVO

Sehr geehrte/r ______________,

vielen Dank für Ihre Anfrage. Wir haben Ihre Identität geprüft und teilen Ihnen Folgendes mit:

1. Verarbeitungszwecke: ______________________
2. Kategorien personenbezogener Daten: ______________________
3. Empfänger oder Kategorien von Empfängern: ______________________
4. Geplante Speicherdauer bzw. Kriterien dafür: ______________________
5. Herkunft der Daten (falls nicht bei Ihnen erhoben): ______________________
6. Automatisierte Entscheidungsfindung / Profiling: [ ] nein  [ ] ja, Logik: ______________________
7. Übermittlung in Drittländer und Garantien: ______________________

Sie haben das Recht auf Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch und Datenübertragbarkeit sowie das Recht auf Beschwerde bei einer Datenschutzaufsichtsbehörde.

Eine Kopie Ihrer Daten ist beigefügt.

Mit freundlichen Grüßen
[FIRMA], [DATUM]`
    },
    {
      id: 'verpflichtung',
      gruppe: 'Datenschutz',
      titel: 'Verpflichtung der Beschäftigten auf Vertraulichkeit und Datenschutz',
      text: `VERPFLICHTUNG AUF VERTRAULICHKEIT UND DATENSCHUTZ

Name der/des Beschäftigten: ______________________
Arbeitgeber: [FIRMA]

Ich verpflichte mich,
 - personenbezogene Daten ausschließlich im Rahmen meiner Aufgaben und nach Weisung des Arbeitgebers zu verarbeiten (Art. 29, 32 Abs. 4 DSGVO),
 - über Betriebs- und Geschäftsgeheimnisse sowie vertrauliche Informationen Stillschweigen zu bewahren, auch nach Beendigung des Arbeitsverhältnisses,
 - Zugangsdaten nicht weiterzugeben und Datenschutzvorfälle unverzüglich zu melden an: ______________________

Ich wurde über die Datenschutzregeln unterrichtet. Verstöße können arbeitsrechtliche, zivilrechtliche und strafrechtliche Folgen haben.

Ort, Datum: ______________    Unterschrift: ______________________`
    },
    {
      id: 'avv-checkliste',
      gruppe: 'Datenschutz',
      titel: 'Checkliste: Auftragsverarbeitungsvertrag (Art. 28 Abs. 3)',
      text: `CHECKLISTE AUFTRAGSVERARBEITUNGSVERTRAG – Prüfung für [FIRMA], [DATUM]
Dienstleister: ______________________

[ ] Gegenstand, Dauer, Art und Zweck der Verarbeitung beschrieben
[ ] Art der personenbezogenen Daten und Kategorien betroffener Personen festgelegt
[ ] Verarbeitung nur auf dokumentierte Weisung des Verantwortlichen
[ ] Verpflichtung der eingesetzten Personen zur Vertraulichkeit
[ ] Technische und organisatorische Maßnahmen (Art. 32) beschrieben und ausreichend
[ ] Regeln zu Unterauftragsverarbeitern (Genehmigung, Information, gleiche Pflichten)
[ ] Unterstützung bei Betroffenenanfragen
[ ] Unterstützung bei Sicherheit, Meldung von Datenpannen (Frist!), DSFA
[ ] Löschung oder Rückgabe der Daten nach Vertragsende
[ ] Nachweis- und Kontrollrechte (Audits, Zertifikate)
[ ] Drittlandübermittlung: Garantien geprüft (SCC / Angemessenheitsbeschluss)
[ ] Meldeweg bei Sicherheitsvorfällen für NIS2-Lieferkette vereinbart`
    },
    {
      id: 'it-leitlinie',
      gruppe: 'Richtlinien',
      titel: 'Informationssicherheitsleitlinie (Kurzfassung)',
      text: `INFORMATIONSSICHERHEITSLEITLINIE – [FIRMA]
Gültig ab: [DATUM]

1. Ziel
   Wir schützen Vertraulichkeit, Integrität und Verfügbarkeit unserer Informationen, Systeme und Dienste und erfüllen die Anforderungen aus NIS2 und DSGVO.

2. Verantwortung
   Die Geschäftsleitung trägt die Gesamtverantwortung, genehmigt Maßnahmen und überwacht deren Umsetzung. Informationssicherheitsbeauftragte/r: ______________________

3. Grundregeln
   - Zugriff nur nach Bedarf (Minimalprinzip), Mehrfaktor-Authentifizierung für Administratoren und Fernzugriff
   - Aktuelle Software, zeitnahes Einspielen von Sicherheitsupdates
   - Regelmäßige, getestete Datensicherungen (3-2-1-Regel)
   - Verschlüsselung von mobilen Geräten und Datenträgern
   - Sicherheitsvorfälle werden unverzüglich gemeldet an: ______________________
   - Alle Beschäftigten werden mindestens jährlich geschult

4. Überprüfung
   Diese Leitlinie wird mindestens jährlich überprüft.

______________________
Geschäftsleitung`
    },
    {
      id: 'incident-plan',
      gruppe: 'Richtlinien',
      titel: 'Incident-Response-Kurzplan',
      text: `INCIDENT-RESPONSE-KURZPLAN – [FIRMA], Stand [DATUM]

1. ERKENNEN: Auffälligkeit sofort melden an ______________________ (Tel. ______________)
2. EINGRENZEN: Betroffene Geräte vom Netz trennen (nicht ausschalten, Beweise sichern); Konten sperren; Passwörter ändern.
3. BEWERTEN: Welche Systeme/Daten? Sind personenbezogene Daten betroffen? Ist der Vorfall „erheblich“ (Kriterien siehe Bewertungsmatrix)?
4. MELDEN: Zeitpunkt der Kenntnis festhalten!
   - NIS2: Frühwarnung 24 Std., Vorfallmeldung 72 Std., Abschlussbericht 1 Monat
   - DSGVO: Aufsichtsbehörde 72 Std.; Betroffene bei hohem Risiko unverzüglich
   - Versicherung/Polizei/Kunden nach Bedarf
5. BESEITIGEN: Ursache beheben, Systeme sauber neu aufsetzen, Backups prüfen.
6. WIEDERHERSTELLEN: Betrieb nach Priorität wieder aufnehmen, Überwachung verstärken.
7. LERNEN: Nachbereitung innerhalb von 14 Tagen, Maßnahmen ins Risikoregister.

Notfallkontakte: IT-Dienstleister ______________  Datenschutz ______________  Geschäftsleitung ______________  Forensik ______________`
    },
    {
      id: 'passwort-richtlinie',
      gruppe: 'Richtlinien',
      titel: 'Passwort- und Zugriffsrichtlinie',
      text: `PASSWORT- UND ZUGRIFFSRICHTLINIE – [FIRMA], gültig ab [DATUM]

1. Passwörter: mindestens 14 Zeichen oder Passphrase aus mehreren Wörtern; einzigartig je Dienst; Verwaltung im freigegebenen Passwortmanager.
2. Keine Weitergabe von Passwörtern, auch nicht an Vorgesetzte oder IT-Support (Support fragt nie nach dem Passwort).
3. Mehrfaktor-Authentifizierung ist Pflicht für: Administratorkonten, E-Mail, VPN/Fernzugriff, Cloud-Dienste.
4. Zugriffsrechte nach Minimalprinzip; Administratorrechte nur für Administrationsaufgaben mit separatem Konto.
5. Rechteprüfung mindestens jährlich; Rechteentzug bei Austritt oder Rollenwechsel am selben Tag.
6. Bildschirmsperre nach höchstens 10 Minuten Inaktivität.
7. Verdacht auf Kompromittierung sofort melden an: ______________________`
    },
    {
      id: 'loeschkonzept',
      gruppe: 'Datenschutz',
      titel: 'Löschkonzept (Tabellenvorlage)',
      text: `LÖSCHKONZEPT – [FIRMA], Stand [DATUM]

Datenart | System/Ablage | Aufbewahrungsgrund | Frist | Löschverfahren | Verantwortlich
-------- | ------------- | ------------------ | ----- | -------------- | --------------
Personalakten | HR-System | § 257 HGB / Arbeitsrecht | 3 Jahre nach Ausscheiden (Lohnunterlagen 6–10 Jahre) | Löschung im System + Papier vernichten | ______
Bewerbungen (Absagen) | E-Mail / Bewerber-Tool | berechtigtes Interesse (AGG) | 6 Monate | Automatische Löschung | ______
Rechnungen / Buchungsbelege | Buchhaltung | § 147 AO / § 257 HGB | 8–10 Jahre | Löschung nach Fristablauf | ______
Kundenanfragen | E-Mail / CRM | Vertragsanbahnung | 6 Monate ohne Vertragsschluss | manuell / automatisch | ______
Server-Logs | Webserver | IT-Sicherheit | 7–14 Tage | Log-Rotation | ______
Backups | Backup-System | Wiederherstellung | 30–90 Tage | Rotation, Medienvernichtung | ______`
    }
  ];
});
