[![Dozenten Dashboard](https://img.shields.io/badge/📋_Dozenten_Dashboard-0b1f4d?style=for-the-badge)](../README.md)
[![IT-Schulung Dashboard](https://img.shields.io/badge/💻_IT--Schulung_Dashboard-5b9bd5?style=for-the-badge)](README.md)

# IT-Schulung Dashboard

Desktop-Dashboard (Electron) zur Verwaltung von bis zu vier IT-Schulungen. Jede Schulung hat drei Listen:

1. **Liste 1 – To-Do-Liste** (Aufgabenliste)
2. **Liste 2 – Offene Themen**
3. **Liste 3 – Abgeschlossene Themen**

Themen lassen sich per Klick von "Offene Themen" nach "Abgeschlossene Themen" verschieben (und zurück).
Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem Neustart erhalten.

Dies ist eine eigenständige App, komplett getrennt vom **[Dozenten Dashboard](../README.md)** im Wurzelverzeichnis dieses
Repositories (eigener Code, eigenes `package.json`, eigene Datendatei). Beide Apps teilen sich keine
Abhängigkeiten oder Build-Konfiguration.

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
