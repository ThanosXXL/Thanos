# Social-Media-Grafik: Zertifikatsverleihung (M&C Akademie)

Eine einzelne, in sich geschlossene HTML-Datei (`index.html`) für einen animierten
Social-Media-Post im 4:5-Hochformat (Instagram-Feed-Format). Zeigt das M&C Akademie
Logo oben links (freigestellt, ohne Rahmen/Box) und eine 3D-Bühnenszene mit drei
animierten, vollständigen menschlichen Figuren (Kopf mit Gesicht – Augen, Nase,
Mund, Ohren, Haare –, Rumpf im Outfit, Arme mit Händen/Fingern, Beine mit Schuhen)
die ein Zertifikat entgegennehmen – inklusive Hochglanz- und Animationseffekten,
einem in Echtzeit rotierenden Zertifikats-Loop und einem Download-Button.

Die Figuren sind bewusst als stilisierte, glossy 3D-Illustration gehalten statt als
echte Fotos: Fotos realer Personen als (nicht tatsächlich existierende) Absolventen
auszugeben, wäre irreführend. Wer echte Teilnehmerfotos einbinden möchte, kann das
selbst tun (siehe „Anpassen“).

Kein Build-Schritt, keine Abhängigkeiten, kein `npm install` nötig. Das Logo ist
als Base64-Bild eingebettet, die Datei funktioniert also offline (nur die
Google-Fonts "Unbounded", "Manrope" und "Playfair Display" sowie die
`html2canvas`-Bibliothek für den Download-Button werden online nachgeladen –
ohne Internetverbindung greifen automatisch System-Schriftarten und der
Download-Button zeigt einen Hinweis statt zu exportieren).

## Ansehen

```bash
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Oder die Datei einfach per Doppelklick im Browser öffnen.

## Effekte

- **3D-Optik**: Perspektivische Bühne (`perspective`/`preserve-3d`), leicht
  geneigtes Zertifikat, Maus-Parallax-Tilt der gesamten Grafik (Desktop),
  gespiegelte Bodenreflexion für Tiefenwirkung.
- **Hochglanz**: Laufende Glanzlicht-Sweeps über Zertifikat und CTA-Button,
  Metallic-Schrift-Shimmer auf der Headline, Glassmorphism-Chips, glänzend
  schattierte Outfits/Haut der Figuren.
- **Animationen**: Fallendes Konfetti, rotierender Spotlight-Kegel, sanftes
  Schweben und Jubel-Armbewegung der Figuren, hochzählende Statistik-Zahlen
  beim Laden, pulsierender CTA-Button. Respektiert `prefers-reduced-motion`.
- **Figuren**: Drei per JavaScript als SVG gezeichnete, vollständige
  Personen (siehe `buildHumanFigure()` im `<script>`-Block) – kein
  Platzhalter-Icon, sondern Kopf/Haare/Gesicht, Rumpf, zwei Arme mit
  Händen (Finger angedeutet) und zwei Beine mit Schuhen, in Marken-Rot/Gold
  (mittlere Figur) bzw. dunklem Businessoutfit (äußere Figuren).
- **Echtzeit-Zertifikats-Loop**: Die gehaltene Urkunde ist kein Standbild,
  sondern eine automatisch alle 3,4 Sekunden weiterschaltende Karussell-Animation
  (Überblendung + 3D-Drehung) durch mehrere Zertifikate – siehe „Anpassen“ unten.

## Download-Button

Oben rechts auf der Grafik (neben dem Logo, über dem Datums-Badge) sitzt ein
kompakter „PNG“-Button. Er exportiert die aktuelle Ansicht (per `html2canvas`,
2-fache Auflösung) als PNG-Datei und wird beim Export selbst automatisch aus
dem Bild ausgeblendet (`ignoreElements`), taucht also nicht im exportierten
Bild auf.

- **Lokal im Browser** (Doppelklick auf `index.html`, oder auf einer eigenen
  Website eingebunden): funktioniert normal über einen Standard-Browser-Download.
- **In der Claude-Artifact-Vorschau im Chat**: funktioniert ebenfalls, aber
  über die Claude-„downloads“-Capability (Bestätigungsdialog des Viewers) statt
  über einen klassischen Browser-Download – technisch bedingt, da Artifact-Vorschauen
  aus Sicherheitsgründen keine direkten Datei-Downloads zulassen.

## Anpassen

- **Logo austauschen**: `<img src="data:image/jpeg;base64,...">` im `<header>`
  ersetzen (neues Bild als Base64 kodieren, z. B. `base64 -i logo.png`).
- **Text/Zahlen**: Headline, Subline und die vier Statistik-Werte
  (`data-count`) im HTML – aktuell über 4.000 Teilnehmende, über 98 %
  Erfolgsquote, seit 2019, ⌀ 30 Teilnehmer/Schulung – bei Bedarf anpassen.
- **Echte Zertifikate einbinden**: Im `<script>`-Block das Array `CERTIFICATES`
  bearbeiten. Jeder Eintrag erzeugt entweder eine generierte Urkunde
  (`name`, `course`, `date`, `no`) oder – wenn `image` gesetzt ist – zeigt ein
  eingescanntes/fotografiertes Original-Zertifikat als Bild an (Base64 oder
  Datei-URL). Die mitgelieferten Namen (Max Mustermann, Erika Musterfrau,
  Jonas Keller) sind Platzhalter und **müssen** vor der Veröffentlichung durch
  echte Teilnehmer bzw. echte Zertifikatsbilder ersetzt werden.
- **Als Video exportieren**: Für Instagram/TikTok/Reels die Seite im Browser
  öffnen und mit einem Bildschirmrekorder (z. B. QuickTime, OBS) im 4:5- bzw.
  9:16-Ausschnitt aufnehmen, da die Datei selbst eine Live-HTML-Animation und
  kein Video ist.

Dieses Verzeichnis ist ein eigenständiges Asset ohne Code-Abhängigkeit zum
Dozenten Dashboard, zu `omniroute/` oder zu `it-schulung/`.
