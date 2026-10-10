[![Dozenten Dashboard](https://img.shields.io/badge/📋_Dozenten_Dashboard-0b1f4d?style=for-the-badge)](../README.md)
[![IT-Schulung Dashboard](https://img.shields.io/badge/💻_IT--Schulung_Dashboard-5b9bd5?style=for-the-badge)](README.md)
[![VideoWelt](https://img.shields.io/badge/🎬_VideoWelt-f4c430?style=for-the-badge&labelColor=000000)](../videowelt/README.md)

# IT-Schulung Dashboard

Desktop-Dashboard (Electron) zur Verwaltung von bis zu vier IT-Schulungen. Jede Schulung hat drei Listen:

1. **Liste 1 – To-Do-Liste** (Aufgabenliste)
2. **Liste 2 – Offene Themen**
3. **Liste 3 – Abgeschlossene Themen**

Themen lassen sich per Klick von "Offene Themen" nach "Abgeschlossene Themen" verschieben (und zurück).
Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem Neustart erhalten.

Dies ist eine eigenständige App, komplett getrennt vom **[Dozenten Dashboard](../README.md)** im Wurzelverzeichnis dieses
Repositories (eigener Code, eigenes `package.json`, eigene Datendatei). Beide Apps teilen sich keine
Abhängigkeiten oder Build-Konfiguration.

## Installation (für Entwicklung)

```bash
npm install
```

## Starten (Entwicklung)

```bash
npm start
```

## Desktop-Anwendung bauen

```bash
npm run dist
```

Erzeugt eine installierbare Desktop-Anwendung (Windows/macOS/Linux) im Ordner `dist/`.

## Datenschutz (DSGVO)

- **Rein lokale Verarbeitung:** Alle Daten (Schulungen, Teilnehmer, Aufgaben, Themen,
  Chat-Notizen) werden ausschließlich lokal in `it-schulung-data.json` im
  Benutzerdatenverzeichnis gespeichert. Keine Cloud-Synchronisierung, kein Server, keine
  Telemetrie.
- **Datenportabilität (Art. 20 DSGVO):** Button **„Daten exportieren"** im Kopfbereich speichert
  den gesamten Datenbestand als JSON-Datei an einem frei wählbaren Ort.
- **Recht auf Löschung (Art. 17 DSGVO):** Button **„Alle Daten löschen"** (mit
  Bestätigungsdialog) entfernt alle Schulungen, Teilnehmer, Listen und Chat-Nachrichten
  unwiderruflich. Einzelne Schulungen lassen sich zusätzlich gezielt über das „×" am jeweiligen
  Tab löschen.
- **Externe Links:** Der „Link – täglicher Live-Termin" öffnet ausschließlich `http(s)`-URLs im
  System-Standardbrowser; andere Protokolle werden abgelehnt.
- **Eigenverantwortung bei gemeinsam genutzten Rechnern:** Die Datendatei liegt unverschlüsselt
  auf der Festplatte (inkl. Teilnehmernamen und Admin-Angabe) – auf gemeinsam genutzten Geräten
  empfiehlt sich eine Festplattenverschlüsselung des Betriebssystems.

## Copyright

Copyright © 2026. Alle Rechte vorbehalten. Vervielfältigung, Kopie und Weiterverbreitung
dieser Software sind ohne vorherige schriftliche Genehmigung untersagt – siehe
[`LICENSE`](LICENSE).
