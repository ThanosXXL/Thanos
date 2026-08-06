# Branding-Assets: Hintergrundmusik & Demovideo

Dieser Ordner ist der dauerhafte, versionierte Ablageort für die offiziellen
Branding-Assets von PatientenWelt (Hintergrundmusik und Demovideo). Einmal
hier abgelegt, bleiben die Dateien über alle künftigen Sessions/Chats hinweg
erhalten (sie liegen im Git-Repo, nicht in einer einzelnen Chat-Session).

## Demovideo

```
patientenwelt/assets/branding/patientenwelt-dashboard-demo-with-music.mp4
```

Klick-Walkthrough der App (1400×900, ~31s, mit `lounge-band.mp3` unterlegt):
Patientenliste mit Kennzahlen-Kacheln → Patient auswählen → Verlauf → Rezepte
→ Termine → **Kalender** (Termin per Tagesklick eintragen) → Briefe → Suche
& Sortierung in der Patientenliste → Laborwerte eines zweiten Patienten.
Aufgenommen mit Playwright (Chromium, `recordVideo`) gegen die echte
`renderer/`-UI mit frei erfundenen Beispielpatienten, dann mit
`mix-demo-audio.sh` (siehe unten) automatisch vertont.

## Hintergrundmusik

```
patientenwelt/assets/branding/lounge-band.mp3
```

Vorhanden und committet (~30s, Klavier/Streicher, weicher Kick/Rim-Beat,
Lounge-Stil). Ursprünglich auf einem anderen Branch desselben Repos/Accounts
(`claude/msr175-dashboard-demo-fyhsly`, ein separates "MSR_DELUXE"-Demoprojekt)
erzeugt und von dort hierher kopiert — dieses Repo hostet mehrere unabhängige
Demo-Projekte je auf eigenem Branch. Bei Bedarf so wiederfinden/aktualisieren:

```bash
git fetch origin
git show origin/claude/msr175-dashboard-demo-fyhsly:branding/lounge-band.mp3 > lounge-band.mp3
```

## Verwendung: Musiklänge automatisch anpassen

`mix-demo-audio.sh` unterlegt ein beliebiges (stummes) Demovideo mit der
Hintergrundmusik und passt deren Länge automatisch an die Videolänge an — sie
wird bei Bedarf geloopt (Video länger als der Track) oder gekürzt (Video kürzer
als der Track). Das gilt für jedes künftige Demovideo, nicht nur für eines:

```bash
patientenwelt/assets/branding/mix-demo-audio.sh eingabe-video.mp4 ausgabe-video-mit-musik.mp4
```

Voraussetzung: `ffmpeg`/`ffprobe` installiert (`apt-get install -y --no-install-recommends ffmpeg`).
