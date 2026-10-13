# Rechtliche Vorlagen (Szenario A: Heilpraktiker/Privatpraxen/Therapeuten)

**Kein Ersatz für Rechtsberatung.** Alle Dokumente in diesem Ordner sind Entwürfe/Vorlagen,
erstellt ohne anwaltliche Prüfung. Vor dem Einsatz mit echten, zahlenden Kunden müssen sie von
einem Fachanwalt für IT-/Datenschutzrecht bzw. einer/einem Datenschutzbeauftragten geprüft und an
die konkrete Rechtsform, das tatsächliche Geschäftsmodell und den tatsächlichen Datenfluss
angepasst werden — insbesondere weil es um Gesundheitsdaten (besondere Kategorien personenbezogener
Daten, Art. 9 DSGVO) geht.

## Warum Szenario A (nicht Szenario B)

Diese Vorlagen setzen voraus, dass PatientenWelt an **Heilpraktiker, reine Privatpraxen (ohne
GKV-Zulassung) und Therapeuten** (Physiotherapie, Osteopathie, Ergotherapie u. ä.) verkauft wird.
Diese Berufsgruppen unterliegen **nicht** der KV-Zulassungs-/TI-Anbindungspflicht — die in
`patientenwelt/README.md` („Grenzen") beschriebene Zertifizierungslücke (KBV-Zulassung,
eHealth-Konnektor, eRezept/eAU/ePA, KVDT-Export) betrifft nur GKV-Vertragsärzte und ist für dieses
Szenario **nicht** erforderlich.

## Warum die AVV-Frage hier ungewöhnlich ist

`AVV-Vorlage.md` geht bewusst auf einen Sonderfall ein: PatientenWelt läuft aktuell **rein lokal**
(kein Cloud-Hosting, kein Fernzugriff des Herstellers auf die verschlüsselten Patientendaten). Im
strengen Sinne von Art. 28 DSGVO liegt „Auftragsverarbeitung" nur vor, wenn der Anbieter tatsächlich
Daten *im Auftrag* des Verantwortlichen verarbeitet — bei einer reinen Vor-Ort-Software ohne
Datenzugriff des Herstellers ist das fraglich (dann wäre der Hersteller nur Werkzeuglieferant, kein
Auftragsverarbeiter). Die Vorlage ist trotzdem vorsorglich für den Fall gedacht, dass später Support
mit Fernzugriff, Cloud-Backup oder ähnliches angeboten wird — das sollte bei der anwaltlichen Prüfung
konkret eingeordnet werden.

## Bezug zu den technischen Maßnahmen

Die AVV-Vorlage referenziert konkret die in `patientenwelt/README.md` (Abschnitt „Datensicherheit")
beschriebenen technischen und organisatorischen Maßnahmen (TOMs): AES-256-GCM-Verschlüsselung,
PBKDF2-Passwort-Ableitung, Rollenmodell (Admin/Mitarbeiter), Sperrfunktion, Audit-Protokoll,
automatische Backups. Bei Änderungen an diesen Mechanismen in `main.js`/`renderer.js` auch die
Anlage 1 der AVV-Vorlage aktualisieren, damit sie nicht veraltet.

## Dateien

- **`AVV-Vorlage.md`** — Auftragsverarbeitungsvertrag-Vorlage nach Art. 28 DSGVO, inkl. Anlage
  „Technische und organisatorische Maßnahmen"
- **`Haftungsausschluss.md`** — Haftungsbeschränkung/Disclaimer für den Softwareeinsatz (kein
  Medizinprodukt, keine KBV-Zulassung, EBM/GOÄ-Ziffernvorschläge unverbindlich, Haftungsgrenzen)
- **`Impressum-Vorlage.md`** — Pflichtangaben nach § 5 TMG (inkl. Heilberufe-Zusatzangaben nach
  § 5 Abs. 1 Nr. 6 TMG, EU-Streitschlichtung, Haftung für Inhalte/Links); dieselben Platzhalterfelder
  erscheinen auch im Sidebar-Menüpunkt „Impressum" der App und im Footer von
  `patientenwelt/download.html` — bei Ausfüllen bitte alle drei Stellen konsistent halten
- **`patientenwelt/LICENSE.md`** (eine Ebene höher) — proprietäre Lizenz/Copyright-Vermerk für
  PatientenWelt selbst (kein Open-Source-Lizenztext, Vervielfältigung/Weitergabe untersagt)
