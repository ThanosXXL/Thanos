[![Dozenten Dashboard](https://img.shields.io/badge/📋_Dozenten_Dashboard-0b1f4d?style=for-the-badge)](../README.md)
[![IT-Schulung Dashboard](https://img.shields.io/badge/💻_IT--Schulung_Dashboard-5b9bd5?style=for-the-badge)](../it-schulung/README.md)
[![FotoNetz](https://img.shields.io/badge/📷_FotoNetz-3b82f6?style=for-the-badge)](README.md)

# FotoNetz

Desktop-Dashboard (Electron) für den Fotografen-Alltag: Verwaltung von bis zu sechs laufenden Aufträgen
(Hochzeiten, Shootings, Events ...). Jeder Auftrag hat Kunden- und Termin-Angaben, einen Galerie-/Liefer-Link,
Notizen sowie vier Listen:

1. **Liste 1 – To-Do-Liste** (Aufgabenliste)
2. **Liste 2 – Offene Bearbeitungen**
3. **Liste 3 – Fertige Bearbeitungen**
4. **Liste 4 – Referenzen** (Inspirations-Links, Moodboard-Stichworte)

Bearbeitungen lassen sich per Klick von "Offen" nach "Fertig" verschieben (und zurück). Dazu kommt ein
Chat-/Notizen-Verlauf pro Auftrag. Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App)
und bleiben nach dem Neustart erhalten.

Dies ist eine eigenständige App, komplett getrennt vom **[Dozenten Dashboard](../README.md)** und dem
**[IT-Schulung Dashboard](../it-schulung/README.md)** in diesem Repository (eigener Code, eigenes
`package.json`, eigene Datendatei). Keine der Apps teilt Abhängigkeiten oder Build-Konfiguration.

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
