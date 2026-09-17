# Anforderungen „Bau & Projektmanagement" (M&C Akademie)

Dieses Dokument hält die Anforderungen des Auftraggebers für dieses
Content-Paket dauerhaft fest, damit sie bei jeder weiteren Änderung als
verbindliche Referenz dienen — unabhängig vom Gesprächsverlauf.

## Ursprünglicher Auftrag (wörtlich)

> erstelle Bau & Projektmanagement PDF Datei mit dem Akademie Logo OBEN, 3d
> Stil und hochglanz Effekten. Seitenanzahl fortlaufend. hinzufügen unten in
> der Mitte. Teilnehmerhandbuch, Dozentenhandbuch, Schulungsfolien
> Schwerpunkt. Logo OBEN 3D Optik und Hochglanz Effekten. Prüfungsfragen
> erstellen seperat mit 5 fragen, Lösungen nur für Dozenten. Dauer 6 Tage
> jeweils 9 Stunden täglich und Prüfungsfragen zum Download anklicken der
> Antworten. alles PDF Dateien bitte

Daraus abgeleitete Kernanforderungen:

- Logo der M&C Akademie **oben** auf jeder Seite, in **3D-Optik mit
  Hochglanz-Effekt** (nicht das reine Originalbild).
- **Fortlaufende Seitennummerierung unten mittig** auf jeder Seite.
- Schwerpunkt-Dokumente: **Teilnehmerhandbuch**, **Dozentenhandbuch**,
  **Schulungsfolien**.
- **Prüfungsfragen als separates Dokument**, genau **5 Fragen**, **Lösungen
  ausschließlich in der Dozentenversion**.
- Schulungsdauer: **6 Tage à 9 Stunden** täglich (54 Stunden gesamt).
- Prüfungsfragen ursprünglich als **interaktives, anklickbares PDF** zum
  Herunterladen (Antwortoptionen per Klick auswählbar).
- **Alles als PDF-Dateien.**

## Nachträgliche Ergänzungen (chronologisch)

1. **Überschrift**: durchgängig „**Bau & Projektmanagement**" (mit
   Kaufmanns-Und), nicht „Bau- und Projektmanagement".
2. **Schriftart**: eine „menschliche"/humanistische Schriftart statt eines
   nüchternen Systemfonts wie Arial — umgesetzt mit **Nunito** (rund,
   freundlich), in allen Dokumenten eingebettet.
3. **Teilnehmer-PDF zum Eintragen der gesamten Teilnehmer**: ein
   ausfüllbares Formular, in das alle Teilnehmenden eingetragen werden
   können (`Teilnehmerliste.pdf`).
4. **Beispielbilder**: alle PDFs sollen Beispielbilder/Illustrationen
   enthalten (kein reiner Fließtext) — umgesetzt als selbst gezeichnete
   Flat-Design-Icons je Themenblock plus einer Cover-Illustration
   (Baustellen-Skyline).
5. **Kursbeschreibung**: zusätzliches Dokument mit Zielgruppe,
   Voraussetzungen, Kursinhalten im Überblick, Nutzen, Methodik, Prüfung &
   Zertifikat, enthaltenen Unterlagen (`Kursbeschreibung.pdf`).
6. **Einfache Dateinamen**: kurze, sprechende Dateinamen ohne
   Themen-Suffix in jeder Datei (`Teilnehmerhandbuch.pdf`,
   `Dozentenhandbuch.pdf`, `Schulungsfolien.pdf`, `Pruefungsfragen.pdf`,
   `Pruefungsfragen_Loesungen_Dozenten.pdf`, `Teilnehmerliste.pdf`).
7. **Prüfungsfragen zum Ausdrucken und Ankreuzen**: zusätzlich zur
   interaktiven Version eine **Druckversion** ohne Formularfelder, mit
   leeren Kästchen zum handschriftlichen Ankreuzen sowie Feldern für Name,
   Datum und Schulungstag (`Pruefungsfragen_Druckversion.pdf`).

## Aktueller Dokumentensatz (`pdf/`)

| Datei | Zweck |
|---|---|
| `Kursbeschreibung.pdf` | Werbe-/Infodokument für Interessenten |
| `Teilnehmerhandbuch.pdf` | Vollständiges Handbuch für Teilnehmende |
| `Dozentenhandbuch.pdf` | Wie oben, plus didaktische Hinweise (nur Dozenten) |
| `Schulungsfolien.pdf` | Foliensatz für den Kurs (Querformat) |
| `Pruefungsfragen.pdf` | Interaktives Formular, anklickbar, ohne Lösungen |
| `Pruefungsfragen_Druckversion.pdf` | Zum Ausdrucken, leere Kästchen zum Ankreuzen, ohne Lösungen |
| `Pruefungsfragen_Loesungen_Dozenten.pdf` | Wie interaktiv/Druck, aber mit markierten Lösungen (nur Dozenten) |
| `Teilnehmerliste.pdf` | Ausfüllbares Formular zum Eintragen aller Teilnehmenden |

## Verbindliche Gestaltungsregeln für alle Dokumente

- Logo oben, 3D-/Hochglanz-Optik (`src/assets/logo-3d-glossy.png`).
- Fortlaufende Seitennummerierung unten mittig.
- Schriftart: Nunito (`src/assets/fonts/`).
- Mindestens ein Beispielbild/Icon pro Themenblock bzw. Cover.
- Zentrale Inhalte (Curriculum, Prüfungsfragen, Kursbeschreibung) liegen in
  `src/content.js` — Änderungen dort wirken sich auf alle Dokumente aus.

## Arbeitsweise ab sofort

**Für alle weiteren Code-Änderungen an diesem Paket gilt: vorher beim
Auftraggeber nachfragen und erst nach Zustimmung fortfahren.** Diese Regel
gilt bis auf Widerruf durch den Auftraggeber.
