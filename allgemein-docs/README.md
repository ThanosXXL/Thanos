# Allgemein Docs

Logo: Glaskugel mit weißem 3D-Kreuz und EKG-Linie (`renderer/img/logo.svg`). Das frühere Dokument-Logo liegt als `logo-alt.svg` bereit.

Moderne, einfache Praxisverwaltung für die Allgemeinmedizin – Desktop-App (Windows, macOS, Linux).
Navy-blaues Design, weiße Schrift in der humanistischen Schrift *Open Sans*, großes Seitenmenü, Beispielbilder und Animationen.

## Funktionen

- **Start** – Tagesüberblick mit animierten Kennzahlen, Terminen von heute, Schnellzugriff
- **Patienten** – Akte mit Stammdaten, Diagnosen (ICD-10), Medikation, Karteikarte mit Textbausteinen, Bilder & Befunde (Upload möglich)
- **Terminkalender** – Wochenleiste, Tagesplan in 30-Minuten-Slots, Status „Eingetroffen“
- **Wartezimmer** – Wartezeit in Minuten, Patienten aufrufen
- **Karte & E-Rezept** – Versichertenkarte (simuliert) einlesen, Patient finden oder anlegen, E-Rezept mit QR-Token ausstellen
- **Laborergebnisse** – Werte mit Ampel (Referenzbereiche als Beispiel), Verlauf, Übernahme in die Karteikarte
- **Medikamentenkatalog** – Suche über 330 Wirkstoffe (Name, Handelsname, ATC-Code) mit Stärken und Darreichungsformen, direkt verordnen; CSV/JSON-Import einer lizenzierten Arzneimitteldatenbank für den vollständigen, aktuellen Bestand
- **E-Rezept** – Medikamente aus der Akte auswählen, mehrere E-Rezepte mit QR-Token auf einmal ausstellen, Einlösung in der Apotheke simulieren
- **Rezepte** – E-Rezept (über die Karte abrufbar) oder Papierrezept (Muster)
- **Krankmeldung** – „Gelber Schein“ mit Diagnose aus der Akte, digitale Übermittlung an Krankenkasse (KV) und Arbeitgeber (AG) – simuliert
- **Überweisungen** – an Fachrichtungen, mit Diagnose, Medikation und Allergien
- **Vorsorge & Recall** – wer ist fällig (überfällig / in 30 Tagen), Termin direkt vergeben, „Erledigt“ vermerkt die Karteikarte
- **Impfungen** – Impfstatus, fällige Auffrischungen (60 Tage), auch als Reiter in der Patientenakte
- **Leistungen** – erbrachte Leistungen erfassen, Honorar je Monat (frei gewählte Beispielbeträge, keine amtliche Gebührenordnung)
- **Aufgaben** – einfache To-do-Liste
- **Dokumente** – Rezept, AU, Überweisung, Attest, Befundbrief; Platzhalter werden automatisch gefüllt, Druckfunktion, eigene Vorlagen
- **Auswertung** – Altersverteilung, häufigste Diagnosen, Termine je Wochentag, Honorar je Monat
- **Demo & Medien** – Demo-Video, Social-Media-Reel und Instagram-Bilder mit Download-Buttons
- **Hilfe & Tipps** – Schnellstart in fünf Schritten
- **Globale Suche** – `Strg K`; Menüpunkte direkt mit `Strg 1–9, 0`
- **Datensicherung** – Export/Import als JSON

Alle Daten liegen lokal (`allgemein-docs-data.json` im Benutzerdatenordner). Die mitgelieferten Patienten sind frei erfundene Beispieldaten.

> Hinweis: Allgemein Docs ist ein eigenständiges Projekt und kein zertifiziertes Praxisverwaltungssystem (PVS). Es ersetzt weder KV-Anbindung, TI/ePA noch Abrechnungssoftware.

## Installation auf allen Plattformen

| Plattform | Weg |
|---|---|
| Windows | `irm https://raw.githubusercontent.com/ThanosXXL/Thanos/<branch>/allgemein-docs/install/install.ps1 \| iex` (PowerShell) |
| macOS (Apple Silicon) | `curl -fsSL https://raw.githubusercontent.com/ThanosXXL/Thanos/<branch>/allgemein-docs/install/install.sh \| sh` |
| Linux (x64) | derselbe `install.sh`-Befehl, installiert ein AppImage nach `~/.local` |
| Android | Web-App (PWA) in Chrome öffnen, „App installieren“ |
| iPhone / iPad | Web-App in Safari öffnen, Teilen → „Zum Home-Bildschirm“ |

Die Installer-Skripte laden das neueste Release mit Tag `allgemein-docs-v*`. Voraussetzungen: das Repository ist öffentlich,
ein Release wurde veröffentlicht (Tag `allgemein-docs-v1.0.0` pushen → Workflow baut Windows/macOS/Linux) und für Android/iOS ist
GitHub Pages aktiv (Workflow `allgemein-docs-pages.yml`, URL `https://thanosxxl.github.io/Thanos/`). Die Download-Seite mit
3D-Kacheln, Befehl zum Kopieren, QR-Code und Demo-Video liegt in `install/index.html` (erzeugt mit `node install/build-page.js`
aus `install/page.fragment.html`; `<branch>` in den Befehlen bitte auf den Branch setzen, der die Skripte enthält).

Verkaufsvoraussetzungen: siehe [docs/VERKAUFSVORAUSSETZUNGEN.md](docs/VERKAUFSVORAUSSETZUNGEN.md).

## Starten

```bash
npm install
npm start       # Entwicklung
npm run dist    # Installer in dist/
```

Release über Git-Tag `allgemein-docs-v1.0.0` (siehe `.github/workflows/allgemein-docs-release.yml`).

## Marketing-Material neu erzeugen

Im Ordner `marketing/` liegen die Skripte (Playwright + ffmpeg, alles reproduzierbar):

```bash
cd marketing
node render-icon.js       # build/icon.png aus logo.svg
node capture-shots.js     # App-Screenshots mit Beispieldaten
node build-instagram.js   # 5 Feed-Bilder (1080x1080) + Story-Cover (1080x1920) -> renderer/media/instagram/
node build-reel.js        # Reel 1080x1920, 18 s -> renderer/media/allgemein-docs-reel.mp4
node build-demo.js        # Demo-Video 1920x1080 (Intro, App-Tour, Outro) -> renderer/media/allgemein-docs-demo.mp4
```

Voraussetzungen: `playwright` (Chromium), `ffmpeg` im PATH. Die Hintergrundmusik `build/samples/demo-musik.mp3`
wird per `-stream_loop` wiederholt und exakt auf die Videolänge gekürzt (weiches Ein-/Ausblenden).
