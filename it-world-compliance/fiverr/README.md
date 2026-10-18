# Fiverr-Unterlagen · IT-WORLD Compliance-Assistent

© 2026 IT-WORLD. Alle Rechte vorbehalten. Vervielfältigung und Weitergabe untersagt.

| Datei | Inhalt |
|---|---|
| `IT-WORLD-Compliance-Assistent-Demovideo.mp4` | Demovideo 1080p, 8 Szenen mit vollständigem IT-WORLD-Logo, Länge = Hintergrundmusik (29,65 s) |
| `IT-WORLD-Compliance-Assistent-Benutzerhandbuch.pdf` | Benutzerhandbuch mit 20 Abbildungen (Beispielbilder), Open Sans, „Seite X von Y“ unten mittig, Copyright |
| `IT-WORLD-Compliance-Assistent-Fiverr-Angebot.pdf` | 3 Pakete (Basic 1.800 €, Standard 3.800 €, Premium 7.579 €), Beschreibung, Voraussetzungen, Gig-Texte |
| `fiverr-texte.txt` | Gig-Titel, -Beschreibung, Paketbeschreibungen, FAQ, Tags zum Kopieren (mit Zeichenzählung) |
| `screens/` | Beispielbilder aus der echten App mit fiktiven Demodaten |
| `assets/lounge-band-1.mp3` | Hintergrundmusik des Demovideos (Nutzungsrechte vorab sicherstellen) |

## Neu erzeugen

Benötigt Playwright (Chromium), `ffmpeg`/`ffprobe`, `pdftotext` und die installierte App (`npm install` im Ordner darüber).

```bash
export PLAYWRIGHT_PATH=/pfad/zu/node_modules/playwright
xvfb-run -a node tools/capture.js      # Beispielbilder aus der App
node tools/build-video.js              # Demovideo (Länge folgt der MP3)
node tools/build-pdf.js                # Handbuch, Angebot, fiverr-texte.txt
```

Preise, Paketumfang und Texte stehen am Anfang von `tools/build-pdf.js` (`PREISE`, `INSTALL`, `TEXT`).
