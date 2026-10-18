# IT-WORLD Compliance-Assistent

Desktop-App (Electron) für kleine und mittlere Unternehmen: **NIS2**, **DSGVO** und **IT-Sicherheitsnachweise** an einem Ort. Gestaltet im Schwarz/Gold-Look des IT-WORLD-Logos mit 3D-Hochglanz-Effekten.

## Funktionen

- **Übersicht** – Gesamt-Erfüllungsgrad, Fortschritt je Regelwerk, Fälligkeiten und offene Meldefristen.
- **NIS2** – Betroffenheits-Check (Sektor, Mitarbeiter, Umsatz, Bilanzsumme → „besonders wichtig“ / „wichtig“ / nicht betroffen) und 16 Anforderungen zu Governance, Risikomanagement (Art. 21) und Meldepflichten.
- **DSGVO** – 14 Anforderungen: VVT, Rechtsgrundlagen, Betroffenenrechte, AV-Verträge, Drittländer, TOM, Datenpannen, DSFA.
- **IT-Sicherheit** – 21 Maßnahmen mit Nachweisen: Inventar, Patching, MFA, Backup/Restore, Verschlüsselung, Notfallhandbuch, Awareness u. a.
- **Je Anforderung**: Status, Verantwortliche/r, Fälligkeit, Nachweisbeschreibung, verknüpfte Nachweis-Datei (nur Pfad), Notizen.
- **Vorfälle & Fristen** – erfasst Sicherheitsvorfälle und Datenpannen und berechnet automatisch die Fristen (NIS2: 24 h / 72 h / 1 Monat, DSGVO: 72 h) als Live-Countdown.
- **Bericht & Export** – Compliance-Bericht mit Logo als PDF oder HTML; Datensicherung als JSON (Export/Import).

## Starten

```bash
npm install
npm start        # Entwicklung
npm run dist     # Installer (Windows nsis, macOS dmg, Linux AppImage) nach dist/
```

Release-Builds laufen über `.github/workflows/it-world-compliance-release.yml` (Tag-Präfix `it-world-compliance-v*`).

## Datenschutz

Die App arbeitet komplett offline: keine Netzwerkanfragen, keine Telemetrie, kein Auto-Updater, keine Konten. Daten liegen in `it-world-compliance-data.json` im Benutzerdatenordner (Rechte 0600, atomares Schreiben, Größenlimit, Strukturprüfung). Nachweisdateien werden nur verknüpft, nie kopiert. Über „Unternehmen → Alle Daten löschen“ lässt sich alles entfernen.

## Hinweis

Der Katalog und die Betroffenheits-Einstufung sind eine Orientierungshilfe nach bestem Stand (NIS2-Umsetzungsgesetz/BSIG, DSGVO/BDSG, BSI-Grundschutz, CIS Controls) und ersetzen keine Rechtsberatung oder Zertifizierung. Gesetzliche Fristen und Paragrafen bitte vor verbindlicher Nutzung rechtlich prüfen lassen.

Schrift: Open Sans (SIL Open Font License, siehe `renderer/fonts/OFL-LICENSE-OpenSans.txt`).
