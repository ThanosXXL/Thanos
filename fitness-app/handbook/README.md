# MyWorkOut – Handbuch-Generator

Erzeugt je ein Benutzerhandbuch (PDF) pro unterstützter Plattform (Web,
Windows, macOS, Linux, iOS, Android) im gleichen Gelb/Schwarz-Glanzstil wie
die App: Cover, plattformspezifische Installationsanleitung, bebilderter
Bedienungs-Überblick und – als Anhang – der vollständige JavaScript-Quellcode
der App. Jedes Handbuch endet mit Copyright- und Verbreitungs-Hinweis.

## Neu erzeugen

```bash
# 1. App lokal servieren (aus fitness-app/):
npm run web

# 2. Aktuelle Screenshots aufnehmen (in einem zweiten Terminal):
node handbook/capture_screens.js

# 3. HTML-Handbücher bauen:
python3 handbook/build_handbooks.py

# 4. Zu PDF rendern:
node handbook/render_pdfs.js
```

Ergebnis liegt in `handbook/dist/` (nicht versioniert – siehe `.gitignore`):
`handbook_<plattform>.html` und `MyWorkOut_Handbuch_<plattform>.pdf`.

## Struktur

```
handbook/
  capture_screens.js   Screenshots der laufenden App (Playwright)
  screenshots/          Zuletzt aufgenommene Screenshots (versioniert)
  build_handbooks.py    HTML-Vorlage + Inhalte je Plattform
  render_pdfs.js         HTML → PDF (Playwright print-to-PDF)
  dist/                  Generierte HTML/PDF-Ausgabe (gitignored)
```

Bei Änderungen an App-Design oder -Funktionen: Screenshots neu aufnehmen und
alle drei Schritte erneut ausführen, statt `dist/` von Hand zu bearbeiten.
