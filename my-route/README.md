# My Route

Routenplaner nach Favoriten von **IT - WORLD · IT SOLUTIONS**: Lieblingsorte speichern, daraus Routen
zusammenstellen und gespeicherte Routen mit einem Klick erneut anfahren – schwarz/gold, im 3D-Hochglanz-Stil mit Animationen.

## Plattformen

| Plattform | Weg |
|---|---|
| Windows / macOS (Intel + Apple Silicon) / Linux | Electron-Desktop-App (`npm run dist`, bzw. Release-Workflow) |
| Android / iOS / jeder Browser | `web/My-Route-Vollversion.html` – die komplette App als eine Datei (Doppelklick genügt) |

Native Android-/iOS-Apps gibt es hier nicht; mobil läuft die HTML-Vollversion (im Browser-Menü „Zum Startbildschirm“ legt sie wie eine App ab).

## Starten

```bash
npm install
npm start            # Desktop-App
npm run dist         # Installer nach dist/ (win: nsis, mac: dmg x64+arm64, linux: AppImage)
npm run build:web    # erzeugt web/My-Route-Vollversion.html und web/My-Route-Download.html
```

`web/My-Route-Download.html` ist die Kunden-Downloadseite: erkennt das Betriebssystem, bietet den Installer aus dem GitHub-Release
(`my-route-v<version>`) an und trägt die Browser-Vollversion selbst in sich (1-Klick-Download ohne Release).

## Funktionen

- **Favoriten**: Name, Adresse, optionale Koordinaten, Notiz, Symbol.
- **Routen**: Stopps aus Favoriten, Reihenfolge per ↑/↓, Verkehrsmittel, Start am aktuellen Standort.
- **Route fahren**: öffnet Google Maps (Standard), Apple Karten oder OpenStreetMap mit allen Zwischenstopps; bei mehr als 10 Stopps in Abschnitten.
- **Reihenfolge optimieren**: Nearest-Neighbour + 2-opt auf Basis der Luftlinie (erster Stopp bleibt Startpunkt).
- **Kartenvorschau**: schematisch und offline (SVG), mit Luftlinien-Entfernung.
- **Sichern/Einlesen** als JSON.

## Datenschutz (DSGVO)

Keine Konten, keine Telemetrie, kein Auto-Updater. Favoriten und Routen liegen lokal (`my-route-data.json` im Benutzerverzeichnis der App,
Rechte `0600`; in der Browser-Version im `localStorage`). Netzwerkzugriffe passieren nur auf ausdrücklichen Klick:
„Koordinaten zur Adresse finden“ sendet den Adresstext an Nominatim (OpenStreetMap); „Route fahren“ öffnet den gewählten Karten-Dienst
(in der Desktop-App nur `google.com`, `maps.apple.com`, `openstreetmap.org`). Löschen/Export: Favoriten und Routen lassen sich einzeln löschen
und über „Sichern“ exportieren.

Schrift: Open Sans (SIL OFL, siehe `renderer/assets/fonts/OFL-LICENSE-OpenSans.txt`).
