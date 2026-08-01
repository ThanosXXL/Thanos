# Dozenten Dashboard

Desktop-Dashboard (Electron) zur Verwaltung von bis zu vier Dozenten. Jeder Dozent hat drei Listen:

1. **Liste 1 – To-Do-Liste** (Aufgabenliste)
2. **Liste 2 – Offene Projekte**
3. **Liste 3 – Erledigte Projekte**

Projekte lassen sich per Klick von "Offene Projekte" nach "Erledigte Projekte" verschieben (und zurück).
Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem Neustart erhalten.

## Inventar - Dashboard

Über den Umschalter oben rechts im Header lässt sich in den **Inventar - Dashboard**-Modus wechseln
(eigener Gold/Braun-Look im glänzenden 3D-Stil). Er verwaltet eine Geräteliste mit den Spalten
**Gerät, Hersteller, Zustand (OVP/Gebraucht) und Stückzahl**:

- Eingabe per Tastatur oder per Mikrofon-Diktat (🎤) für Gerät und Hersteller
- Fotoerkennung per Kamera: Ein Foto wird analysiert und ein Erkennungsvorschlag angezeigt
  ("Erkannt: ... – ist das richtig?"); nach Bestätigung springt der Fokus direkt zur Stückzahl-Eingabe.
  Die Fotoerkennung benötigt eine Internetverbindung (Modell wird bei Bedarf nachgeladen).
- Beim **Ausgeben** eines Geräts an Kollegen/Kunden wird die Stückzahl reduziert und protokolliert;
  fällt der Bestand auf oder unter den Schwellenwert, erscheint eine Erinnerung zur Nachbestellung.

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

## Download-Center, Demo & Handbuch (`docs/`)

- **`docs/download.html`** – gestylte Download-Seite (Gold/Braun-3D) mit direktem Installer-Download
  pro Betriebssystem sowie dem vollautomatischen PowerShell-Download für Windows (siehe unten).
- **`docs/demo.html`** – interaktive Demo im Browser mit Beispieldaten, ohne Installation nutzbar
  (Speicherung nur lokal im Browser via `localStorage`, keine echten Daten).
- **`docs/handbuch.html`** – Benutzerhandbuch mit Screenshots für beide Modi.
- **`scripts/Install-DozentenDashboard.ps1`** – PowerShell-Skript, das die neueste Version automatisch
  auf den Desktop lädt und installiert (`powershell -ExecutionPolicy Bypass -File .\Install-DozentenDashboard.ps1`).
  Die Kommentare im Skript dienen zugleich als technische Kurzanleitung für IT/Admins.

## Demo-Modus (mit Beispieldaten)

```bash
npm run start:demo
```

Startet die App mit vorbefüllten Beispiel-Dozenten und -Geräten in einer eigenen Datendatei
(`dozenten-data-demo.json`), damit echte Nutzerdaten nie überschrieben werden. Im Fenster erscheint
ein „DEMO-VERSION"-Hinweisbanner.

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
