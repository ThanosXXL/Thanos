# Handbücher (PDF-Quellen)

Dieser Ordner enthält die HTML-Quelldateien der PDF-Handbücher als Vorlage für künftige Handbücher/PDFs
in diesem Projekt:

- `benutzerhandbuch.html` – Benutzerhandbuch zu Baustelle Tagesreport (Funktionen, Bedienung, DSGVO)
- `installationsanleitung.html` – Schritt-für-Schritt-Installation für alle 5 Plattformen (Windows/macOS/Linux/Android/iOS)

## Design-Standard

- Schriftart: **Inter** (warme, humanistische Sans-Serif – auf dieser Maschine unter
  `/usr/share/fonts/opentype/inter/` installiert, wird beim PDF-Druck mit eingebettet; Fallback
  `'Segoe UI', Arial, sans-serif`)
- Farben: Orange (`#f2660c`) als Akzent, schwarze Schrift auf weißem Hintergrund
- 3D-isometrische Illustrationen (reines CSS, `transform-style: preserve-3d`) statt Fotos/Logos
- **Fortlaufende Seitenzahl unten Mitte auf jeder Seite** (warmes Orange `#b35a1f`, Format „n / gesamt“) –
  siehe „PDF erzeugen“ unten, das läuft über Chromes DevTools-Protokoll (`Page.printToPDF` mit
  `displayHeaderFooter` + `footerTemplate`), nicht über CSS `@page` (von Chromes Druck-Engine nicht
  unterstützt)
- **Jedes Handbuch endet ganz unten mit folgendem Copyright-Block:**

  ```
  © 2026 ΠιΧί Software Corporation. Alle Rechte vorbehalten.

  Alle in diesem Dokument angegebenen Daten und Handhabungen unterliegen dem Copyright.
  Eine Vervielfältigung sowie eine Veröffentlichung, auch auszugsweise, ist dementsprechend
  nicht gestattet.
  ```

  Siehe die `.copyright-block`-CSS-Klasse und den entsprechenden `<div>` am Dokumentenende in
  beiden HTML-Dateien als Vorlage für neue Handbücher.

## PDF erzeugen

Chromes Kommandozeilen-Flag `--print-to-pdf` unterstützt keine eigene Fußzeilen-Vorlage. Für die
fortlaufende Seitenzahl unten Mitte muss stattdessen `Page.printToPDF` direkt über das DevTools-Protokoll
aufgerufen werden (`displayHeaderFooter: true` + `footerTemplate` mit `<span class="pageNumber">` /
`<span class="totalPages">`). Ein fertiges Skript dafür:

```bash
python3 -m pip install websocket-client requests
python3 print_pdf.py benutzerhandbuch.html Benutzerhandbuch.pdf
python3 print_pdf.py installationsanleitung.html Installationsanleitung.pdf
```

`print_pdf.py` (liegt in diesem Ordner) startet Chrome headless mit `--remote-debugging-port`,
verbindet sich per WebSocket und ruft `Page.printToPDF` mit der Fußzeilen-Vorlage auf. Der Pfad zum
Chrome-Binary ist oben im Skript als `CHROME = "..."` hinterlegt und muss ggf. an die eigene Umgebung
angepasst werden.

Alternativ: HTML-Dokument im Browser öffnen und über die Druckfunktion als PDF speichern (Format A4,
„Kopf- und Fußzeilen” aktivieren) – dort setzt Chrome eigene (schlichtere) Standard-Seitenzahlen.

## Beispielbilder erzeugen

Die `.example-figure`-Screenshots in beiden Handbüchern (`assets/*.png`) stammen ebenfalls aus einem
headless Chrome über das DevTools-Protokoll, diesmal per `Page.captureScreenshot` statt `Page.printToPDF`
– nötig, weil ein einfacher Vollseiten-Screenshot bei langen Seiten (z. B. `docs/demo.html`) ein völlig
überlanges, für ein PDF unbrauchbares Bild ergibt. `scroll_shot.py` navigiert stattdessen zu einer HTML-Datei,
scrollt optional per `element.scrollIntoView()` zu einem CSS-Selektor und nimmt erst dann einen Screenshot
in normaler Viewport-Größe auf:

```bash
python3 scroll_shot.py ../../baustelle-tagesreport/renderer/impressum.html assets/impressum-beispiel.png
python3 scroll_shot.py ../demo.html assets/bauplanphase-beispiel.png “.dl-row”
```

Der dritte (optionale) Parameter ist ein CSS-Selektor, zu dem vor der Aufnahme gescrollt wird.
