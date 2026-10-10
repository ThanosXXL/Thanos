[![Dozenten Dashboard](https://img.shields.io/badge/📋_Dozenten_Dashboard-0b1f4d?style=for-the-badge)](README.md)
[![IT-Schulung Dashboard](https://img.shields.io/badge/💻_IT--Schulung_Dashboard-5b9bd5?style=for-the-badge)](it-schulung/README.md)
[![VideoWelt](https://img.shields.io/badge/🎬_VideoWelt-f4c430?style=for-the-badge&labelColor=000000)](videowelt/README.md)

# Dozenten Dashboard

Dieses Repository enthält mehrere eigenständige Desktop-Apps, jede mit eigenem Code:

- **Dozenten Dashboard** (dieses Verzeichnis) – Verwaltung von Dozenten, Aufgaben und Projekten
- **[IT-Schulung Dashboard](it-schulung/README.md)** (`it-schulung/`) – Verwaltung von IT-Schulungen, Aufgaben und Themen
- **[VideoWelt](videowelt/README.md)** (`videowelt/`) – Videobearbeitungs-Software (Schneiden, Effekte, Export)

Desktop-Dashboard (Electron) zur Verwaltung von bis zu vier Dozenten. Jeder Dozent hat drei Listen:

1. **Liste 1 – To-Do-Liste** (Aufgabenliste)
2. **Liste 2 – Offene Projekte**
3. **Liste 3 – Erledigte Projekte**

Projekte lassen sich per Klick von "Offene Projekte" nach "Erledigte Projekte" verschieben (und zurück).
Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem Neustart erhalten.

## Fertigen Installer herunterladen (ohne Terminal)

Unter **[Releases](../../releases)** stehen fertig gebaute Installationsdateien zum Anklicken bereit:

- Windows: `.exe` (Installer)
- macOS: `.dmg`
- Linux: `.AppImage`

Einfach die passende Datei für dein Betriebssystem herunterladen und ausführen – kein `npm install`,
kein Terminal nötig.

Neue Installer werden automatisch von GitHub Actions gebaut, sobald ein neuer Versions-Tag
(z. B. `v1.0.0`) gepusht wird, oder manuell über den Button **"Run workflow"** im Tab
**Actions → Build & Release Desktop App**.

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

- **Rein lokale Verarbeitung:** Alle Daten (Dozenten, Aufgaben, Projekte, Chat-Notizen) werden
  ausschließlich lokal in einer Datei im Benutzerdatenverzeichnis des jeweiligen Rechners
  gespeichert (`dozenten-data.json`). Es gibt keine Cloud-Synchronisierung, keinen Server und
  keine Telemetrie – die App sendet zu keinem Zeitpunkt Daten ins Internet.
- **Datenportabilität (Art. 20 DSGVO):** Über den Button **„Daten exportieren"** im Kopfbereich
  lässt sich der gesamte Datenbestand jederzeit als JSON-Datei an einem frei wählbaren Ort
  speichern.
- **Recht auf Löschung (Art. 17 DSGVO):** Über **„Alle Daten löschen"** (mit Bestätigungsdialog)
  lassen sich alle gespeicherten Dozenten, Listen und Chat-Nachrichten unwiderruflich entfernen.
  Einzelne Dozenten lassen sich zusätzlich gezielt über das „×" am jeweiligen Tab löschen.
- **Eigenverantwortung bei gemeinsam genutzten Rechnern:** Die Datendatei liegt unverschlüsselt
  auf der Festplatte. Auf gemeinsam genutzten oder nicht vollplattenverschlüsselten Geräten sollte
  entsprechend sensibel mit den gespeicherten Namen/Notizen umgegangen werden (z. B. durch
  Festplattenverschlüsselung des Betriebssystems).
- **Vollständige Deinstallation:** Beim Deinstallieren der App bleibt die Datendatei im
  Benutzerdatenverzeichnis erhalten (betriebssystemüblich); sie kann danach manuell gelöscht
  werden, oder zuvor über „Alle Daten löschen" geleert werden.
