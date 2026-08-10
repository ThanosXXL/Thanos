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

### Fertige Download-Seiten mit Download-Button

```
patientenwelt/assets/branding/flyer-download-post.html    (~0,9 MB)
patientenwelt/assets/branding/flyer-download-story.html   (~1,5 MB)
patientenwelt/assets/branding/patientenwelt-social-flyer.jpg
patientenwelt/assets/branding/patientenwelt-story-flyer.jpg
```

Eigenständige, offline funktionierende HTML-Seiten mit Bildvorschau und
einem großen glossy "Download"-Button (Data-URI-Download, kein Server
nötig). Referenzimplementierung für jede künftige Download-Seite in
diesem Projekt — bitte dieses Muster wiederverwenden statt neu zu bauen:

- **Bild als JPEG, nicht PNG, einbetten.** Die verlustfreien PNGs
  (`patientenwelt-social-flyer.png` / `-story-flyer.png`, 2,3–3 MB) sind
  fürs Archiv/Druck gedacht. Für eingebettete Download-Seiten stattdessen
  die `.jpg`-Varianten verwenden (`ffmpeg -i input.png -q:v 2 -update 1
  -frames:v 1 output.jpg`, praktisch verlustfrei fürs Auge, aber
  85–90 % kleiner — Social-Media-Plattformen komprimieren beim Upload
  ohnehin zu JPEG).
- **Bild nur einmal einbetten.** Die Base64-Data-URI per JS einer
  Variable zuweisen und sowohl an `<img src>` als auch an `<a href
  download>` hängen — nie zweimal identisch ins Markup schreiben. Eine
  doppelte Einbettung verdoppelt unnötig die Dateigröße.
- **Ein Flyer pro Datei, nicht mehrere kombiniert.** Eine Seite mit zwei
  eingebetteten Bildern (Post + Story zusammen, ~7 MB) hat sich in der
  Praxis als zu groß für mobile In-App-HTML-Vorschauen erwiesen (Fehler
  „Vorschau konnte nicht geladen werden"); getrennte, schlanke Seiten
  (< 1,5 MB) haben zuverlässig funktioniert.

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
