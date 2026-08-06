# Branding-Hintergrundmusik

Dieser Ordner ist der dauerhafte, versionierte Ablageort für die offizielle
Hintergrundmusik von PatientenWelt-Demovideos. Einmal hier abgelegt, bleibt die
Datei über alle künftigen Sessions/Chats hinweg erhalten (sie liegt im Git-Repo,
nicht in einer einzelnen Chat-Session) und wird automatisch für jedes neue
Demovideo wiederverwendet.

## Ablage

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
