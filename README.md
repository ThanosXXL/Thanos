# Inventar - Dashboard

Desktop-Dashboard (Electron) zur Geräteinventar-Verwaltung, im glänzenden Gold/Braun-3D-Stil. Es
verwaltet eine Geräteliste mit den Spalten **Gerät, Hersteller, Zustand (OVP/Gebraucht) und Stückzahl**:

- Eingabe per Tastatur oder per Mikrofon-Diktat (🎤) für Gerät und Hersteller
- Fotoerkennung per Kamera: Ein Foto wird analysiert und ein Erkennungsvorschlag angezeigt
  ("Erkannt: ... – ist das richtig?"); nach Bestätigung springt der Fokus direkt zur Stückzahl-Eingabe.
  Die Fotoerkennung benötigt eine Internetverbindung (Modell wird bei Bedarf nachgeladen).
- Beim **Ausgeben** eines Geräts an Kollegen/Kunden wird die Stückzahl reduziert und protokolliert;
  fällt der Bestand auf oder unter den Schwellenwert, erscheint eine Erinnerung zur Nachbestellung.
- Ein PIN-geschützter **Admin-Modus** schaltet eine Nachbestellungen-Verwaltung sowie alle
  Download-Versionen frei.

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

## Download-Center, Demo & Handbücher (`docs/`)

- **`docs/download.html`** – gestylte Download-Seite (Gold/Braun-3D) und zentrale Anlaufstelle für
  **alles**: die 1-Klick-Downloader-App als Hauptweg, Direkt-Downloads pro Betriebssystem, das
  PowerShell-Skript für IT/Admins, das Demo-Video, die Inventar-Demo und alle vier Handbücher
  (Ansehen + PDF-Download). Jedes neue Deliverable kommt sofort hierhin, nicht erst nachträglich.
- **`docs/demo-inventar.html`** – interaktive Demo *nur* des Inventar - Dashboards im Browser mit
  Beispieldaten, ohne Installation nutzbar (Speicherung nur lokal via `localStorage`, keine echten
  Daten); `docs/demo-inventar-standalone.html` ist eine eigenständige, offline nutzbare Version davon.
- **`docs/demo-video.webm`** – echter Video-Walkthrough des Inventar - Dashboards (kein Mockup).
- Vier Handbücher, alle mit Screenshots und zusätzlich als PDF (`docs/*.pdf`, per
  `npm run build:handbook-pdfs` neu erzeugen, wenn sich eine Handbuch-HTML-Datei ändert):
  - **`docs/handbuch.html`** – allgemeines Benutzerhandbuch
  - **`docs/handbuch-inventar.html`** – vertieftes Inventar-Handbuch
  - **`docs/skript-handbuch.html`** – PowerShell-Skript &amp; Downloader-App (technisch)
  - **`docs/admin-handbuch.html`** – Nutzung/Umgang mit dem Admin-Modus für alle vier Admins
- **`downloader/`** – eigenständige, winzige Electron-App (portable .exe unter Windows): ein Button
  lädt die neueste Version automatisch auf den Desktop und startet sie.
- **`scripts/Install-DozentenDashboard.ps1`** – PowerShell-Skript, das die neueste Version automatisch
  auf den Desktop lädt und installiert (`powershell -ExecutionPolicy Bypass -File .\Install-DozentenDashboard.ps1`).
  Die Kommentare im Skript dienen zugleich als technische Kurzanleitung für IT/Admins.

## Demo-Modus (mit Beispieldaten)

```bash
npm run start:demo
```

Startet die App mit vorbefüllten Beispiel-Geräten in einer eigenen Datendatei
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
