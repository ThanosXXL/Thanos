# Schulungsunterlagen „Bau & Projektmanagement" (M&C Akademie)

Vollständiger Satz an PDF-Schulungsunterlagen für die 6-tägige Kompaktschulung
„Bau & Projektmanagement" (6 Tage à 9 Stunden, 54 Stunden gesamt). Alle
Dokumente tragen das M&C-Akademie-Logo in 3D-/Hochglanz-Optik oben auf jeder
Seite, eine fortlaufende Seitennummerierung unten mittig, die humanistische,
runde Schriftart **Nunito** (statt eines nüchternen Systemfonts) sowie selbst
gestaltete Beispielbilder/Icons zu jedem Themenblock.

Dieser Ordner ist ein eigenständiges Content-Paket und unabhängig von der
Dozenten-Dashboard-App, `omniroute/` und `it-schulung/` im Repo — er teilt
keine Abhängigkeiten oder Build-Konfiguration mit diesen Projekten.

## Enthaltene PDF-Dateien (`pdf/`)

| Datei | Zielgruppe | Inhalt |
|---|---|---|
| `Kursbeschreibung.pdf` | Interessenten/Anmeldung | Zielgruppe, Voraussetzungen, Kursinhalte im Überblick, Nutzen, Methodik, Prüfung & Zertifikat, enthaltene Unterlagen. |
| `Teilnehmerhandbuch.pdf` | Teilnehmende | Vollständiges Handbuch zu allen 6 Schulungstagen: Lernziele, Zeitraster, Themeninhalte, Übungen. |
| `Dozentenhandbuch.pdf` | Nur Dozenten | Wie Teilnehmerhandbuch, zusätzlich mit didaktischen Hinweisen (Zeittakt, Methodik-Tipps) je Schulungstag. |
| `Schulungsfolien.pdf` | Präsentation | Foliensatz im Querformat, ein Kernthema pro Folie, für den Beamer-Einsatz im Kurs. |
| `Pruefungsfragen.pdf` | Teilnehmende | 5 Prüfungsfragen als interaktives PDF-Formular — Antwortoptionen sind direkt anklickbar (Radio-Buttons), **ohne** Lösungen. Zum Herunterladen und Ausfüllen am Bildschirm. |
| `Pruefungsfragen_Loesungen_Dozenten.pdf` | **Nur Dozenten** | Identische 5 Fragen, richtige Antwort grün markiert, inkl. Erläuterung je Frage. Nicht an Teilnehmende weitergeben. |
| `Teilnehmerliste.pdf` | Organisation | Ausfüllbares Formular zum Eintragen aller Teilnehmenden (Name, Firma, E-Mail je Person direkt am Bildschirm ausfüllbar) plus Unterschriftenspalten Tag 1–6 als Anwesenheitsnachweis. Reicht für bis zu 32 Personen (2 Seiten à 16 Zeilen). |

## Aufbau der Schulung

6 Tage, jeweils 09:00–18:00 Uhr (9 Zeitstunden inkl. Pausen):

1. Grundlagen des Bau & Projektmanagements
2. Bauplanung, Ausschreibung und Vergabe
3. Terminplanung und Ablaufsteuerung
4. Kostenmanagement und Controlling
5. Qualitätsmanagement, Arbeitssicherheit und Baurecht
6. Kommunikation, Praxissimulation und Abschlussprüfung

Jedem Tag ist ein selbst gestaltetes Flat-Design-Icon zugeordnet (Organigramm,
Ausschreibung, Terminplanung, Kosten, Sicherheit, Kommunikation), das im
Teilnehmer-/Dozentenhandbuch, in den Schulungsfolien und in der
Kursbeschreibung als Beispielbild erscheint.

## Quellen neu generieren (`src/`)

Die PDFs werden aus den Skripten in `src/` erzeugt (HTML/CSS gerendert über
Chromium mit Playwright für Kursbeschreibung, Handbücher und Folien,
PDF-Formularfelder über `pdf-lib` + `@pdf-lib/fontkit` für die interaktiven
Prüfungsfragen und die Teilnehmerliste). Inhalte (Curriculum, Lernziele,
Prüfungsfragen, Kursbeschreibungstexte) liegen zentral in `src/content.js` —
Änderungen dort wirken sich auf alle Dokumente aus. Die Beispielbilder sind
selbst gezeichnete SVG-Icons (`src/svg-icons.js`), keine Stockfotos — es
entstehen keine Lizenzfragen.

```bash
cd schulungen/bau-projektmanagement/src
npm install
npm run logo         # optional: 3D-/Hochglanz-Logo aus assets/logo-original.jpg neu erzeugen
npm run icons        # optional: Beispielbilder/Icons aus svg-icons.js neu rendern
npm run build:all    # erzeugt alle 7 PDFs neu in ../pdf/
```

Voraussetzung: ein lokal installierter bzw. von Playwright heruntergeladener
Chromium-Browser (`npx playwright install chromium`, falls kein
vorinstalliertes Chromium unter `PLAYWRIGHT_BROWSERS_PATH` verfügbar ist).

Die Schriftdateien in `src/assets/fonts/` sind statische Schnitte (Regular,
SemiBold, Bold, ExtraBold, Italic) der freien Google-Schrift **Nunito**
(SIL Open Font License), erzeugt aus der variablen Originaldatei mit
`fonttools varLib.instancer`.
