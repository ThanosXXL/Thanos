[![Dozenten Dashboard](https://img.shields.io/badge/📋_Dozenten_Dashboard-0b1f4d?style=for-the-badge)](../README.md)
[![IT-Schulung Dashboard](https://img.shields.io/badge/💻_IT--Schulung_Dashboard-5b9bd5?style=for-the-badge)](../it-schulung/README.md)
[![VideoWelt](https://img.shields.io/badge/🎬_VideoWelt-f4c430?style=for-the-badge&labelColor=000000)](README.md)

# VideoWelt

Desktop-Software (Electron, schwarz/gold) zum Bearbeiten, Erstellen und Schneiden von Videos – mit echter
Verarbeitung über ein gebündeltes [ffmpeg](https://ffmpeg.org/) (keine Installation nötig).

Dies ist eine eigenständige App, komplett getrennt vom **[Dozenten Dashboard](../README.md)** und vom
**[IT-Schulung Dashboard](../it-schulung/README.md)** in diesem Repository (eigener Code, eigenes
`package.json`, eigene Abhängigkeiten). Alle drei Apps teilen sich keine Abhängigkeiten, keine
Build-Konfiguration und keine CI.

## Funktionen

- **Menüleiste** mit Datei, Bearbeiten, Einfügen, Clip, Effekte, Ansicht und Hilfe – inklusive Rückgängig/Wiederholen
  (Strg+Z / Strg+Y), Clip duplizieren (Strg+D), Tastenkürzel-Übersicht und "Über VideoWelt"
- **Medienbibliothek**: Video- und Audiodateien importieren (MP4, MOV, AVI, MKV, WebM, MP3, WAV, AAC, …)
- **Timeline** mit Video-, Audio- und Text-Spur: Clips schneiden, trimmen (per Ziehen an den Rändern),
  in Reihenfolge bringen, duplizieren, teilen (Split am Playhead), löschen – mit voller Rückgängig/Wiederholen-Historie
- **Effekte pro Clip**: Helligkeit, Kontrast, Sättigung, Graustufen, Sepia, Weichzeichnen, Schärfen, Farbton (Hue),
  Vignette, horizontal/vertikal spiegeln, Rotation, Geschwindigkeit (0,25×–4×), Ein-/Ausblenden,
  Stummschaltung/Lautstärke – live in der Vorschau sichtbar
- **Effekt-Presets** im Menü "Effekte": Schwarz-Weiß, Sepia, Warm, Kalt, Kino-Look – mit einem Klick auf den
  ausgewählten Clip anwendbar
- **Übergänge** zwischen Clips: über 35 Varianten (Überblenden, Schwarz-/Weiß-/Grau-Blende, Wischen, Gleiten,
  weiches Wischen, Kreis-/Rechteck-Formen, Öffnen/Schließen, Diagonal, Verpixeln, Radial, Zoom u.v.m.), live in
  der Vorschau animiert
- **Text-Einblendungen**: frei positionierbar, mit Schriftgröße und Farbe, zeitlich begrenzt
- **Hintergrundmusik/Audiospur** unabhängig von der Video-Timeline positionierbar, mit Lautstärke und Ein-/Ausblenden;
  ein Klick auf "Auf Videolänge anpassen" passt Start/Ende automatisch an die Gesamtlänge des Videos an und
  wiederholt die Musik nahtlos in einer Schleife, falls sie kürzer ist. Ein eingebauter Demo-Musiktitel
  ("🎵 Demo-Musik") lässt sich per Klick hinzufügen und wird direkt auf die aktuelle Videolänge zugeschnitten
- **Export** in MP4 (H.264), MOV (H.264) oder WebM (VP9); Auflösung von SD bis 4K im Querformat, plus
  Hochformat-Presets für Story/Reels/TikTok (9:16) und quadratisch (1:1) für Social Media, wählbare
  Qualität und Bildrate, mit Fortschrittsanzeige
- **Projekte speichern/öffnen** (`.vwproj`) sowie das zuletzt bearbeitete Projekt beim Start wieder anbieten
- **Teilen**: fertige Datei direkt im Dateimanager anzeigen lassen

Die Timeline-Vorschau nutzt CSS-Filter und HTML5-Video/Audio-Elemente für eine schnelle, "lebendige"
Live-Vorschau inklusive Crossfade-Animation; der eigentliche Export läuft über einen echten
ffmpeg-Filtergraphen (Trim, Skalierung, Farbkorrektur, Übergänge, eingebrannte Text-Untertitel, Audiomischung)
für die finale Qualität.

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

Erzeugt eine installierbare Desktop-Anwendung (Windows/macOS/Linux) im Ordner `dist/`. Das benötigte
ffmpeg/ffprobe wird automatisch mit ausgeliefert (`ffmpeg-static`/`ffprobe-static`), es ist keine separate
Installation auf dem Zielrechner nötig.
