# Social-Media-Grafik: Zertifikatsverleihung (M&C Akademie)

Eine einzelne, in sich geschlossene HTML-Datei (`index.html`) für einen animierten
Social-Media-Post im 4:5-Hochformat (Instagram-Feed-Format). Zeigt das M&C Akademie
Logo oben links und eine 3D-Bühnenszene mit erfolgreichen Teilnehmern, die ihr
Zertifikat entgegennehmen – inklusive Hochglanz- und Animationseffekten.

Kein Build-Schritt, keine Abhängigkeiten, kein `npm install` nötig. Das Logo ist
als Base64-Bild eingebettet, die Datei funktioniert also offline (nur die
Google-Fonts "Unbounded" und "Manrope" werden online nachgeladen – ohne
Internetverbindung greift automatisch die System-Schriftart).

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
- **Hochglanz**: Laufende Glanzlicht-Sweeps über Logo-Badge, Zertifikat und
  CTA-Button, Metallic-Schrift-Shimmer auf der Headline, Glassmorphism-Chips.
- **Animationen**: Fallendes Konfetti, rotierender Spotlight-Kegel, sanftes
  Schweben der Figuren, hochzählende Statistik-Zahlen beim Laden, pulsierender
  CTA-Button. Respektiert `prefers-reduced-motion`.

## Anpassen

- **Logo austauschen**: `<img src="data:image/jpeg;base64,...">` im `<header>`
  ersetzen (neues Bild als Base64 kodieren, z. B. `base64 -i logo.png`).
- **Text/Zahlen**: Headline, Subline und die drei Statistik-Werte
  (`data-count`) im HTML sind Platzhalter – bitte durch echte Kennzahlen der
  M&C Akademie ersetzen, bevor die Grafik veröffentlicht wird.
- **Als Video exportieren**: Für Instagram/TikTok/Reels die Seite im Browser
  öffnen und mit einem Bildschirmrekorder (z. B. QuickTime, OBS) im 4:5- bzw.
  9:16-Ausschnitt aufnehmen, da die Datei selbst eine Live-HTML-Animation und
  kein Video ist.

Dieses Verzeichnis ist ein eigenständiges Asset ohne Code-Abhängigkeit zum
Dozenten Dashboard, zu `omniroute/` oder zu `it-schulung/`.
