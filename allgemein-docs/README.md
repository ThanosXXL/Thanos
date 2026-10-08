# Allgemein Docs

Moderne, einfache Praxisverwaltung für die Allgemeinmedizin – Desktop-App (Windows, macOS, Linux).
Navy-blaues Design, weiße Schrift in der humanistischen Schrift *Open Sans*, großes Seitenmenü, Beispielbilder und Animationen.

## Funktionen

- **Start** – Tagesüberblick mit animierten Kennzahlen, Terminen von heute, Schnellzugriff
- **Patienten** – Akte mit Stammdaten, Diagnosen (ICD-10), Medikation, Karteikarte mit Textbausteinen, Bilder & Befunde (Upload möglich)
- **Terminkalender** – Wochenleiste, Tagesplan in 30-Minuten-Slots, Status „Eingetroffen“
- **Wartezimmer** – Wartezeit in Minuten, Patienten aufrufen
- **Aufgaben** – einfache To-do-Liste
- **Dokumente** – Rezept, AU, Überweisung, Attest, Befundbrief; Platzhalter werden automatisch gefüllt, Druckfunktion, eigene Vorlagen
- **Globale Suche** – `Strg K`
- **Datensicherung** – Export/Import als JSON

Alle Daten liegen lokal (`allgemein-docs-data.json` im Benutzerdatenordner). Die mitgelieferten Patienten sind frei erfundene Beispieldaten.

> Hinweis: Allgemein Docs ist ein eigenständiges Projekt und kein zertifiziertes Praxisverwaltungssystem (PVS). Es ersetzt weder KV-Anbindung, TI/ePA noch Abrechnungssoftware.

## Starten

```bash
npm install
npm start       # Entwicklung
npm run dist    # Installer in dist/
```

Release über Git-Tag `allgemein-docs-v1.0.0` (siehe `.github/workflows/allgemein-docs-release.yml`).
