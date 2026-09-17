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
Chat-/Notizen-Verlauf pro Auftrag. Jeder Auftrag hat außerdem eine Auftragsart (Hochzeit, Portrait, Event, ...),
ein Honorar-Feld und einen farbcodierten Zahlungsstatus (Offen/Angezahlt/Bezahlt). Alle Daten werden lokal
gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem Neustart erhalten.

### Medien: Bilder bearbeiten & Video erstellen

Jeder Auftrag hat einen eigenen Medien-Bereich:

- **Bilder importieren** – beliebig viele Fotos (JPG/PNG/WebP) von der Festplatte hinzufügen.
- **Bildbearbeitung** – Helligkeit, Kontrast, Sättigung und 90°-Drehung direkt im Canvas-Editor; die
  bearbeitete Version wird als neues Bild gespeichert, das Original bleibt erhalten.
- **Video erstellen** – ausgewählte Bilder als Diashow-Video (mit einstellbarer Sekundenzahl pro Bild)
  zusammenfügen, optional mit einer selbst gewählten Hintergrundmusik-Datei unterlegt (wird automatisch
  auf die exakte Videolänge geloopt/getrimmt). Fertige Videos lassen sich direkt abspielen oder im
  Dateimanager anzeigen.

Alle importierten/bearbeiteten Dateien und erzeugten Videos liegen lokal unter dem Benutzerdatenverzeichnis
der App (`fotonetz-media/<Auftrag>/...`) – nichts wird hochgeladen.

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
