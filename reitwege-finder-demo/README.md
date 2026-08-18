# Reitwege-Finder – Design-Demo (separat, nicht Teil des Dozenten Dashboards)

Dieser Ordner enthält eine reine Design-/Konzept-Demo für eine **eigenständige,
neue** App-Idee ("Reitwege-Finder"). Er hat keinen Bezug zum Dozenten Dashboard
(`main.js`, `preload.js`, `renderer/`), zu `omniroute/` oder zu `branding/`
(MSR_DELUXE) und wird von keinem Build/Installer mitverpackt.

- **reitwege-finder-demo.mp4** – Slideshow-Video (Intro-Karte → Tracking-Screen
  → Ausritt-Verlauf-Screen → Menü-Screen → Abspann), erzeugt aus echten
  Screenshots des UI-Mockups (Mintgrün/Babyblau, 3D-Hochglanz-Optik, fette
  schwarze Schrift). Unterlegt mit `branding/lounge-band.mp3` (bereits
  vorhandener, lizenzfreier Instrumental-Track – wiederverwendet, aber ohne
  MSR_DELUXE-Bildmaterial oder -Branding).
- **reitwege-finder-demo-player.html** – eigenständige Seite mit Video-Player
  und echtem Download-Button. Einfach im Browser öffnen (funktioniert nicht
  in der eingebetteten Artifact-Vorschau, da dort Downloads technisch
  blockiert sind).

**Wichtig – was das hier NICHT ist:** Weder das Video noch die Screens zeigen
eine funktionierende App. Es gibt hier (Mockup/Demo) kein echtes GPS-Tracking
und keine echten Wegedaten. Die Kartendarstellung im Design ist bewusst
illustrativ (generische Linien, keine Behörden-/Wegerecht-Daten) – ein
Hinweis-Badge dazu ist direkt im Design sichtbar.

**Status für eine geplante Vollversion** (zwei unterschiedliche Fälle):
- **GPS-Tracking von Ausritten** (eigene Position während der Fahrt
  aufzeichnen, Strecke/Tempo/Dauer) ist eine realistische, technisch
  überschaubare Funktion für eine echte Vollversion – dafür reicht
  Standard-Geräte-GPS, keine externe Datenquelle nötig.
- **Kartierung *erlaubter* Reitwege** ist etwas anderes: Das würde echte,
  autoritative Daten voraussetzen (Wegerecht, Forst-/Naturschutzbehörden,
  Grundstückseigentümer). Das ist **nicht automatisch Teil einer Vollversion**,
  sondern hängt davon ab, ob eine solche Datenquelle tatsächlich beschafft
  wird – sonst wäre es ein leeres Versprechen gegenüber echten Nutzer:innen,
  die sich beim Reiten darauf verlassen, wo sie legal unterwegs sind.

Die drei gezeigten Screens (Tracking, Verlauf, Menü – Menü listet alle
geplanten Funktionen als Navigationspunkte auf, ohne dass dahinter echte
Funktionalität steckt) wurden zuerst als Claude-Design-Canvas erstellt; die
Screenshots dafür wurden lokal aus statisch aufgelösten Kopien der
Design-Dateien gerendert (Playwright), das Video mit ffmpeg zusammengesetzt.
