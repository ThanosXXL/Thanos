[![Dozenten Dashboard](https://img.shields.io/badge/📋_Dozenten_Dashboard-0b1f4d?style=for-the-badge)](README.md)
[![IT-Schulung Dashboard](https://img.shields.io/badge/💻_IT--Schulung_Dashboard-5b9bd5?style=for-the-badge)](it-schulung/README.md)

# Dozenten Dashboard

Dieses Repository enthält zwei eigenständige Desktop-Apps, jede mit eigenem Code:

- **Dozenten Dashboard** (dieses Verzeichnis) – Verwaltung von Dozenten, Aufgaben und Projekten
- **[IT-Schulung Dashboard](it-schulung/README.md)** (`it-schulung/`) – Verwaltung von IT-Schulungen, Aufgaben und Themen

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
