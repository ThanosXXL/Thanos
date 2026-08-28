# Buchhaltung!

Desktop- und Web-App (Electron + PWA) zur monatlichen Buchhaltung für bis zu **vier Administratoren**.

Jeder Administrator führt eine eigene Buchhaltung mit zwölf Monaten (Januar–Dezember), unterteilt in:

- **Einnahmen** (Datum, Beschreibung, Kategorie, Zahlungsart, Beleg-Nr., Betrag)
- **Ausgaben** (gleiche Felder)

Jeder Monat kann als **„abgeschlossen“** markiert werden. Ab dem **28. jeden Monats** erscheint täglich
**zwischen 9:00 und 19:00 Uhr** eine Erinnerung, solange ein Monat nicht abgeschlossen wurde.

Alle Daten werden lokal gespeichert (Desktop: Benutzerdatenverzeichnis der App / Web: Browser-Speicher) und
bleiben nach dem Neustart erhalten.

Ein ausführliches **Handbuch mit Beispielbildern** für Administratoren liegt unter [`HANDBUCH.md`](HANDBUCH.md)
(bzw. fertig als PDF unter [`handbuch/HANDBUCH.pdf`](handbuch/HANDBUCH.pdf)). Ein kurzes **Video-Demo** der
App liegt unter [`handbuch/video/buchhaltung-demo.mp4`](handbuch/video/buchhaltung-demo.mp4).

## Plattformen

| Plattform | Wie |
|---|---|
| Windows | Installer (`.exe`) über [Releases](../../releases) |
| macOS | `.dmg` über [Releases](../../releases) |
| Linux | `.AppImage` über [Releases](../../releases) |
| Android / iOS | Web-App (PWA) im Browser öffnen und „Zum Startbildschirm hinzufügen“ |

Beim Öffnen der Web-App zeigt ein Banner automatisch den passenden Download-Button für das erkannte
Betriebssystem an (ein Klick lädt direkt den richtigen Installer herunter). Unter [`renderer/download.html`](renderer/download.html)
(bzw. `download.html` neben der Web-App) gibt es zusätzlich eine Übersichtsseite mit einem Ein-Klick-Button
für **alle fünf Plattformen gleichzeitig** – praktisch, um einen einzigen Link an das ganze Team zu senden.

## Fertigen Installer herunterladen (ohne Terminal)

Unter **[Releases](../../releases)** stehen fertig gebaute Installationsdateien zum Anklicken bereit:

- Windows: `Buchhaltung-Windows-Setup.exe`
- macOS: `Buchhaltung-macOS.dmg`
- Linux: `Buchhaltung-Linux.AppImage`

Neue Installer werden automatisch von GitHub Actions gebaut, sobald ein neuer Versions-Tag
(z. B. `v1.0.0`) gepusht wird, oder manuell über den Button **"Run workflow"** im Tab
**Actions → Build & Release Desktop App**.

## Web-App / PWA (Android, iOS, Browser)

Die Web-Version liegt im Ordner [`docs/`](docs) (automatisch aus `renderer/` synchronisiert) und wird über
GitHub Pages ausgeliefert, sobald **Settings → Pages → Source: GitHub Actions** einmalig im Repository
aktiviert wird. Der Workflow `.github/workflows/deploy-pages.yml` veröffentlicht die App danach automatisch
bei jeder Änderung an `renderer/`.

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

## Web-Version aktualisieren

```bash
npm run build:web
```

Synchronisiert `renderer/` nach `docs/` für GitHub Pages.
