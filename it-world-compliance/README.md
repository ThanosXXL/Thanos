# IT-WORLD Compliance-Assistent

Bezahlbares Desktop-Werkzeug (Electron) für kleine und mittlere Unternehmen: **Checklisten, Nachweise und Fristen** für **NIS2**, **DSGVO** und **IT-Sicherheit** an einem Ort. Gestaltet im Schwarz/Gold-Look des IT-WORLD-Logos mit 3D-Hochglanz-Effekten. Läuft komplett offline, ohne Abo, ohne Cloud.

## Funktionen

**Regelwerke (57 Anforderungen mit Hilfetexten, Rechtsgrundlage und Nachweis-Tipps)**
- **NIS2** inkl. Betroffenheits-Check (Sektor, Größe → „besonders wichtig“ / „wichtig“ / nicht betroffen), **DSGVO**, **IT-Sicherheit**
- Je Anforderung: Status, Verantwortliche/r, Fälligkeit, Wiedervorlage (quartalsweise bis jährlich), Nachweis-Beschreibung, verknüpfte Nachweis-Datei, Notizen; Nachweisquote und Warnung bei „erledigt ohne Nachweis“

**Register**
- **Verarbeitungsverzeichnis** (Art. 30) mit 7 Branchenvorlagen · **Dienstleister & AV-Verträge** (Art. 28, NIS2-Lieferkette) · **Betroffenenanfragen** mit automatischer Monatsfrist (Art. 12) · **Schulungen & Nachweise**

**Fristen & Betrieb**
- **Fristenkalender** aus allen Bereichen, Export als `.ics` (Outlook, Google, Apple) inkl. Erinnerung
- **Vorfälle & Meldefristen** (NIS2: 24 h / 72 h / 1 Monat, DSGVO: 72 h) als Live-Countdown
- **11 Dokumentvorlagen**: BSI-Meldungen, Art. 33/34-Meldungen, Auskunftsantwort, Verpflichtung, AVV-Checkliste, Leitlinie, Incident-Plan, Passwort-Richtlinie, Löschkonzept
- **Änderungsprotokoll** als SHA-256-Hash-Kette (Manipulationen werden erkannt)
- **Compliance-Bericht** als PDF/HTML mit Logo, Registern, Vorfällen und Protokoll; Datensicherung (bei aktivem Passwort verschlüsselt)

**Bedienung:** gruppierte Navigation, natives Menü (Datei · Bearbeiten · Gehe zu · Ansicht · Hilfe), Schnellsuche `Strg/⌘ + K`, Tastenkürzel `Strg/⌘ + 1…9`.

## Starten

```bash
npm install
npm start        # Entwicklung
npm run dist     # Installer (Windows nsis, macOS dmg, Linux AppImage) nach dist/
```

Release-Builds: `.github/workflows/it-world-compliance-release.yml` (Tag-Präfix `it-world-compliance-v*`), mit `npm ci` und `SHA256SUMS.txt` zur Prüfung der Installer.

## Sicherheit & Datenschutz (DSGVO)

- **Offline-by-Design:** Jede Netzwerkanfrage wird blockiert, DNS abgeschaltet, keine Telemetrie, kein Auto-Updater, keine Konten. IT-WORLD erhält keine Daten.
- **Verschlüsselung (Art. 32):** optional AES-256-GCM mit scrypt (N=2¹⁶), steigende Wartezeit bei Fehlversuchen, Auto-Sperre bei Inaktivität sowie bei Bildschirmsperre/Ruhezustand des Betriebssystems; auch die Datensicherung wird verschlüsselt.
- **Abwehr von Angriffen:** Chromium-Sandbox, `contextIsolation`, eigenes `app://`-Protokoll statt `file://` (kein Pfad-Traversal), strenge CSP mit Trusted Types und `frame-ancestors 'none'`, keine Popups/Webviews/Navigation, alle Berechtigungsanfragen abgelehnt, Einzelinstanz.
- **Geprüfte IPC-Schnittstelle:** Aufrufe nur von der eigenen Oberfläche; jede Eingabe (auch importierte Sicherungen) wird per Whitelist in ein neues Objekt überführt (Typen, Längen, Katalog-IDs, Steuer-/Bidi-Zeichen entfernt, Prototype-Pollution ausgeschlossen).
- **Sichere Dateien:** atomares Schreiben mit fsync, Rechte `0600`, Sicherungskopie, beschädigte Dateien werden zur Seite gelegt; „Alle Daten sicher löschen“ überschreibt Datei und Kopien (Best Effort).
- **Nachweisdateien** nur als Pfad verknüpft, nie ausgeführt, Netzwerkpfade (UNC) werden nicht aufgelöst. Berichte werden maskiert, PDFs ohne JavaScript erzeugt, Temp-Dateien überschrieben.
- **Ausgelieferte Binärdatei:** Electron-Fuses (kein `RunAsNode`, keine `--inspect`/`NODE_OPTIONS`, asar-Integritätsprüfung, nur Code aus asar, kein `file://`-Sonderrecht, Cookie-Verschlüsselung), macOS Hardened Runtime.
- In der App unter „Sicherheit & Datenschutz“ gibt es eine fertige **Datenschutzbeschreibung** zur Übernahme in das eigene Verarbeitungsverzeichnis und die TOM-Dokumentation.

## Hinweis

Der Katalog und die Betroffenheits-Einstufung sind eine Orientierungshilfe nach bestem Stand (NIS2-Umsetzungsgesetz/BSIG, DSGVO/BDSG, BSI-Grundschutz, CIS Controls) und ersetzen keine Rechtsberatung oder Zertifizierung. Gesetzliche Fristen und Paragrafen bitte vor verbindlicher Nutzung rechtlich prüfen lassen.

Schrift: Open Sans (SIL Open Font License, siehe `renderer/fonts/OFL-LICENSE-OpenSans.txt`).
