# Fiverr-Medien-Generator (Gig-Titelbild + Demovideo)

Erzeugt aus HTML/CSS das 3D-Hochglanz-Gig-Titelbild (PNG, 2560×1538) und das Demovideo
(MP4, 1920×1080, 30 fps, 29,67 s) mit Lounge-Hintergrundmusik in gleicher Länge – jeweils DE und EN.

## Schnellstart
```bash
cd it-world/fiverr/tools
node build.cjs                  # alles (Titelbild + Video, DE + EN) nach ../
node build.cjs de --cover       # nur deutsches Titelbild
node build.cjs en --video       # nur englisches Video
node build.cjs all --out ./neu --music ../musik/lounge-band-1.mp3
```
Voraussetzungen: Node 18+, `npm i playwright` (Chromium), `ffmpeg` im PATH.
`DEBUG_FRAMES=60 node build.cjs de --video --out /tmp/test` rendert nur 60 Bilder (schneller Test).

## Anpassen für andere Projekte
- **`config.js`**: Jahre Erfahrung und Paketpreise (werden in Titelbild und Video übernommen).
- **`cover.html`** / **`video.html`**: Texte stehen im Wörterbuch `X` (DE/EN), Szenen-Zeiten in den `T(...)`-Tracks.
- **Musik**: `--music pfad.mp3`. Die Spur wird auf die Videolänge gekürzt/aufgefüllt (0,6 s Ein-, 1,4 s Ausblenden).
- **Bilder**: Logo `../logo-3d-hochglanz.png`, Galeriebilder `../3d/*.png` (Pfade in den HTML-Dateien).
- **Schrift**: Open Sans (humanistisch, OFL-Lizenz, `fonts/`).
