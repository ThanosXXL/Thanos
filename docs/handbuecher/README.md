# Handbücher (PDF-Quellen)

Dieser Ordner enthält die HTML-Quelldateien der PDF-Handbücher als Vorlage für künftige Handbücher/PDFs
in diesem Projekt:

- `powershell-download-skripte.html` – die vier PowerShell-Download-Snippets (Windows/macOS/Android/iOS)
- `benutzerhandbuch.html` – Benutzerhandbuch zu Dozenten Dashboard + Baustelle-Tagesreport

## Design-Standard

- Farben: Orange (`#f2660c`) als Akzent, schwarze Schrift auf weißem Hintergrund
- 3D-isometrische Illustrationen (reines CSS, `transform-style: preserve-3d`) statt Fotos/Logos
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

```bash
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome   # Pfad je nach Umgebung anpassen
"$CHROME" --headless --disable-gpu --no-sandbox \
  --print-to-pdf="Benutzerhandbuch.pdf" --no-pdf-header-footer \
  "file://$(pwd)/benutzerhandbuch.html"
```

Jeder beliebige Chromium/Chrome-Browser mit `--headless --print-to-pdf` funktioniert; alternativ das
HTML-Dokument im Browser öffnen und über die Druckfunktion als PDF speichern (Format A4).
