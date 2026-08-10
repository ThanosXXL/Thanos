# Branding-Assets: Hintergrundmusik, Demovideo & Social-Media-Flyer

Dieser Ordner ist der dauerhafte, versionierte Ablageort für die offiziellen
Branding-Assets von PatientenWelt (Hintergrundmusik, Demovideo, Flyer). Einmal
hier abgelegt, bleiben die Dateien über alle künftigen Sessions/Chats hinweg
erhalten (sie liegen im Git-Repo, nicht in einer einzelnen Chat-Session).

## Social-Media-Flyer

```
patientenwelt/assets/branding/patientenwelt-social-flyer.png   (2160×2160px, Post-Format)
patientenwelt/assets/branding/patientenwelt-story-flyer.png    (2160×3840px, Story-Format 9:16)
```

Beide im Hochglanz-3D-Look der App: verlaufsblauer Hintergrund, glänzendes
Kreis-Medaillon mit dem ⚕-Markenzeichen, Chrom-Wortmarke „PatientenWelt",
Tagline „Ihre Praxis. Digital. Sicher.", vier Feature-Badges
(Verschlüsselt / Kalender / Abrechnung / Datenexport) und ein CTA-Banner
unten. Das Story-Format (für Instagram/Facebook-Stories, 9:16 hochkant)
nutzt die zusätzliche Höhe für eine dritte Ebene: eine glänzende
Feature-Karte mit drei Zeilen (Verschlüsselte Patientendaten / Kalender &
Termine / Abrechnung leicht gemacht). Beide tragen oben rechts dezent den
Hinweis „Demo-Konzept · fiktive Beispieldaten". Quelle ist je eine reine
HTML/CSS-Datei, gerendert per Playwright-Screenshot (`deviceScaleFactor: 2`
für hohe Auflösung). Verwenden dieselben CSS-Variablen (`--blue-900` …
`--blue-50`) wie `renderer/style.css` und halten sich an die bekannte Regel
„kein `text-shadow`/`filter` auf Gradient-Text" (siehe
`patientenwelt/README.md`, Abschnitt Hochglanz-3D-Schrift) —
Schattenwirkung wird stattdessen über eine separat gerenderte, leicht
versetzte Volltonfarben-Kopie hinter dem Gradient-Text erzeugt.

**Hinweis für Download-Seiten:** Wird eines dieser PNGs zusammen mit einem
Download-Button als eigenständige HTML-Datei ausgeliefert, das Bild als
Base64-Data-URI nur **einmal** einbetten (per JS auf `<img src>` und
`<a href>` gleichzeitig zuweisen, nicht zweimal im Markup duplizieren) —
eine doppelte Einbettung verdoppelt unnötig die Dateigröße und kann dazu
führen, dass mobile In-App-Vorschauen die Datei nicht mehr laden.

## Demovideo

```
patientenwelt/assets/branding/patientenwelt-dashboard-demo-with-music.mp4
```

Klick-Walkthrough der App (1400×900, ~40s, mit `lounge-band.mp3` unterlegt):
Konto-Einrichtung (Verschlüsselung aktivieren) → Patientenliste mit
Kennzahlen-Kacheln → Patient auswählen → Verlauf → Termine → **Kalender**
(Termin per Tagesklick eintragen) → **Abrechnung** (nach Privat filtern,
Rechnung erstellen) → Sidebar „Sicherheit": Benutzerverwaltung → Protokoll →
Sperren. Aufgenommen mit Playwright (Chromium, `recordVideo`) gegen die echte
`renderer/`-UI mit frei erfundenen Beispielpatienten, dann mit
`mix-demo-audio.sh` (siehe unten) automatisch vertont. Ersetzt eine ältere
Version, die vor Einführung von Login/Verschlüsselung, Kalender und
Abrechnung aufgenommen wurde.

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
