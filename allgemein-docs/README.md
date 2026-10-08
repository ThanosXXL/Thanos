# Allgemein Docs

Logo: Glaskugel mit weißem 3D-Kreuz und EKG-Linie (`renderer/img/logo.svg`). Das frühere Dokument-Logo liegt als `logo-alt.svg` bereit.

Moderne, einfache Praxisverwaltung für die Allgemeinmedizin – Desktop-App (Windows, macOS, Linux).
Navy-blaues Design, weiße Schrift in der humanistischen Schrift *Open Sans*, großes Seitenmenü, Beispielbilder und Animationen.

## Funktionen

- **Start** – Tagesüberblick mit animierten Kennzahlen, Terminen von heute, Schnellzugriff
- **Patienten** – Akte mit Stammdaten, Diagnosen (ICD-10), Medikation, Karteikarte mit Textbausteinen, Bilder & Befunde (Upload möglich)
- **Terminkalender** – Wochenleiste, Tagesplan in 30-Minuten-Slots, Status „Eingetroffen“
- **Wartezimmer** – Wartezeit in Minuten, Patienten aufrufen
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
