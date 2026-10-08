# Allgemein Docs – Voraussetzungen für den Verkauf an Ärztinnen und Ärzte

Stand: 08.10.2026 · Dies ist eine Orientierung, **keine Rechtsberatung**. Einzelne Angaben stammen aus Sekundärquellen und müssen vor Entscheidungen bei KBV, gematik, Datenschutz-Aufsicht und einer Fachanwaltskanzlei geprüft werden (Quellen am Ende).

## Kurzfazit

Allgemein Docs ist heute ein **Demo-/Prototyp-Stand**: Oberfläche, Abläufe und Beispieldokumente stehen, Karte, E-Rezept und eAU sind **simuliert**. An Vertragsarztpraxen, die gesetzlich Versicherte abrechnen, darf die Software erst verkauft werden, wenn sie die unten genannten Zertifizierungen und Anbindungen besitzt. Für Privat-/Selbstzahlerpraxen und als Zusatzmodul zu einem zertifizierten System ist der Weg deutlich kürzer (siehe „Schnellere Wege“).

## 1. Zertifizierung und Zulassung (Pflicht für GKV-Praxen)

| Voraussetzung | Worum es geht | Stand der App |
|---|---|---|
| **KBV-Zertifizierung** der Praxissoftware (Anwendungsbereiche z. B. Abrechnung/KVDT, eArztbrief, Arzneimittelverordnung, Formulare) | Ärztinnen und Ärzte dürfen laut Sekundärquellen nur über ein dafür zertifiziertes PVS abrechnen; die Zulassung ist zeitlich befristet und muss erneuert werden | offen |
| **Rahmenvereinbarung § 332b SGB V** (KBV/GKV-Spitzenverband) | Freiwillige, aber marktüblich erwartete Herstellerverpflichtungen: Vertragsinhalte, Kundenrechte, Teilnahme an gematik-Kommunikationsplattform für Primärsystemhersteller | offen |
| **gematik-Konformitätsbewertung (KOB)** / Zulassung als Primärsystem | Technische Nachweise für E-Rezept, eAU, ePA, KIM, Medikationsplan u. a.; dazu ein TI-Score/Transparenz gegenüber der gematik | offen |
| **Telematikinfrastruktur-Anbindung** | Echte Karte lesen (VSDM) über Kartenterminal + Konnektor/TI-Gateway, Signatur mit eHBA, Praxisausweis (SMC-B), KIM-Postfach | nur simuliert |

## 2. Funktionen, die Praxen zwingend erwarten

- **Echte Formulare und Verfahren** statt Beispielvorlagen: eAU (digital an die Kasse), E-Rezept (QES-signiert, Fachdienst), Überweisung/Muster 6, Labor-Anforderung, Impf- und Mutterpass-Einträge
- **Abrechnung**: EBM/GOÄ-Kataloge, KVDT-Abrechnungsdatei, Plausibilitätsprüfung, Quartalsupdates (aktuell nur Beispielbeträge)
- **Arzneimitteldatenbank** mit Interaktions- und Allergieprüfung (Lizenz z. B. von einem Datenanbieter nötig)
- **Schnittstellen**: BDT/GDT/xDT, LDT für Labor, Import aus Fremdsystemen, Medikationsplan (BMP), Export für Wechsel
- **Mehrplatz-/Mehrbenutzerbetrieb** mit Rollen und Rechten (aktuell: Einzelplatz ohne Anmeldung)
- **Datenübernahme/Migration** aus dem bisherigen System und Schulung beim Umstieg

## 3. Datenschutz und IT-Sicherheit

- **DSGVO**: Gesundheitsdaten sind besondere Kategorien (Art. 9); Datenschutz durch Technikgestaltung (Art. 25); technische und organisatorische Maßnahmen (Art. 32); **Auftragsverarbeitungsvertrag** mit jeder Praxis (Art. 28); ggf. Datenschutz-Folgenabschätzung
- **Schweigepflicht** (§ 203 StGB): Dienstleister und Support müssen vertraglich darauf verpflichtet werden
- **IT-Sicherheitsrichtlinie nach § 75b SGB V** (KBV): Anforderungen an Praxen und deren Software
- **Technisch heute offen**: Daten liegen **unverschlüsselt** als JSON; es gibt **keine Anmeldung, keine Rollen, kein Audit-Log, keine verschlüsselte Datensicherung, kein Löschkonzept**
- Empfohlen: ISO 27001 oder BSI-Grundschutz, Pen-Test, Signierung der Installer (Windows Authenticode, Apple Notarisierung), Update-Kanal mit Signaturprüfung

