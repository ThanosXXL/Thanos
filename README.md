# Dozenten Dashboard

Desktop-Dashboard (Electron) zur Verwaltung von bis zu vier Dozenten. Jeder Dozent hat drei Listen:

1. **Liste 1 – To-Do-Liste** (Aufgabenliste)
2. **Liste 2 – Offene Projekte**
3. **Liste 3 – Erledigte Projekte**

Projekte lassen sich per Klick von "Offene Projekte" nach "Erledigte Projekte" verschieben (und zurück).
Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem Neustart erhalten.

## Baustelle — Tagesreport

Über den Link "Baustelle Tagesreport" im Header gelangt man zu einer zweiten Ansicht innerhalb derselben App:

- **Tagesreport**: Tageseinträge (Bautagebuch, Wetter, Besonderheiten) mit Wochen-/Monatskalender
- **Status**: Bauabschnitt sowie Wochen-/Monatsziel per Regler
- **Bestellstatus**: Materialbestellungen mit Status "Ausstehend"/"Geliefert"
- **Screenshots**: Fotos/Screenshots pro Baustelle (client-seitig verkleinert und lokal gespeichert)

Ein Reminder-Hinweis in der Kopfzeile macht ab 12:00 Uhr darauf aufmerksam, solange der Tagesreport des Tages
noch nicht ausgefüllt ist. Alle Daten werden ebenfalls lokal im Benutzerdatenverzeichnis der App gespeichert
(separat von den Dozenten-Daten).

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
