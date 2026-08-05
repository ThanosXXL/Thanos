# PatientenWelt

Eigenständige Electron-Desktop-App zur Verwaltung von Patientenakten (Praxisverwaltung) im
Blau-Weiß-3D-Hochglanz-Stil, inklusive Hochglanz-3D-Schrift (verchromter Farbverlauf-Text) für
Markenname, Überschriften, Patientennamen-Banner und aktive Tabs. Sie ist unabhängig vom
**Dozenten Dashboard** in diesem Repository (eigene `package.json`, eigener
`main.js`/`preload.js`/`renderer/`, eigene Datenablage) und wird nicht von dessen
`npm install`/`npm start`/`npm run dist`-Befehlen berührt.

## Funktionsumfang

- Symbolleiste mit Hochglanz-3D-Icon-Buttons (Patient wählen, Neuer Patient, Suche, Termine,
  Briefe, Laborwerte, Drucken, Neu laden)
- Übersicht mit Kennzahlen-Kacheln (Patienten gesamt, anstehende Termine, Verlaufseinträge)
- Patientenliste mit Suche, sortierbaren Spalten, Anlegen, Bearbeiten und Entfernen von Patienten
- Stammdaten je Patient (Name, Geburtsdatum, Geschlecht, Krankenkasse, Versichertennummer)
- Chronologisches Verlauf-/Journal (Anamnese, Befund, Diagnose, Therapie, Kontrolle, Sonstiges)
- Rezepte, Termine, Briefe und Laborwerte je Patient
- **Kalender** je Patient: Jahresansicht für das aktuelle und das folgende Jahr, Tag anklicken
  trägt einen neuen Termin für dieses Datum ein; Tage mit bestehenden Terminen sind hervorgehoben
- Umfangreiche Seitenleiste analog zur Referenz-Praxissoftware (Praxisgebühr, Registrierung,
  Formulare, Warteliste, Abrechnung, Auswertung, Patientenverwaltung usw.); Menüpunkte ohne
  hinterlegte Funktion zeigen bewusst einen ehrlichen "noch nicht verfügbar"-Hinweis statt totem UI
- Bedienkomfort: Enter speichert/bestätigt das offene Formular, Escape schließt es

Alle Beispieldaten sind frei erfunden. Es werden keine echten Patientendaten mitgeliefert.

## Installation & Start

```bash
cd patientenwelt
npm install
npm start
```

## Desktop-Anwendung bauen

```bash
cd patientenwelt
npm run dist
```

## Architektur

Gleiches Muster wie das Dozenten Dashboard: `contextIsolation: true`, `nodeIntegration: false`.

- **`main.js`** — erstellt das `BrowserWindow` und persistiert den gesamten State als JSON unter
  `app.getPath('userData')/patientenwelt-data.json` via die IPC-Handler `load-data`/`save-data`.
- **`preload.js`** — exponiert `window.patientenweltAPI` (`loadData()`, `saveData(data)`) als
  einzige Brücke zum Renderer.
- **`renderer/`** — komplette UI als Vanilla-JS-IIFE (`renderer.js`), statisches HTML-Grundgerüst
  (`index.html`) und Styling (`style.css`). Zustand liegt in einem einzigen `state = { patients: [] }`;
  jede Änderung folgt dem Muster **State mutieren → `persist()` → `render()`**, ganz ohne
  inkrementelles DOM-Update.

### Hochglanz-3D-Schrift

`style.css` definiert Utility-Klassen `.text-glossy-dark` (verchromter, heller Text auf dunkelblauen
Flächen wie Kopfleiste und Patienten-Banner) und `.text-glossy-blue` (verchromter, blauer Text auf
weißen Flächen wie Panel-Überschriften). Beide nutzen einen Farbverlauf als Textfüllung
(`background-clip: text` + `-webkit-text-fill-color: transparent`), **bewusst ohne** `text-shadow`
oder `filter: drop-shadow(...)` — diese Kombination führt in dieser Chromium-Engine nachweislich zu
verwaschenem Doppel-Rendering des Textes. Für den aktiven Tab liegt der Effekt auf einem inneren
`<span class="tab-label">`, nicht auf dem `<button>` selbst, damit das eigene `background`-Shorthand
des Buttons (für die Tab-Hervorhebung) das Text-Clipping nicht überschreibt — bei neuen
Glanztext-Stellen dasselbe Muster verwenden, falls das Element selbst schon einen Hintergrund per
`background`-Shorthand setzt.

### Seitenleiste: echte Funktionen vs. Platzhalter

`renderer.js` unterscheidet zwei Arten von Seitenleisten-Einträgen: fest verdrahtete Funktionen
(Patient wählen/erfassen/ändern, Verlauf, Rezepte, Laborwerte, Termine, Kalender, Briefe) und
`PLACEHOLDER_GROUPS` — Menüpunkte, die es in der Referenz-Praxissoftware gibt, für die diese App
aber keine Funktion hinterlegt. Ein Klick darauf setzt `ui.viewMode = 'placeholder'` und zeigt
`renderPlaceholderView()`. Neue echte Funktionen sollten aus `PLACEHOLDER_GROUPS` entfernt und als
eigener Tab/eigenes Panel verdrahtet werden, statt den Platzhalter-Mechanismus zu missbrauchen.
