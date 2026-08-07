# Zeiterfassung

Desktop-Zeiterfassung (Electron) für bis zu vier Administratoren, die jeweils mit einem eigenen
4-stelligen PIN einloggen und Mitarbeiter anlegen und verwalten.

- **Kiosk-Ansicht** (Startbildschirm): Jeder Mitarbeiter trägt per Klick auf "Kommt" / "Geht"
  seine Start- bzw. Feierabendzeit ein — kein Login nötig.
- **Admin-Login**: PIN-geschützter Zugang für bis zu vier Administratoren, die Mitarbeiter
  anlegen/bearbeiten/löschen, Zeiteinträge korrigieren und weitere Administratoren verwalten
  können.
- **Erinnerungen**: Ab einer je Mitarbeiter einstellbaren Uhrzeit (Standard 06:30 Uhr) erinnert
  die App per Desktop-Benachrichtigung einzeln an jeden Mitarbeiter, der seine Kommen-Zeit noch
  nicht eingetragen hat — ebenso für die Feierabend-Zeit. Die Erinnerung wiederholt sich, bis der
  jeweilige Eintrag erfasst wurde.

Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem
Neustart erhalten.

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
