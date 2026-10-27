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

## Datenschutz, Sicherheit & Updates

- **Lokal & verschlüsselt:** Favoriten (unbegrenzt, Liste 1/2) und Routen liegen nur auf dem Gerät – Desktop über den Schlüsselbund des Betriebssystems verschlüsselt (`safeStorage`, Dateirechte `0600`, Sicherungskopie), Browser/Android optional per Passwort (AES-256).
- **Keine Telemetrie, keine Konten, keine Cookies.** Externe Dienste werden nur nach Information/Zustimmung angesprochen (Adresssuche, Live-Optionen, Karten-App, Update-Suche) – Übersicht in der App unter „Info → Datenschutz & Sicherheit“.
- **Betroffenenrechte** direkt in der App: Daten sichern (Portabilität), Alle Daten löschen, Zustimmungen widerrufen.
- **Härtung:** Sandbox, strenge CSP mit Trusted Types, geprüfte IPC, Link-Allowlist, Electron-Fuses, Einzelinstanz, begrenzte/bereinigte Dienstantworten – Details und Grenzen in `SECURITY.md`, Maßnahmenliste und Datenschutz-Entwurf in `docs/Datenschutz-und-Sicherheit.md`.
- **Automatische Updates:** Die Desktop-App sucht bei **jedem Start** (nach 3 s, danach alle 4 Stunden) nach neuen Versionen und lädt sie im Hintergrund (SHA-512-geprüft). Ist ein Update in den ersten 90 Sekunden nach dem Start bereit, wird es **sofort eingespielt** und die App startet automatisch neu (pro Version höchstens ein automatischer Versuch am Tag – keine Neustart-Schleife); später gefundene Updates werden beim Beenden bzw. per „Jetzt neu starten“ installiert. Quelle: Release `my-route-updates` (wird bei jedem `my-route-v*`-Tag aktualisiert). Abschaltbar in der App. Browser/Android zeigen einen Hinweis mit Link zur neuen Version.
- **Prüfen:** `npm run check` (Quellcode-Sicherheitsprüfung), `npm test` (Speicher/Verschlüsselung/Prüfungen).

Schrift: Open Sans (SIL OFL, siehe `renderer/assets/fonts/OFL-LICENSE-OpenSans.txt`).
