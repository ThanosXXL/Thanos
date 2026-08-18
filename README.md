# Dozenten Dashboard

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

---

Dieses Repository beherbergt außerdem weitere, eigenständige Projekte in eigenen Unterordnern,
die das Dozenten Dashboard oben nicht berühren:

- `omniroute/` — ein vendorter Snapshot von [OmniRoute](https://github.com/diegosouzapw/OmniRoute).
  Siehe `omniroute/CLAUDE.md` und `omniroute/VENDORED.md`.
- `pferde-app/` — die **Pferde App**: eine einzelne HTML-Datei (`pferde-app/PferdeApp.html`) zur
  Pferdeverwaltung mit Chip-Registrierung, Foto-ID-Datenbank und simulierter Stall-Alarmfunktion.
  Einfach per Doppelklick im Browser öffnen (Windows/macOS/Linux/Android/iOS), kein Terminal
  nötig. Siehe `pferde-app/CLAUDE.md`.
