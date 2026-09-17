# Schulungsunterlagen „Bau- und Projektmanagement" (M&C Akademie)

Vollständiger Satz an PDF-Schulungsunterlagen für die 6-tägige Kompaktschulung
„Bau- und Projektmanagement" (6 Tage à 9 Stunden, 54 Stunden gesamt). Alle
Dokumente tragen das M&C-Akademie-Logo in 3D-/Hochglanz-Optik oben auf jeder
Seite sowie eine fortlaufende Seitennummerierung unten mittig.

Dieser Ordner ist ein eigenständiges Content-Paket und unabhängig von der
Dozenten-Dashboard-App, `omniroute/` und `it-schulung/` im Repo — er teilt
keine Abhängigkeiten oder Build-Konfiguration mit diesen Projekten.

## Enthaltene PDF-Dateien (`pdf/`)

| Datei | Zielgruppe | Inhalt |
|---|---|---|
| `Teilnehmerhandbuch_Bau-und-Projektmanagement.pdf` | Teilnehmende | Vollständiges Handbuch zu allen 6 Schulungstagen: Lernziele, Zeitraster, Themeninhalte, Übungen. |
| `Dozentenhandbuch_Bau-und-Projektmanagement.pdf` | Nur Dozenten | Wie Teilnehmerhandbuch, zusätzlich mit didaktischen Hinweisen (Zeittakt, Methodik-Tipps) je Schulungstag. |
| `Schulungsfolien_Bau-und-Projektmanagement.pdf` | Präsentation | Foliensatz im Querformat, ein Kernthema pro Folie, für den Beamer-Einsatz im Kurs. |
| `Pruefungsfragen_Bau-und-Projektmanagement_Teilnehmerversion-interaktiv.pdf` | Teilnehmende | 5 Prüfungsfragen als interaktives PDF-Formular — Antwortoptionen sind direkt anklickbar (Radio-Buttons), **ohne** Lösungen. Zum Herunterladen und Ausfüllen am Bildschirm. |
| `Pruefungsfragen_Bau-und-Projektmanagement_Dozentenversion-mit-Loesungen.pdf` | **Nur Dozenten** | Identische 5 Fragen, richtige Antwort grün markiert, inkl. Erläuterung je Frage. Nicht an Teilnehmende weitergeben. |

## Aufbau der Schulung

6 Tage, jeweils 09:00–18:00 Uhr (9 Zeitstunden inkl. Pausen):

1. Grundlagen des Bau- und Projektmanagements
2. Bauplanung, Ausschreibung und Vergabe
3. Terminplanung und Ablaufsteuerung
4. Kostenmanagement und Controlling
5. Qualitätsmanagement, Arbeitssicherheit und Baurecht
6. Kommunikation, Praxissimulation und Abschlussprüfung

## Quellen neu generieren (`src/`)

Die PDFs werden aus den Skripten in `src/` erzeugt (HTML/CSS gerendert über
Chromium mit Playwright für Handbücher/Folien, PDF-Formularfelder über
`pdf-lib` für die interaktiven Prüfungsfragen). Inhalte (Curriculum,
Lernziele, Prüfungsfragen) liegen zentral in `src/content.js` — Änderungen
dort wirken sich auf alle Dokumente aus.

```bash
cd schulungen/bau-projektmanagement/src
npm install
npm run logo         # optional: 3D-/Hochglanz-Logo aus assets/logo-original.jpg neu erzeugen
npm run build:all    # erzeugt alle 5 PDFs neu in ../pdf/
```

Voraussetzung: ein lokal installierter bzw. von Playwright heruntergeladener
Chromium-Browser (`npx playwright install chromium`, falls kein
vorinstalliertes Chromium unter `PLAYWRIGHT_BROWSERS_PATH` verfügbar ist).
