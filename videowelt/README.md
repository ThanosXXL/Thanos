[![Dozenten Dashboard](https://img.shields.io/badge/📋_Dozenten_Dashboard-0b1f4d?style=for-the-badge)](../README.md)
[![IT-Schulung Dashboard](https://img.shields.io/badge/💻_IT--Schulung_Dashboard-5b9bd5?style=for-the-badge)](../it-schulung/README.md)
[![VideoWelt](https://img.shields.io/badge/🎬_VideoWelt-f4c430?style=for-the-badge&labelColor=000000)](README.md)

# VideoWelt

Desktop-Software (Electron, schwarz/gold) zum Bearbeiten, Erstellen und Schneiden von Videos – mit echter
Verarbeitung über ein gebündeltes [ffmpeg](https://ffmpeg.org/) (keine Installation nötig).

Dies ist eine eigenständige App, komplett getrennt vom **[Dozenten Dashboard](../README.md)** und vom
**[IT-Schulung Dashboard](../it-schulung/README.md)** in diesem Repository (eigener Code, eigenes
`package.json`, eigene Abhängigkeiten). Alle drei Apps teilen sich keine Abhängigkeiten, keine
Build-Konfiguration und keine CI.

## Funktionen

- **Menüleiste** mit Datei, Bearbeiten, Einfügen, Clip, Effekte, Ansicht und Hilfe – inklusive Rückgängig/Wiederholen
  (Strg+Z / Strg+Y), Clip duplizieren (Strg+D), Tastenkürzel-Übersicht und "Über VideoWelt"
- **Medienbibliothek**: Video- und Audiodateien importieren (MP4, MOV, AVI, MKV, WebM, MP3, WAV, AAC, …)
- **VideoWelt-Intro**: das animierte 3D-Logo als fertiger Clip, mit einem Klick an den Anfang der Timeline
  eingefügt (inkl. Überblendung in den nächsten Clip)
- **Timeline** mit Video-, Audio- und Text-Spur: Clips schneiden, trimmen (per Ziehen an den Rändern),
  in Reihenfolge bringen, duplizieren, teilen (Split am Playhead), löschen – mit voller Rückgängig/Wiederholen-Historie
- **Loop- und Zeitlupen-Sequenzen**: ein ausgewählter Clip lässt sich per Menü als eigenständige, einzeln
  bearbeitbare Wiederholung ("Als Schleife wiederholen") oder als Zeitlupen-Kopie (0,5×) direkt danach in die
  Timeline einfügen
- **Effekte pro Clip**: Helligkeit, Kontrast, Sättigung, Graustufen, Sepia, Weichzeichnen, Schärfen, Farbton (Hue),
  Vignette, horizontal/vertikal spiegeln, Rotation, Geschwindigkeit (0,25×–4×, inkl. weicher Zeitlupe per
  Bewegungsinterpolation für ruckelfreie Slow-Motion), Ein-/Ausblenden, Stummschaltung/Lautstärke – live in
  der Vorschau sichtbar
- **Standbild-Export**: die aktuelle Vorschauposition als scharfes PNG in voller Quellauflösung speichern –
  inklusive der auf den Clip angewendeten Effekte
- **Effekt-Presets** im Menü "Effekte": Schwarz-Weiß, Sepia, Warm, Kalt, Kino-Look – mit einem Klick auf den
  ausgewählten Clip anwendbar
- **Übergänge** zwischen Clips: über 35 Varianten (Überblenden, Schwarz-/Weiß-/Grau-Blende, Wischen, Gleiten,
  weiches Wischen, Kreis-/Rechteck-Formen, Öffnen/Schließen, Diagonal, Verpixeln, Radial, Zoom u.v.m.), live in
  der Vorschau animiert
- **Text-Einblendungen**: frei positionierbar, mit Schriftgröße, Farbe und Schriftart (Montserrat oder das
  humanistische Open Sans) wählbar, zeitlich begrenzt
- **Hintergrundmusik/Audiospur** unabhängig von der Video-Timeline positionierbar, mit Lautstärke und Ein-/Ausblenden;
  ein Klick auf "Auf Videolänge anpassen" passt Start/Ende automatisch an die Gesamtlänge des Videos an und
  wiederholt die Musik nahtlos in einer Schleife, falls sie kürzer ist. Ein eingebauter Demo-Musiktitel
  ("🎵 Demo-Musik") lässt sich per Klick hinzufügen und wird direkt auf die aktuelle Videolänge zugeschnitten
- **Export** in MP4 (H.264), MOV (H.264) oder WebM (VP9); Auflösung von SD bis 4K im Querformat, plus
  Hochformat-Presets für Story/Reels/TikTok (9:16) und quadratisch (1:1) für Social Media, wählbare
  Qualität und Bildrate, mit Fortschrittsanzeige
- **Projekte speichern/öffnen** (`.vwproj`) sowie das zuletzt bearbeitete Projekt beim Start wieder anbieten
- **Teilen**: fertige Datei direkt im Dateimanager anzeigen lassen

Die Timeline-Vorschau nutzt CSS-Filter und HTML5-Video/Audio-Elemente für eine schnelle, "lebendige"
Live-Vorschau inklusive Crossfade-Animation; der eigentliche Export läuft über einen echten
ffmpeg-Filtergraphen (Trim, Skalierung, Farbkorrektur, Übergänge, eingebrannte Text-Untertitel, Audiomischung)
für die finale Qualität.

## Installation (für Entwicklung)

```bash
npm install
```

## Starten (Entwicklung)

```bash
npm start
```

## Desktop-Anwendung bauen

```bash
npm run dist
```

Erzeugt eine installierbare Desktop-Anwendung (Windows/macOS/Linux) im Ordner `dist/`. Das benötigte
ffmpeg/ffprobe wird automatisch mit ausgeliefert (`ffmpeg-static`/`ffprobe-static`), es ist keine separate
Installation auf dem Zielrechner nötig.

## Datenschutz (DSGVO)

- **Rein lokale Verarbeitung:** VideoWelt verarbeitet importierte Videos/Audios und erzeugt Exporte
  ausschließlich lokal auf dem jeweiligen Rechner über das mitgelieferte ffmpeg. Es gibt keine
  Cloud-Synchronisierung, keinen Server und keine Telemetrie – die App sendet zu keinem Zeitpunkt
  Daten (Medien, Projektinhalte oder Nutzungsdaten) ins Internet.
- **Projektdateien (`.vwproj`):** liegen unverschlüsselt dort auf der Festplatte, wo sie gespeichert
  werden; sie enthalten Pfade zu den verwendeten Mediendateien sowie Timeline-/Effekteinstellungen,
  nicht die Mediendateien selbst. Eine `videowelt-settings.json` im Benutzerdatenverzeichnis merkt
  sich nur den Pfad des zuletzt geöffneten Projekts.
- **Recht auf Löschung/Portabilität:** Da sämtliche Daten als gewöhnliche Dateien (Projekte, Exporte,
  Thumbnail-Cache im Benutzerdatenverzeichnis) auf dem eigenen Gerät liegen, lassen sie sich jederzeit
  selbst kopieren, verschieben oder löschen – es findet keine Datenhaltung durch den Hersteller statt.
- **Eigenverantwortung bei gemeinsam genutzten Rechnern:** Projekt-, Einstellungs- und Export-Dateien
  liegen unverschlüsselt auf der Festplatte. Auf gemeinsam genutzten oder nicht vollplattenverschlüsselten
  Geräten sollte entsprechend sensibel mit den verarbeiteten Medieninhalten umgegangen werden.

## Impressum (Platzhalter)

> **Hinweis:** Dieser Abschnitt ist ein **Platzhalter** und muss vor einer öffentlichen oder
> gewerblichen Weitergabe dieser Software (z. B. Download-Seite, Verkauf, App-Store-Eintrag) durch
> die gesetzlich vorgeschriebene Anbieterkennzeichnung (§ 5 TMG / § 18 MStV) ersetzt werden.

**Verantwortlich für den Inhalt:**
[Name / Firmenname], [Straße, Hausnummer], [PLZ, Ort], [Land]

**Vertreten durch:** [Name der vertretungsberechtigten Person]

**Kontakt:** Telefon [Telefonnummer] · E-Mail [E-Mail-Adresse]

**Registereintrag** (falls zutreffend): [Handelsregister, Registernummer]
**Umsatzsteuer-ID** (falls zutreffend): [USt-IdNr. nach § 27a UStG]

**Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:** [Name, Anschrift wie oben]

## Copyright

Copyright © 2026. Alle Rechte vorbehalten. Vervielfältigung, Kopie und Weiterverbreitung
dieser Software sind ohne vorherige schriftliche Genehmigung untersagt – siehe
[`LICENSE`](LICENSE).
