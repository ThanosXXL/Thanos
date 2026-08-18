# Pferde App

Eine eigenständige Web-App (eine einzige HTML-Datei) zur Verwaltung und Sicherung von bis zu
beliebig vielen Pferden: Chip-Registrierung, Foto-ID-Datenbank mit Abzeichen/Brandzeichen und
eine Alarmfunktion für den Fall eines Stalleinbruchs.

Design: Navy-Blau und Baby-Blau in glänzender 3D-/Hochglanz-Optik, Schrift durchgehend
schwarz und fett.

## 1-Klick-Nutzung (kein Terminal, keine Installation)

1. Die Datei **[`PferdeApp.html`](PferdeApp.html)** herunterladen (GitHub → „Raw“ → Rechtsklick →
   „Speichern unter“, oder direkt aus diesem Repository klonen/herunterladen).
2. Die Datei per Doppelklick öffnen.

Das funktioniert identisch auf **Windows, macOS, Linux, Android und iOS** — jedes moderne
Betriebssystem öffnet `.html`-Dateien direkt im Standardbrowser. Es wird kein `npm install`,
kein Server und keine App-Store-Installation benötigt.

Alle Daten (Pferde, Chip-Nummern, Fotos, Alarm-Log) werden ausschließlich lokal im Browser
gespeichert (`localStorage`) — es findet keine Übertragung an einen Server statt.

## Funktionen

- **Übersicht** — Kennzahlen und Liste aller registrierten Pferde.
- **Chip-Registrierung** — Pferd mit Name, Chip-/Transponder-Nummer, Rasse, Farbe,
  Geburtsdatum und Besitzer anlegen.
- **Foto-ID-Datenbank** — Fotos je Pferd hochladen sowie Abzeichen und Brandzeichen
  hinterlegen, zum schnellen Wiedererkennen im Fall eines Diebstahls.
- **Alarm / Sicherheit** — Stall-Alarm scharf/unscharf schalten, Testauslösung mit
  akustischem Signal, Bildschirm-Blinken, Vibration (mobil) und Browser-Benachrichtigung,
  sowie ein Ereignis-Log.

## Entwicklung

Es gibt keinen Build-Schritt, keinen Bundler und keine Abhängigkeiten — `PferdeApp.html`
enthält HTML, CSS und JavaScript in einer einzigen Datei. Änderungen werden verifiziert,
indem die Datei im Browser geöffnet wird.

---

Dieses Repository beherbergt außerdem ein zweites, unabhängiges Projekt: `omniroute/` ist ein
vendorter Snapshot von [OmniRoute](https://github.com/diegosouzapw/OmniRoute) — siehe
`omniroute/CLAUDE.md` und `omniroute/VENDORED.md`.
