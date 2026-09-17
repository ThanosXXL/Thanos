[![Dozenten Dashboard](https://img.shields.io/badge/📋_Dozenten_Dashboard-0b1f4d?style=for-the-badge)](../README.md)
[![IT-Schulung Dashboard](https://img.shields.io/badge/💻_IT--Schulung_Dashboard-5b9bd5?style=for-the-badge)](../it-schulung/README.md)
[![FotoWelt](https://img.shields.io/badge/✨_FotoWelt-7c5cff?style=for-the-badge)](README.md)

# FotoWelt

Desktop-Bildbearbeitungsprogramm (Electron) für **3D-Stil- und Hochglanz-Effekte**, Logo-Compositing auf
Hintergrundbildern und den Export als **Loop-Video mit Hintergrundmusik**.

## Funktionen

- **Bilder-Import** (FotoWelt): beliebig viele Bilder, per Ziehen neu sortierbar
- **Große Auswahl an Effekten** pro Bild, gruppiert in Basis-Korrektur, 3D-Stil & Hochglanz,
  Licht & Schatten, Duoton-Verlauf sowie Textur & Rahmen – u. a. Helligkeit/Kontrast/Sättigung,
  Weichzeichner/Schärfen, Sepia/Graustufen/Invertieren, 3D-Neigung & Tiefe, Hochglanz-Sweep,
  3D-Bevel-Kante, Chrom/Metallic, Schlagschatten, Leuchten (Glow), Vignette, Duoton, Filmkorn,
  Spiegelung sowie ein rundbarer Rahmen
- **Presets** (Hochglanz 3D, Chrom Metallic, Neon Glow, Film Noir, Warmes Duoton, Spiegel-Reflex) plus
  eigene, speicherbare Presets
- **Logo/Wasserzeichen**: Position, Größe, Rotation, Deckkraft und Mischmodus frei einstellbar, plus ein
  animierter Gold-Glanz-Loop (an/aus, Tempo einstellbar) – live in der Vorschau und im Export
- **Automatische Verbesserung**: analysiert das aktive Bild und schlägt bei Bedarf Helligkeit/Kontrast/
  Sättigung vor, die sich per Klick annehmen oder ablehnen lassen
- **Live-Vorschau** als abspielbarer Loop mit weichen Überblendungen zwischen den Bildern, synchron zur
  Hintergrundmusik
- **Export** als MP4: alle Bilder werden mit weichen Übergängen zu einem Loop zusammengefügt, dessen
  Länge sich exakt an der ausgewählten Hintergrundmusik orientiert (inkl. kurzem Audio-Fade-in/-out)
- Mehrere **Projekte** lassen sich anlegen, umbenennen, wechseln und löschen; alles wird lokal gespeichert

Der Export läuft lokal über ein mitgeliefertes `ffmpeg` (kein separates Installieren von ffmpeg nötig).
Dafür muss vor dem Export eine Hintergrundmusik ausgewählt sein, da die Loop-Länge daran ausgerichtet wird.

Dies ist eine eigenständige App, komplett getrennt vom **[Dozenten Dashboard](../README.md)** und vom
**[IT-Schulung Dashboard](../it-schulung/README.md)** in diesem Repository (eigener Code, eigenes
`package.json`, eigene Datendatei). Keine der Apps teilt Abhängigkeiten oder Build-Konfiguration.

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
