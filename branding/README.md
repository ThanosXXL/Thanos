# MSR_DELUXE Branding-Assets

Fertige Marketing-/Demo-Assets für das MSR_DELUXE-Anlagendashboard
(`demo/msr175-dashboard/`), dauerhaft im Repository gesichert statt nur in
einer Chat-Session zu existieren.

- **msr-deluxe-dashboard-demo-with-music.mp4** – Video-Walkthrough des
  Dashboards (alle fünf Ansichten), mit Klavier/Streicher-Begleitmusik
  unterlegt.
- **msr-deluxe-video-player.html** – interaktive, eigenständige Quelldatei
  mit eingebettetem Video-Player (Poster-Frame, Download-Button) für das
  Demo-Video. Einfach im Browser öffnen.
- **msr-deluxe-flyer.png** (1080×1080) – Social-Media-Poster im
  Navy/Gold-Hochglanz-3D-Look: großes Wordmark mit changierendem
  Glanz-Effekt, ein selbst gezeichnetes Instrumenten-Zifferblatt
  (Canvas-Gauge) als Hero-Grafik statt eines UI-Karten-Layouts, direkt
  postbar.
- **msr-deluxe-flyer-shine-loop.mp4** – dasselbe Poster mit dem
  changierenden Glanz-Effekt auf der Headline in Bewegung, für
  Stories/Reels.
- **msr-deluxe-flyer.html** – interaktive, eigenständige Quelldatei des
  Posters (Glanz-Animation + Canvas-Zifferblatt inklusive,
  PNG/Video-Loop-Downloadbuttons eingebettet). Einfach im Browser öffnen.
- **lounge-band.mp3** – die Begleitmusik einzeln (Klavier mit Melodie &
  Begleitung, Streicher, weicher Kick/Rim-Beat), ~30s.
- **lounge-session-player.html** – interaktive, eigenständige Quelldatei
  des Musik-Players (Play/Pause, Frequenzvisualisierung, Download-Button).
  Einfach im Browser öffnen.

Alle Assets sind synthetisch/prozedural erzeugt (ffmpeg-Audiosynthese,
Fluidsynth + General-MIDI-Soundfont, Playwright-Screenshots/-Aufnahmen der
HTML-Vorlagen) und lizenzfrei nutzbar für dieses Projekt.

## Sicherheit & Rechtliches

Die drei `.html`-Quelldateien sind vollständig eigenständig (kein externer
Code/keine externen Schriften oder Bilder, Base64-eingebettete Medien) und
tragen eine `Content-Security-Policy`, die jegliches Nachladen von
Fremdressourcen verhindert. Jede Seite hat unten einen ausklappbaren
"Impressum & Datenschutz"-Hinweis – ein **Platzhalter**, der vor einer
öffentlichen oder gewerblichen Weitergabe (§ 5 TMG / § 18 MStV) durch die
echte Anbieterkennzeichnung ersetzt werden muss.
