# Inkarnation Tattoo Studio — Branding-Assets

Fertige Marketing-/Demo-Assets für den Tattoo-Studio-Webshop
(`tattoo-studio-webshop/`), dauerhaft im Repository gesichert statt nur in
einer Chat-Session zu existieren.

- **inkarnation-tattoo-demo-with-music.mp4** — Video-Walkthrough der
  Webseite (Hero, Tätowierer, Galerie, Terminbuchung), mit der
  Lounge-Hintergrundmusik unterlegt. H.264/AAC, 1280×720, ~41,6 s.
- **inkarnation-tattoo-demo-with-music.webm** — dieselbe Aufnahme als
  VP9/Opus-Alternative, für Browser ohne lizenzierten H.264-Decoder
  (z. B. manche Open-Source-Chromium-Builds).
- **video-player.html** — interaktive, eigenständige Quelldatei mit
  eingebettetem Video-Player (MP4 zuerst, WebM-Fallback, Download-Buttons
  für beide Formate). Einfach im Browser öffnen — kein Server nötig.
- **lounge-band.mp3** — die Begleitmusik einzeln (Rhodes-Pad-Akkorde,
  Walking-Bass, Brush-Drums), exakt auf die Videolänge synthetisiert.
- **lounge-session-player.html** — interaktive, eigenständige Quelldatei
  des Musik-Players (Play/Pause, Frequenzvisualisierung per Web Audio
  API, Download-Button). Einfach im Browser öffnen.

Alle Assets sind synthetisch/prozedural erzeugt (Playwright-Aufnahme der
echten Live-Seite für das Video, numpy/scipy-Audiosynthese + ffmpeg für
die Musik) und lizenzfrei nutzbar für dieses Projekt.

## Hinweis zu den Download-Buttons

Die Download-Buttons in `video-player.html` und `lounge-session-player.html`
funktionieren nur, wenn die Datei direkt im Browser geöffnet wird (lokal
oder z. B. über GitHub Pages) — nicht innerhalb eines eingebetteten
Vorschau-Sandkastens (z. B. eines Chat-Artifacts), da solche Sandkästen
Datei-Downloads grundsätzlich blockieren.
