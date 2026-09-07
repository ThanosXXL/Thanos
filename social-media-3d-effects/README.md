# Social-Media-Grafik: Zertifikatsverleihung (M&C Akademie)

Eine einzelne, in sich geschlossene HTML-Datei (`index.html`) für einen animierten
Social-Media-Post im 4:5-Hochformat (Instagram-Feed-Format). Zeigt das M&C Akademie
Logo oben links (großzügig, oval freigestellt per `clip-path` – kein
rechteckiger Rahmen/keine Ecken sichtbar, weißer statt transparenter
Hintergrund für zuverlässige Lesbarkeit, dazu ein durchlaufender
Glanzlicht-Sweep) und eine 3D-Bühnenszene
mit drei animierten, vollständigen menschlichen Figuren (Kopf mit Gesicht – Augen,
Nase, Mund, Ohren, Haare –, Rumpf im Outfit, Arme mit Händen/Fingern, Beine mit
Schuhen) die ein Zertifikat entgegennehmen – inklusive Hochglanz- und
Animationseffekten und einem in Echtzeit rotierenden Zertifikats-Loop.

Die Figuren sind bewusst als stilisierte, glossy 3D-Illustration gehalten statt als
echte Fotos: Fotos realer Personen als (nicht tatsächlich existierende) Absolventen
auszugeben, wäre irreführend. Wer echte Teilnehmerfotos einbinden möchte, kann das
selbst tun (siehe „Anpassen“).

Kein Build-Schritt, keine Abhängigkeiten, kein `npm install` nötig. Logo und alle
Grafiken sind eingebettet, die Datei funktioniert also komplett offline (nur die
Google-Fonts "Unbounded", "Manrope" und "Playfair Display" werden online
nachgeladen – ohne Internetverbindung greifen automatisch System-Schriftarten).

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
  (Ein Screenshot mitten in der Zähl-Animation zeigt einen Zwischenwert –
  das ist kein falscher Wert, sondern die Animation läuft noch.)
- **Figuren**: Drei per JavaScript als SVG gezeichnete, vollständige
  Personen (siehe `buildHumanFigure()` im `<script>`-Block) – kein
  Platzhalter-Icon, sondern Kopf/Gesicht (Augen, Nase, Mund, Ohren),
  Rumpf, zwei Arme mit Händen (4 Finger + Daumen) und zwei Beine mit
  Schuhen, in Marken-Rot/Gold (mittlere Figur) bzw. dunklem
  Businessoutfit (äußere Figuren). Jede Figur hat eine eigene, an
  aktuelle Trendfrisuren angelehnte Frisur mit echten Strähnen-Linien
  für Tiefe/Textur statt einer flachen Fläche (`HAIR_PATHS` +
  `HAIR_STRANDS`, je Strähne als Fläche oder helle/dunkle Stroke-Linie:
  `short` = texturierter Crop mit Pony, `wave` = Curtains/seitlicher
  Sweep, `long` = gewellte Shag-Länge) – bei Bedarf leicht um weitere
  Stile erweiterbar.
- **Echtzeit-Zertifikats-Loop**: Die gehaltene Urkunde ist kein Standbild,
  sondern eine automatisch alle 3,4 Sekunden weiterschaltende Karussell-Animation
  (Überblendung + 3D-Drehung) durch mehrere Zertifikate – siehe „Anpassen“ unten.
- **Headline-Leuchtlauf**: „Erfolg hat einen Namen.“ wird pro Buchstabe in
  einen eigenen `<span>` zerlegt; ein Lichtschein läuft fortlaufend von A bis
  Z über den Text und wiederholt sich als Loop (`@keyframes letterChase`,
  Versatz je Buchstabe über `animation-delay`).
- **Karten-Glanz-Sweep**: Ein diagonaler Lichtreflex läuft alle 8 Sekunden
  einmal über die komplette Grafik (Header, Bühne und Text) – wie eine
  Glasoberfläche, die das Licht einfängt.

## Anpassen

- **Logo austauschen**: `<img src="data:image/png;base64,...">` im `<header>`
  ersetzen (neues Bild als Base64 kodieren, idealerweise bereits freigestellt
  mit weißem Hintergrund, z. B. `base64 -i logo.png`).
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

## Kompatibilität mit eingeschränkten Vorschau-Browsern

Manche In-App-Dateivorschauen (z. B. wenn die Datei über eine Messenger-/
Sharing-App geöffnet wird, statt in einem echten Browser) sind stark
eingeschränkte WebViews: sehr große Base64-Bilder können dort fehlschlagen,
und moderne CSS-Eigenschaften wie `aspect-ratio` werden nicht immer
unterstützt. Deshalb ist das Logo bewusst klein gehalten (freigestelltes PNG,
~27 KB statt >100 KB Originalgröße) und die Bühnenhöhe (`.scene-wrap`) ist
fest in `em` statt über
`aspect-ratio`/`flex-grow` berechnet, damit Zertifikat und Figuren dort nicht
unsichtbar werden. Am zuverlässigsten ist weiterhin ein echter Browser
(Chrome, Safari, Firefox) – siehe „Ansehen“ oben.

Dieses Verzeichnis ist ein eigenständiges Asset ohne Code-Abhängigkeit zum
Dozenten Dashboard, zu `omniroute/` oder zu `it-schulung/`.
