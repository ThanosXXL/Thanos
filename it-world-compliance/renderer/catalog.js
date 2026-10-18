// Statischer Anforderungskatalog des Compliance-Assistenten.
// Wird vor renderer.js geladen und stellt window.CATALOG bereit. Nur die
// Bearbeitungsstände (Status, Notizen, Nachweise) landen in der Datendatei,
// der Katalog selbst bleibt unveränderlich im Programm.
(function () {
  'use strict';

  const STATUS = [
    { id: 'offen', label: 'Offen', weight: 0 },
    { id: 'laeuft', label: 'In Arbeit', weight: 0.5 },
    { id: 'erledigt', label: 'Erledigt', weight: 1 },
    { id: 'entfaellt', label: 'Nicht zutreffend', weight: null }
  ];

  const FRAMEWORKS = [
    {
      id: 'nis2',
      name: 'NIS2',
      titel: 'NIS2 / BSI-Gesetz',
      untertitel: 'Risikomanagement, Meldepflichten und Pflichten der Geschäftsleitung',
      icon: '🛡️',
      gruppen: [
        {
          name: 'Governance & Registrierung',
          items: [
            {
              id: 'nis2-01',
              prio: 'hoch',
              text: 'Betroffenheit geprüft und dokumentiert',
              ref: 'NIS2 Art. 2/3 · BSIG',
              hilfe: 'Prüfen Sie anhand von Sektor und Unternehmensgröße, ob Sie als „besonders wichtige“ oder „wichtige Einrichtung“ gelten. Nutzen Sie dazu den Betroffenheits-Check oben und halten Sie das Ergebnis schriftlich fest.',
              nachweise: 'Ergebnis-Protokoll des Betroffenheits-Checks, Unterlagen zu Mitarbeiterzahl, Umsatz und Bilanzsumme'
            },
            {
              id: 'nis2-02',
              prio: 'hoch',
              text: 'Registrierung beim BSI vorgenommen',
              ref: '§ 33 BSIG',
              hilfe: 'Betroffene Einrichtungen müssen sich innerhalb der gesetzlichen Frist nach Eintritt der Betroffenheit über das BSI-Portal registrieren und eine Kontaktstelle benennen.',
              nachweise: 'Registrierungsbestätigung, benannte Kontaktstelle (24/7 erreichbar)'
            },
            {
              id: 'nis2-03',
              prio: 'hoch',
              text: 'Geschäftsleitung billigt Maßnahmen, überwacht Umsetzung und wurde geschult',
              ref: '§ 38 BSIG',
              hilfe: 'Die Geschäftsleitung trägt die Verantwortung für das Risikomanagement und haftet persönlich. Sie muss die Maßnahmen billigen, überwachen und regelmäßig an Schulungen teilnehmen.',
              nachweise: 'Beschluss/Protokoll der Geschäftsleitung, Teilnahmebescheinigung Schulung'
            },
            {
              id: 'nis2-04',
              prio: 'mittel',
              text: 'Informationssicherheitsleitlinie verabschiedet',
              ref: '§ 30 BSIG',
              hilfe: 'Eine kurze, von der Geschäftsleitung unterzeichnete Leitlinie legt Ziele, Verantwortlichkeiten und Grundregeln der Informationssicherheit fest.',
              nachweise: 'Unterzeichnete Leitlinie, Verteilnachweis an Beschäftigte'
            }
          ]
        },
        {
          name: 'Risikomanagementmaßnahmen (Art. 21 NIS2)',
          items: [
            {
              id: 'nis2-10',
              prio: 'hoch',
              text: 'Risikoanalyse und Sicherheitskonzept für IT-Systeme',
              ref: '§ 30 Abs. 2 Nr. 1 BSIG',
              hilfe: 'Erfassen Sie Ihre wichtigen Systeme und Daten, bewerten Sie Bedrohungen und Eintrittswahrscheinlichkeiten und leiten Sie daraus Maßnahmen ab. Wiederholen Sie die Analyse mindestens jährlich.',
              nachweise: 'Risikoregister, Asset-Liste, Maßnahmenplan'
            },
            {
              id: 'nis2-11',
              prio: 'hoch',
              text: 'Prozess zur Bewältigung von Sicherheitsvorfällen',
              ref: '§ 30 Abs. 2 Nr. 2 BSIG',
              hilfe: 'Legen Sie fest, wer Vorfälle erkennt, bewertet, eskaliert und meldet. Üben Sie den Ablauf mindestens einmal jährlich.',
              nachweise: 'Incident-Response-Plan, Alarmierungsliste, Protokoll einer Übung'
            },
            {
              id: 'nis2-12',
              prio: 'hoch',
              text: 'Aufrechterhaltung des Betriebs: Backup, Wiederherstellung, Krisenmanagement',
              ref: '§ 30 Abs. 2 Nr. 3 BSIG',
              hilfe: 'Definieren Sie kritische Prozesse, Wiederanlaufzeiten und Notbetrieb. Backups müssen regelmäßig auf Wiederherstellbarkeit getestet werden.',
              nachweise: 'Notfallhandbuch, Backup-Konzept, Restore-Testprotokoll'
            },
            {
              id: 'nis2-13',
              prio: 'hoch',
              text: 'Sicherheit der Lieferkette bewertet',
              ref: '§ 30 Abs. 2 Nr. 4 BSIG',
              hilfe: 'Bewerten Sie Dienstleister und Zulieferer mit Zugriff auf Ihre Systeme oder Daten und vereinbaren Sie Sicherheitsanforderungen vertraglich.',
              nachweise: 'Lieferantenliste mit Risikoeinstufung, Sicherheitsklauseln in Verträgen'
            },
            {
              id: 'nis2-14',
              prio: 'mittel',
              text: 'Sicherheit bei Beschaffung, Entwicklung und Wartung inkl. Schwachstellenmanagement',
              ref: '§ 30 Abs. 2 Nr. 5 BSIG',
              hilfe: 'Berücksichtigen Sie Sicherheit schon beim Einkauf neuer Systeme und sorgen Sie für ein geregeltes Einspielen von Updates und Schwachstellen-Patches.',
              nachweise: 'Beschaffungsrichtlinie, Patch-Statusbericht'
            },
            {
              id: 'nis2-15',
              prio: 'mittel',
              text: 'Wirksamkeit der Maßnahmen wird regelmäßig bewertet',
              ref: '§ 30 Abs. 2 Nr. 6 BSIG',
              hilfe: 'Planen Sie interne Audits, Schwachstellenscans oder Penetrationstests und werten Sie die Ergebnisse mit der Geschäftsleitung aus.',
              nachweise: 'Auditbericht, Scan-/Pentest-Bericht, Management-Review'
            },
            {
              id: 'nis2-16',
              prio: 'mittel',
              text: 'Cyberhygiene und regelmäßige Schulungen der Beschäftigten',
              ref: '§ 30 Abs. 2 Nr. 7 BSIG',
              hilfe: 'Alle Beschäftigten sollten mindestens jährlich zu Phishing, Passwörtern und sicherem Arbeiten geschult werden. Neue Mitarbeitende bei Eintritt.',
              nachweise: 'Schulungsplan, Teilnehmerlisten, Zertifikate'
            },
            {
              id: 'nis2-17',
              prio: 'mittel',
              text: 'Kryptografie- und Verschlüsselungskonzept',
              ref: '§ 30 Abs. 2 Nr. 8 BSIG',
              hilfe: 'Regeln Sie, wann Daten bei Speicherung und Übertragung verschlüsselt werden (Notebooks, Backups, E-Mail, Fernzugriff) und wie Schlüssel verwaltet werden.',
              nachweise: 'Kryptokonzept, Nachweis Festplattenverschlüsselung'
            },
            {
              id: 'nis2-18',
              prio: 'hoch',
              text: 'Personalsicherheit, Zugriffskontrolle und Anlagenmanagement',
              ref: '§ 30 Abs. 2 Nr. 9 BSIG',
              hilfe: 'Vergeben Sie Rechte nach dem Minimalprinzip, regeln Sie Eintritt, Wechsel und Austritt von Personal und führen Sie ein aktuelles Inventar aller IT-Geräte und Software.',
              nachweise: 'Berechtigungskonzept, On-/Offboarding-Checkliste, Inventarliste'
            },
            {
              id: 'nis2-19',
              prio: 'hoch',
              text: 'Mehrfaktor-Authentifizierung und gesicherte Kommunikation',
              ref: '§ 30 Abs. 2 Nr. 10 BSIG',
              hilfe: 'Setzen Sie MFA mindestens für Administratoren, Fernzugriffe und Cloud-Dienste ein. Richten Sie einen sicheren Notfall-Kommunikationskanal ein, der auch bei einem Ausfall der normalen IT funktioniert.',
              nachweise: 'MFA-Abdeckungsübersicht, Notfallkommunikationsplan'
            }
          ]
        },
        {
          name: 'Meldepflichten',
          items: [
            {
              id: 'nis2-30',
              prio: 'hoch',
              text: 'Meldeprozess mit Fristen 24 h / 72 h / 1 Monat etabliert',
              ref: '§ 32 BSIG',
              hilfe: 'Erhebliche Sicherheitsvorfälle sind unverzüglich, spätestens binnen 24 Stunden als Erstmeldung, binnen 72 Stunden mit Bewertung und spätestens einen Monat später mit Abschlussbericht dem BSI zu melden. Der Reiter „Vorfälle & Fristen“ rechnet die Fristen für Sie aus.',
              nachweise: 'Meldevorlage, Zuständigkeiten, Testmeldung'
            },
            {
              id: 'nis2-31',
              prio: 'mittel',
              text: 'Nachweise gegenüber dem BSI vorbereitet',
              ref: '§ 39 BSIG',
              hilfe: 'Besonders wichtige Einrichtungen müssen die Umsetzung der Maßnahmen in regelmäßigen Abständen durch Audits, Prüfungen oder Zertifizierungen belegen. Sammeln Sie die Nachweise fortlaufend.',
              nachweise: 'Nachweismappe (siehe Bericht & Export), Audit-/Zertifizierungsberichte'
            }
          ]
        }
      ]
    },
    {
      id: 'dsgvo',
      name: 'DSGVO',
      titel: 'Datenschutz (DSGVO / BDSG)',
      untertitel: 'Dokumentation, Betroffenenrechte und technische Schutzmaßnahmen',
      icon: '🔏',
      gruppen: [
        {
          name: 'Organisation & Rechenschaft',
          items: [
            {
              id: 'dsgvo-01',
              prio: 'hoch',
              text: 'Verzeichnis von Verarbeitungstätigkeiten (VVT) geführt',
              ref: 'Art. 30 DSGVO',
              hilfe: 'Dokumentieren Sie je Verarbeitung Zweck, Datenkategorien, Betroffene, Empfänger, Löschfristen und Schutzmaßnahmen, z. B. Personalverwaltung, Kundendatenbank, Website, Videoüberwachung.',
              nachweise: 'VVT-Dokument mit Datum der letzten Aktualisierung'
            },
            {
              id: 'dsgvo-02',
              prio: 'mittel',
              text: 'Datenschutzbeauftragte/r benannt (falls erforderlich)',
              ref: 'Art. 37 DSGVO · § 38 BDSG',
              hilfe: 'In Deutschland besteht die Pflicht in der Regel, wenn mindestens 20 Personen ständig mit automatisierter Verarbeitung personenbezogener Daten beschäftigt sind, oder bei Datenschutz-Folgenabschätzung bzw. geschäftsmäßiger Datenübermittlung. Auch ohne Pflicht empfehlenswert.',
              nachweise: 'Benennungsurkunde, Meldung an die Aufsichtsbehörde, Veröffentlichung der Kontaktdaten'
            },
            {
              id: 'dsgvo-03',
              prio: 'hoch',
              text: 'Rechtsgrundlagen je Verarbeitung festgelegt und dokumentiert',
              ref: 'Art. 6 / 7 / 9 DSGVO',
              hilfe: 'Prüfen Sie für jede Verarbeitung, ob Vertrag, rechtliche Pflicht, berechtigtes Interesse oder Einwilligung greift. Einwilligungen müssen nachweisbar und widerrufbar sein.',
              nachweise: 'Ergänzung im VVT, Muster der Einwilligungstexte, Interessenabwägung'
            },
            {
              id: 'dsgvo-04',
              prio: 'mittel',
              text: 'Beschäftigte auf Datenschutz verpflichtet und geschult',
              ref: 'Art. 29 / 32 Abs. 4 DSGVO',
              hilfe: 'Beschäftigte, die mit personenbezogenen Daten arbeiten, werden auf Vertraulichkeit verpflichtet und regelmäßig sensibilisiert.',
              nachweise: 'Unterschriebene Verpflichtungserklärungen, Schulungsnachweise'
            }
          ]
        },
        {
          name: 'Transparenz & Betroffenenrechte',
          items: [
            {
              id: 'dsgvo-10',
              prio: 'hoch',
              text: 'Datenschutzerklärung (Website) und Informationspflichten aktuell',
              ref: 'Art. 13 / 14 DSGVO',
              hilfe: 'Website, Kundenverträge, Bewerbungen und Beschäftigtenverhältnisse benötigen verständliche Datenschutzinformationen. Prüfen Sie auch eingesetzte Tools wie Analytics, Karten, Schriftarten und Kontaktformulare.',
              nachweise: 'Aktuelle Datenschutzerklärung, Datenschutzhinweise für Beschäftigte und Bewerbende'
            },
            {
              id: 'dsgvo-11',
              prio: 'hoch',
              text: 'Prozess für Auskunft, Berichtigung, Löschung und Widerspruch',
              ref: 'Art. 12 – 22 DSGVO',
              hilfe: 'Anfragen müssen binnen eines Monats beantwortet werden. Legen Sie fest, wer Anfragen entgegennimmt, die Identität prüft und alle Systeme durchsucht.',
              nachweise: 'Ablaufbeschreibung, Anfragenregister, Antwortvorlagen'
            },
            {
              id: 'dsgvo-12',
              prio: 'mittel',
              text: 'Lösch- und Aufbewahrungskonzept umgesetzt',
              ref: 'Art. 5 Abs. 1 e / Art. 17 DSGVO',
              hilfe: 'Legen Sie pro Datenart Aufbewahrungsfristen (z. B. handels- und steuerrechtlich) und das Löschverfahren fest, einschließlich Backups.',
              nachweise: 'Löschkonzept, Löschprotokolle'
            },
            {
              id: 'dsgvo-13',
              prio: 'mittel',
              text: 'Cookies/Tracking auf der Website rechtskonform (Einwilligung)',
              ref: '§ 25 TDDDG · Art. 6 DSGVO',
              hilfe: 'Nicht notwendige Cookies und Tracking-Dienste dürfen erst nach aktiver Einwilligung geladen werden. Prüfen Sie das Verhalten Ihres Consent-Banners.',
              nachweise: 'Screenshots Consent-Banner, Cookie-Liste, Einwilligungsprotokoll'
            }
          ]
        },
        {
          name: 'Dienstleister & Drittländer',
          items: [
            {
              id: 'dsgvo-20',
              prio: 'hoch',
              text: 'Auftragsverarbeitungsverträge (AVV) mit allen Dienstleistern',
              ref: 'Art. 28 DSGVO',
              hilfe: 'Für jeden Dienstleister, der in Ihrem Auftrag personenbezogene Daten verarbeitet (Cloud, Hosting, Lohnbuchhaltung, IT-Support, Newsletter-Tool), braucht es einen AVV.',
              nachweise: 'AVV-Übersicht mit Vertragsdatum, unterzeichnete Verträge'
            },
            {
              id: 'dsgvo-21',
              prio: 'mittel',
              text: 'Drittlandübermittlungen geprüft (USA, UK, Indien …)',
              ref: 'Art. 44 – 49 DSGVO',
              hilfe: 'Prüfen Sie, ob Daten außerhalb des EWR verarbeitet werden, und stellen Sie Garantien sicher: Angemessenheitsbeschluss (z. B. EU-US Data Privacy Framework), Standardvertragsklauseln und Transfer-Folgenabschätzung.',
              nachweise: 'Liste Drittlandtransfers, Zertifizierungsnachweise, SCC'
            }
          ]
        },
        {
          name: 'Sicherheit & Datenpannen',
          items: [
            {
              id: 'dsgvo-30',
              prio: 'hoch',
              text: 'Technische und organisatorische Maßnahmen (TOM) dokumentiert',
              ref: 'Art. 32 / 24 / 25 DSGVO',
              hilfe: 'Beschreiben Sie Zutritts-, Zugangs-, Zugriffs-, Weitergabe-, Eingabe-, Auftrags- und Verfügbarkeitskontrolle sowie Trennungsgebot und Belastbarkeit.',
              nachweise: 'TOM-Dokument, Verweis auf IT-Sicherheitsnachweise'
            },
            {
              id: 'dsgvo-31',
              prio: 'hoch',
              text: 'Datenpannen-Prozess (Meldung binnen 72 h) vorhanden',
              ref: 'Art. 33 / 34 DSGVO',
              hilfe: 'Verletzungen des Schutzes personenbezogener Daten sind binnen 72 Stunden nach Kenntnis der Aufsichtsbehörde zu melden, bei hohem Risiko auch den Betroffenen. Jede Panne wird intern dokumentiert, auch wenn sie nicht gemeldet wird.',
              nachweise: 'Meldeprozess, Register der Datenpannen (siehe Vorfälle & Fristen)'
            },
            {
              id: 'dsgvo-32',
              prio: 'mittel',
              text: 'Datenschutz-Folgenabschätzung (DSFA) bei hohem Risiko geprüft',
              ref: 'Art. 35 DSGVO',
              hilfe: 'Bei umfangreicher Verarbeitung sensibler Daten, Videoüberwachung, Profiling oder neuen Technologien ist vorab eine DSFA nötig. Dokumentieren Sie auch die Entscheidung, wenn keine erforderlich ist.',
              nachweise: 'DSFA-Schwellwertanalyse, ggf. DSFA-Bericht'
            },
            {
              id: 'dsgvo-33',
              prio: 'mittel',
              text: 'Datenschutz durch Technikgestaltung und Voreinstellungen',
              ref: 'Art. 25 DSGVO',
              hilfe: 'Neue Systeme und Prozesse werden vor der Einführung auf Datensparsamkeit, Zugriffsbeschränkung und datenschutzfreundliche Voreinstellungen geprüft.',
              nachweise: 'Checkliste Neueinführung, Freigabeprotokolle'
            }
          ]
        }
      ]
    },
    {
      id: 'itsec',
      name: 'IT-Sicherheit',
      titel: 'IT-Sicherheitsnachweise',
      untertitel: 'Technische Maßnahmen mit belegbaren Nachweisen für Audits, Kunden und Versicherer',
      icon: '🔐',
      gruppen: [
        {
          name: 'Grundlagen & Bestandsführung',
          items: [
            {
              id: 'it-01',
              prio: 'hoch',
              text: 'Inventar aller Geräte, Server, Cloud-Dienste und Software',
              ref: 'BSI-Grundschutz ISMS / CIS 1+2',
              hilfe: 'Nur was bekannt ist, lässt sich schützen. Führen Sie eine aktuelle Liste mit Verantwortlichen, Standort, Betriebssystemstand und Schutzbedarf.',
              nachweise: 'Inventarliste (Export aus Verwaltungstool oder Tabelle)'
            },
            {
              id: 'it-02',
              prio: 'hoch',
              text: 'Patch- und Update-Management mit definierten Fristen',
              ref: 'BSI OPS.1.1.3 / CIS 7',
              hilfe: 'Kritische Sicherheitsupdates innerhalb weniger Tage einspielen, übrige regelmäßig. Auch Firmware, Router, NAS und Drittsoftware nicht vergessen.',
              nachweise: 'Patch-Statusbericht, Wartungsfenster-Plan'
            },
            {
              id: 'it-03',
              prio: 'mittel',
              text: 'Informationssicherheits-Richtlinie und Nutzungsregeln (IT-/Mobilgeräte-Policy)',
              ref: 'ISO 27001 A.5 / BSI ISMS.1',
              hilfe: 'Regeln zu privater Nutzung, mobilen Geräten, Homeoffice, USB-Medien und Cloud-Speicher, verständlich formuliert und bestätigt.',
              nachweise: 'Richtlinie, Kenntnisnahme-Listen'
            }
          ]
        },
        {
          name: 'Zugriff & Identität',
          items: [
            {
              id: 'it-10',
              prio: 'hoch',
              text: 'Mehrfaktor-Authentifizierung für Admins, E-Mail, VPN und Cloud',
              ref: 'BSI ORP.4 / CIS 6',
              hilfe: 'Aktivieren Sie MFA überall, wo es angeboten wird, zuerst für privilegierte Konten und Fernzugriffe. Bevorzugen Sie Authenticator-Apps oder Hardware-Token vor SMS.',
              nachweise: 'Screenshot Richtlinie, Benutzerliste mit MFA-Status'
            },
            {
              id: 'it-11',
              prio: 'hoch',
              text: 'Passwort-Richtlinie und Passwortmanager im Einsatz',
              ref: 'BSI ORP.4 / CIS 5',
              hilfe: 'Lange, einzigartige Passwörter bzw. Passphrasen, Verwaltung über einen Passwortmanager, keine Standardpasswörter und keine Mehrfachverwendung.',
              nachweise: 'Richtlinie, Nachweis Passwortmanager-Lizenzen'
            },
            {
              id: 'it-12',
              prio: 'hoch',
              text: 'Berechtigungskonzept nach Minimalprinzip, Admin-Konten getrennt',
              ref: 'BSI ORP.4 / ISO 27001 A.5.15',
              hilfe: 'Standardnutzer arbeiten ohne Administratorrechte. Rechte werden pro Rolle vergeben und mindestens jährlich überprüft.',
              nachweise: 'Rollen-/Rechtematrix, Protokoll der Rechteprüfung'
            },
            {
              id: 'it-13',
              prio: 'mittel',
              text: 'Ein-/Austritts-Prozess (Joiner-Mover-Leaver)',
              ref: 'BSI ORP.2',
              hilfe: 'Konten und Geräte werden bei Eintritt zügig eingerichtet und bei Austritt oder Wechsel unverzüglich angepasst bzw. gesperrt.',
              nachweise: 'Checkliste On-/Offboarding mit ausgefüllten Beispielen'
            }
          ]
        },
        {
          name: 'Schutz von Systemen & Netzen',
          items: [
            {
              id: 'it-20',
              prio: 'hoch',
              text: 'Endpoint-Schutz (Virenschutz/EDR) auf allen Geräten',
              ref: 'BSI OPS.1.1.4 / CIS 10',
              hilfe: 'Aktuelle Schutzsoftware mit zentralem Überblick über Status und Alarme; Manipulationsschutz aktiviert.',
              nachweise: 'Konsolenübersicht, Lizenzliste'
            },
            {
              id: 'it-21',
              prio: 'hoch',
              text: 'Firewall, Netzwerksegmentierung und sicherer Fernzugriff (VPN)',
              ref: 'BSI NET.1 / NET.3 / CIS 12',
              hilfe: 'Trennen Sie Gäste-, Büro-, Server- und Produktionsnetz. Keine offenen Verwaltungsports ins Internet; Fernzugriff nur über VPN mit MFA.',
              nachweise: 'Netzplan, Firewall-Regelwerk (Export), VPN-Konfiguration'
            },
            {
              id: 'it-22',
              prio: 'hoch',
              text: 'E-Mail-Absicherung (Spam-/Phishing-Filter, SPF, DKIM, DMARC)',
              ref: 'BSI APP.5.3 / CIS 9',
              hilfe: 'Schützt vor gefälschten Absendern und Phishing. Prüfen Sie die DNS-Einträge Ihrer Domain und setzen Sie DMARC mindestens auf „quarantine“.',
              nachweise: 'DNS-Auszug (SPF/DKIM/DMARC), Filterkonfiguration'
            },
            {
              id: 'it-23',
              prio: 'hoch',
              text: 'Festplattenverschlüsselung auf Notebooks und mobilen Geräten',
              ref: 'BSI SYS.2.1 / SYS.3.2',
              hilfe: 'BitLocker, FileVault oder LUKS verhindert Datenabfluss bei Verlust oder Diebstahl. Wiederherstellungsschlüssel zentral sichern.',
              nachweise: 'Compliance-Bericht aus Geräteverwaltung'
            },
            {
              id: 'it-24',
              prio: 'mittel',
              text: 'Protokollierung und Überwachung sicherheitsrelevanter Ereignisse',
              ref: 'BSI OPS.1.1.5 / CIS 8',
              hilfe: 'Zentrale Aufbewahrung von Anmelde-, Admin- und Firewall-Protokollen mit festgelegter Aufbewahrungsdauer; Auswertung bei Auffälligkeiten.',
              nachweise: 'Logging-Konzept, Beispielauswertung'
            },
            {
              id: 'it-25',
              prio: 'mittel',
              text: 'Schwachstellenscans / Penetrationstest durchgeführt',
              ref: 'BSI OPS.1.1.3 / CIS 7',
              hilfe: 'Externe Angriffsfläche und kritische interne Systeme mindestens jährlich prüfen lassen; Befunde nachverfolgen und schließen.',
              nachweise: 'Prüfbericht, Maßnahmenliste mit Status'
            },
            {
              id: 'it-26',
              prio: 'niedrig',
              text: 'Physischer Schutz von Serverraum, Netzwerkschränken und Büros',
              ref: 'BSI INF.1 / INF.2',
              hilfe: 'Zutrittsbeschränkung, Besucherregelung, Brand- und Wasserschutz sowie unterbrechungsfreie Stromversorgung für zentrale Technik.',
              nachweise: 'Fotos, Zutrittsliste, Wartungsprotokolle'
            }
          ]
        },
        {
          name: 'Notfallvorsorge & Wirksamkeit',
          items: [
            {
              id: 'it-30',
              prio: 'hoch',
              text: 'Datensicherung nach 3-2-1-Regel inkl. Offline-/unveränderlicher Kopie',
              ref: 'BSI CON.3 / CIS 11',
              hilfe: 'Drei Kopien, zwei Medienarten, eine davon getrennt vom Netz oder unveränderlich (Schutz vor Ransomware). Backups werden überwacht.',
              nachweise: 'Backup-Konzept, Erfolgsprotokolle der letzten Läufe'
            },
            {
              id: 'it-31',
              prio: 'hoch',
              text: 'Wiederherstellung (Restore) regelmäßig getestet',
              ref: 'BSI CON.3 / DER.4',
              hilfe: 'Erst ein erfolgreicher Test belegt, dass sich Systeme im geplanten Zeitrahmen wiederherstellen lassen. Dokumentieren Sie Dauer und Ergebnis.',
              nachweise: 'Restore-Testprotokoll mit Datum und Dauer'
            },
            {
              id: 'it-32',
              prio: 'hoch',
              text: 'Notfallhandbuch mit Kontaktliste und Wiederanlaufplänen',
              ref: 'BSI DER.2.1 / BSI-Standard 200-4',
              hilfe: 'Papierausdruck oder Offline-Kopie bereithalten: Ansprechpartner, Reihenfolge der Wiederherstellung, Kommunikationsvorlagen, Zugangsdaten im Notfall.',
              nachweise: 'Notfallhandbuch, Übungsprotokoll'
            },
            {
              id: 'it-33',
              prio: 'mittel',
              text: 'Sensibilisierung: Awareness-Schulung und Phishing-Simulation',
              ref: 'BSI ORP.3 / CIS 14',
              hilfe: 'Kurze, regelmäßige Trainings wirken besser als eine große Jahresschulung. Dokumentieren Sie Teilnahme und Ergebnisse.',
              nachweise: 'Teilnahmeliste, Auswertung der Simulationen'
            },
            {
              id: 'it-34',
              prio: 'mittel',
              text: 'Lieferanten- und Dienstleisterbewertung (Cloud, IT-Support)',
              ref: 'BSI OPS.2.3 / ISO 27001 A.5.19',
              hilfe: 'Prüfen Sie Zertifikate (ISO 27001, SOC 2, BSI C5) und Standort der Verarbeitung; legen Sie Meldewege für Sicherheitsvorfälle fest.',
              nachweise: 'Bewertungsbögen, Zertifikatskopien'
            },
            {
              id: 'it-35',
              prio: 'niedrig',
              text: 'Cyber-Versicherung geprüft und Obliegenheiten erfüllt',
              ref: 'Vertragsbedingungen des Versicherers',
              hilfe: 'Versicherer verlangen häufig MFA, Backups, Patchstände und Schulungen als Voraussetzung. Gleichen Sie Ihre Nachweise mit dem Fragebogen ab.',
              nachweise: 'Police, ausgefüllter Risikofragebogen'
            },
            {
              id: 'it-36',
              prio: 'niedrig',
              text: 'Reifegrad-Check nach BSI IT-Grundschutz, CIS Controls oder ISO 27001',
              ref: 'BSI-Standard 200-2 / ISO 27001',
              hilfe: 'Ein Gap-Assessment zeigt strukturiert, wo Sie stehen, und liefert einen belastbaren Fahrplan zur Zertifizierung oder zum Kundennachweis.',
              nachweise: 'Gap-Analyse, Zertifikat oder Auditbericht'
            }
          ]
        }
      ]
    }
  ];

  // Sektoren nach NIS2 Anhang I (hohe Kritikalität) und Anhang II (sonstige kritische Sektoren).
  const SEKTOREN = [
    { id: 'keiner', label: 'Keiner der genannten Sektoren', gruppe: 'keiner' },
    { id: 'energie', label: 'Energie (Strom, Gas, Öl, Wasserstoff, Fernwärme)', gruppe: 'hoch' },
    { id: 'verkehr', label: 'Verkehr (Luft, Schiene, Wasser, Straße)', gruppe: 'hoch' },
    { id: 'finanz', label: 'Bankwesen und Finanzmarktinfrastruktur', gruppe: 'hoch' },
    { id: 'gesundheit', label: 'Gesundheitswesen (z. B. Kliniken, Labore, Pharmahersteller)', gruppe: 'hoch' },
    { id: 'wasser', label: 'Trinkwasser und Abwasser', gruppe: 'hoch' },
    { id: 'digital', label: 'Digitale Infrastruktur (Rechenzentren, Cloud, DNS, TLD, CDN)', gruppe: 'hoch' },
    { id: 'ikt', label: 'IKT-Dienstverwaltung B2B (Managed Service/Security Provider)', gruppe: 'hoch' },
    { id: 'verwaltung', label: 'Öffentliche Verwaltung', gruppe: 'hoch' },
    { id: 'weltraum', label: 'Weltraum', gruppe: 'hoch' },
    { id: 'post', label: 'Post- und Kurierdienste', gruppe: 'sonstig' },
    { id: 'abfall', label: 'Abfallbewirtschaftung', gruppe: 'sonstig' },
    { id: 'chemie', label: 'Chemie (Herstellung, Produktion, Handel)', gruppe: 'sonstig' },
    { id: 'lebensmittel', label: 'Lebensmittel (Produktion, Verarbeitung, Vertrieb)', gruppe: 'sonstig' },
    { id: 'industrie', label: 'Verarbeitendes Gewerbe (Maschinenbau, Elektronik, Kfz, Medizinprodukte)', gruppe: 'sonstig' },
    { id: 'anbieter', label: 'Digitale Dienste (Marktplätze, Suchmaschinen, soziale Netzwerke)', gruppe: 'sonstig' },
    { id: 'forschung', label: 'Forschungseinrichtungen', gruppe: 'sonstig' }
  ];

  const SONDERFAELLE = [
    { id: 'keiner', label: 'Nein, keiner dieser Fälle' },
    { id: 'groessenunabhaengig', label: 'Ja: DNS-Dienste, TLD-Registry, Vertrauensdienste oder öffentliche Telekommunikation (größenunabhängig)' },
    { id: 'kritis', label: 'Ja: Betreiber einer Kritischen Anlage (KRITIS)' }
  ];

  window.CATALOG = { STATUS, FRAMEWORKS, SEKTOREN, SONDERFAELLE };
})();
