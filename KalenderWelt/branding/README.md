# KalenderWelt Branding

- `kalenderwelt-dashboard-demo-with-music.mp4` – ~30s Demo-Video (Kalender,
  E-Mail, Word-Dateien) im hellgrün/schwarz/3D/Hochglanz-Design der App.
  Musik: `lounge-band.mp3` aus dem Branch
  `claude/msr175-dashboard-demo-fyhsly` (Commit `2eac678`), dort
  wiederverwendet statt neu komponiert.

Erzeugt mit Playwright (Bildschirmaufnahme der laufenden App unter
`app/index.html`) und ffmpeg (Intro-Karte, Musik, Fade-out).

## Konvention für künftige Demo-Videos

- Musikquelle: `branding/lounge-band.mp3` aus
  `claude/msr175-dashboard-demo-fyhsly` (Commit `2eac678`) wiederverwenden,
  z. B. mit `git show 2eac678:branding/lounge-band.mp3 > lounge-band.mp3`
  – nicht neu komponieren.
- Länge: die Musik (per Trim/Loop in ffmpeg) an die tatsächliche Länge der
  Bildschirmaufnahme anpassen, nicht die Aufnahme auf eine feste
  Musiklänge zuschneiden.