## 4. Regulatorisches (MDR)

Reine Verwaltungs- und Abrechnungssoftware ist laut gängiger Auslegung kein Medizinprodukt. **Entscheidungsunterstützende Funktionen** (z. B. Laborampel, Interaktionswarnungen, Vorschläge) können dagegen unter die MDR (EU) 2017/745 fallen. Die **Zweckbestimmung** muss deshalb sauber formuliert und mit einer Regulatory-Beratung/Benannten Stelle abgegrenzt werden. Die Laborbewertung in Allgemein Docs nutzt allgemeine Beispiel-Referenzwerte und ersetzt nicht die Laborreferenz.

## 5. Betrieb, Vertrieb, Recht

- **Support und Wartung** (Hotline, Fehlerbehebung, Updates bei Gesetzesänderungen, Quartals-Kataloge) mit definierten Reaktionszeiten
- **Vertragswerk**: Lizenz-/SaaS-Vertrag, AGB, AVV, Haftungsregelung; **Berufs-/IT-Haftpflicht** des Herstellers
- **Name und Marke**: Markenrecherche (DPMA/EUIPO) für „Allgemein Docs“; keine fremden Marken oder Logos (z. B. von etablierten PVS) verwenden
- **Dokumentation**: Handbuch, Release-Notes, Testprotokolle, Risikoanalyse
- **Installation**: signierte Installer, Update-Mechanismus, Support für Praxis-IT und Terminals

## 6. Schnellere Wege zum Markt

1. **Privatpraxen/Selbstzahler/IGeL**: keine KBV-Abrechnung nötig – dennoch Datenschutz, Sicherheit und Support erforderlich
2. **Add-on statt Komplettsystem**: Zusatzmodul (Labor-Trends, Recall, Patientenportal) zu einem **bereits zertifizierten PVS** über Schnittstellen (GDT/FHIR) oder Partnerschaft/White-Label mit einem zugelassenen Hersteller
3. **Patienten Welt** als eigenständige Verbraucher-App (ohne Praxisanbindung) – eigener, deutlich kleinerer Rechts-Rahmen (Datenschutz, ggf. Medizinprodukt je nach Funktion)

## 7. Vorgeschlagene Meilensteine

1. Zielgruppe festlegen (Privatpraxis-Start oder GKV-Vollsystem) und Rechtsberatung einholen
2. Sicherheits-Basis: Anmeldung, Rollen, Verschlüsselung, Audit-Log, Backup/Restore
3. Verträge/AVV, Datenschutz-Dokumentation, Marken-Check
4. Pilotpraxen (Privat/Selbstzahler) mit Support-Prozess
5. Für GKV: KBV-/gematik-Verfahren, TI-Anbindung, KVDT, Arzneimitteldatenbank – **mehrjähriges Vorhaben mit erheblichem Budget** (grobe Einschätzung, keine belegte Zahl)

## Quellen (Sekundärquellen, bitte verifizieren)

- [Zertifizierung Praxissoftware: KBV & gematik-Pflicht (medizinio)](https://medizinio.de/blog/zertifizierung-praxissoftware)
- [KVB-Rundschreiben vom 19.08.2025 zum PVS-Verfahren](https://www.kvb.de/fileadmin/kvb/Mitglieder/Service/Serviceschreiben/2025-DS/KVB-RS-250819-KOB-Verfahren-PVS-Voraussetzung.pdf)
- [KBV-Rahmenvereinbarung § 332b SGB V (PDF)](https://www.kbv.de/documents/infothek/rechtsquellen/weitere-vertraege/pvs/rahmenvereinbarung_332b.pdf)
- [KV Baden-Württemberg: E-Rezept](https://www.kvbawue.de/praxis/unternehmen-praxis/it-online-dienste/telematikinfrastruktur-ti-e-health/erezept)
- [TI-Score: gematik fordert Pflicht-Check für Praxissoftware](https://pflege-helfer24.de/nachrichten/ti-score-gematik-fordert-pflicht-check-fur-praxissoftware)
- Primärquellen: kbv.de (Zertifizierung/KVDT), gematik.de (Konformitätsbewertung), MDR (EU) 2017/745, DSGVO Art. 9/25/28/32, § 75b SGB V
