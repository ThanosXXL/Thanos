# Branding-Hintergrundmusik

Dieser Ordner ist der dauerhafte, versionierte Ablageort für die offizielle
Hintergrundmusik von PatientenWelt-Demovideos. Einmal hier abgelegt, bleibt die
Datei über alle künftigen Sessions/Chats hinweg erhalten (sie liegt im Git-Repo,
nicht in einer einzelnen Chat-Session) und wird automatisch für jedes neue
Demovideo wiederverwendet.

## Ablage

Die Musikdatei gehört hierher als:

```
patientenwelt/assets/branding/lounge-band.mp3
```

Noch nicht vorhanden — sobald die Datei einmal im Chat hochgeladen wird, wird sie
genau hier committet.

## Verwendung: Musiklänge automatisch anpassen

`mix-demo-audio.sh` unterlegt ein beliebiges (stummes) Demovideo mit der
Hintergrundmusik und passt deren Länge automatisch an die Videolänge an — sie
wird bei Bedarf geloopt (Video länger als der Track) oder gekürzt (Video kürzer
als der Track). Das gilt für jedes künftige Demovideo, nicht nur für eines:

```bash
patientenwelt/assets/branding/mix-demo-audio.sh eingabe-video.mp4 ausgabe-video-mit-musik.mp4
```

Voraussetzung: `ffmpeg`/`ffprobe` installiert (`apt-get install -y --no-install-recommends ffmpeg`).
