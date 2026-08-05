# Praxis Dashboard

Eigenständige Electron-Desktop-App zur Verwaltung von Patientenakten (Praxisverwaltung) im
Blau-Weiß-3D-Hochglanz-Stil. Sie ist unabhängig vom **Dozenten Dashboard** in diesem Repository
(eigene `package.json`, eigener `main.js`/`preload.js`/`renderer/`, eigene Datenablage) und wird
nicht von dessen `npm install`/`npm start`/`npm run dist`-Befehlen berührt.

## Funktionsumfang

- Patientenliste mit Suche, Anlegen, Bearbeiten und Entfernen von Patienten
- Stammdaten je Patient (Name, Geburtsdatum, Geschlecht, Krankenkasse, Versichertennummer)
- Chronologisches Verlauf-/Journal (Anamnese, Befund, Diagnose, Therapie, Kontrolle, Sonstiges)
- Rezepte, Termine, Briefe und Laborwerte je Patient

Alle Beispieldaten sind frei erfunden. Es werden keine echten Patientendaten mitgeliefert.

## Installation & Start

```bash
cd praxis-dashboard
npm install
npm start
```

## Desktop-Anwendung bauen

```bash
cd praxis-dashboard
npm run dist
```

## Architektur

Gleiches Muster wie das Dozenten Dashboard: `contextIsolation: true`, `nodeIntegration: false`.

- **`main.js`** — erstellt das `BrowserWindow` und persistiert den gesamten State als JSON unter
  `app.getPath('userData')/praxis-data.json` via die IPC-Handler `load-data`/`save-data`.
- **`preload.js`** — exponiert `window.praxisAPI` (`loadData()`, `saveData(data)`) als einzige
  Brücke zum Renderer.
- **`renderer/`** — komplette UI als Vanilla-JS-IIFE (`renderer.js`), statisches HTML-Grundgerüst
  (`index.html`) und Styling (`style.css`). Zustand liegt in einem einzigen `state = { patients: [] }`;
  jede Änderung folgt dem Muster **State mutieren → `persist()` → `render()`**, ganz ohne
  inkrementelles DOM-Update.
