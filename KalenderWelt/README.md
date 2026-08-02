# KalenderWelt

KalenderWelt ist eine plattformübergreifende App (Windows, macOS, Linux, Android,
iOS) mit drei Bereichen: Kalender/Live, E-Mail(s) und Word-Dateien erstellen &
teilen. Design: hellgrün, schwarze Schrift, 3D-Stil, Hochglanz.

## Aufbau

```
KalenderWelt/
├── app/       gemeinsamer Web-Code (HTML/CSS/vanilla JS, kein Build-Schritt)
├── desktop/   Electron-Wrapper für Windows/macOS/Linux
├── mobile/    Capacitor-Wrapper für Android/iOS
└── server/    IMAP/SMTP-Vermittlungsserver (Node/Express)
```

`app/` ist die einzige Quelle für UI-Code und -Logik. Sowohl der Desktop- als auch
der Mobile-Wrapper laden diesen Ordner unverändert (Desktop: relativer Dateipfad;
Mobile: `npx cap sync` kopiert ihn ins native Projekt). Der Kalender-Bereich und
die Word-Erstellung funktionieren komplett offline/lokal; nur der E-Mail-Bereich
braucht den Server aus `server/`.

## Bereiche

- **Kalender / Live** – Monatsübersicht für aktuelles und letztes Jahr, Termine
  anklicken/anlegen, täglicher Reminder ab 7 Uhr morgens bis ein Termin als
  erledigt markiert wird.
- **E-Mail(s)** – echtes IMAP/SMTP-Postfach über den Vermittlungsserver, inkl.
  Posteingang lesen und E-Mails (mit Anhang) senden.
- **Word-Dateien** – .docx-Dateien direkt im Browser erzeugen (Bibliothek
  `docx`, lokal eingebunden in `app/js/vendor/docx.js`) und an mehrere
  Empfänger per E-Mail (automatisch mit Anhang), WhatsApp oder SignalChat
  (Chat öffnet sich mit vorbereitetem Text, Datei muss dort manuell angehängt
  werden – beide Dienste bieten keine offizielle Automatisierung für
  Desktop-Dateiversand) teilen.
- **Copyright-Fußzeile** – auf jeder Ansicht sichtbar.

## Schnellstart (Desktop, zum Entwickeln/Testen)

```bash
cd server && npm install && npm start        # Vermittlungsserver, Port 4790
cd desktop && npm install && npm start        # Electron-App
```

Ohne laufenden Server funktionieren Kalender und Word-Datei-Erstellung normal;
nur der E-Mail-Bereich zeigt dann einen Verbindungsfehler.

## Mobile (Android/iOS)

Siehe `mobile/README.md`. iOS-Builds benötigen zwingend einen Mac mit Xcode.

## Verteilung (Installer)

```bash
cd desktop && npm run dist     # nsis (Win) / dmg (Mac) / AppImage (Linux)
```

## Sicherheit

- E-Mail-Zugangsdaten werden vom Server ausschließlich im Arbeitsspeicher
  gehalten (nie auf Platte geschrieben) und über ein Zufalls-Token pro Sitzung
  referenziert.
- In der Desktop-App wird das gespeicherte Postfach-Passwort zusätzlich über
  Electrons `safeStorage` (OS-Schlüsselbund) verschlüsselt, bevor es lokal in
  der JSON-Datei landet.
- Der Vermittlungsserver ist für den Betrieb im eigenen (lokalen oder privaten)
  Netz gedacht; für einen öffentlich erreichbaren Einsatz sollte er zusätzlich
  hinter HTTPS betrieben werden.
