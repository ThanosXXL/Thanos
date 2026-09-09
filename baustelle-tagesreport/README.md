# Baustelle Tagesreport

Eigenständige Desktop-App (Electron) für den täglichen Baustellenreport. Kein Bezug zum
Dozenten-Dashboard in diesem Repository – eigene Codebasis, eigener Prozess, eigene Datenablage.

## Funktionen

- **Tagesreport**: Tageseinträge (Bautagebuch, Wetter, Besonderheiten) mit Wochen-/Monatskalender,
  automatisches Speichern (Autosave)
- **Status**: Bauabschnitt sowie Wochen-/Monatsziel per Regler
- **Bestellstatus**: Materialbestellungen mit Status "Ausstehend"/"Geliefert"
- **Screenshots**: Fotos/Screenshots pro Baustelle (client-seitig verkleinert)
- **Reminder**: Hinweis ab 12:00 Uhr, solange der Tagesreport des Tages noch nicht ausgefüllt ist

Alle Daten werden lokal im Benutzerdatenverzeichnis der App gespeichert (`tagesreport-data.json`) und
bleiben nach dem Neustart erhalten.

## Installation (für Entwicklung)

```bash
npm install
```

## Starten (Entwicklung)

```bash
npm start
```

## Desktop-Anwendung bauen

```bash
npm run dist
```

Erzeugt eine installierbare Desktop-Anwendung (Windows/macOS/Linux) im Ordner `dist/`.
