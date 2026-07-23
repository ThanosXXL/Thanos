# Music Heaven

Desktop-Musik-App (Electron) im Design "frisches Grün auf Schwarz". Music Heaven hat zwei Ordner:

1. **Ordner 1 – Hochgeladene Musik**: Eigene Musikdateien hochladen (MP3, WAV, OGG, M4A, FLAC).
   Zwei Tracks (oder gleich die ganze Bibliothek) auswählen und Music Heaven mixt sie
   **vollautomatisch** ineinander – entweder als **nahtloser Crossfade** oder als
   simulierter **Scratch-Übergang** (Pitch-/Tempo-Wobble mit Cut, wie beim DJ-Scratchen).
2. **Ordner 2 – Musikstücke selbst kreieren**: Eigenes Musikstück aus Equipment bauen –
   Drums (Kick, Snare, Hi-Hat, Open Hat, Clap), Piano, Saxophon, Vocals und Bass. Noten
   auswählen, Spuren zum Step-Sequencer hinzufügen, Pattern anklicken, Tempo einstellen.

Alle Sounds von Ordner 2 werden per Web Audio API live synthetisiert (kein externes
Sample-Material nötig).

## Abhören vor dem Speichern

Beide Ordner haben denselben Ablauf:

- **▶ Abhören & aufnehmen** spielt den Mix bzw. das Musikstück ab und nimmt genau diese
  Wiedergabe gleichzeitig auf.
- Danach lässt sich das Ergebnis:
  - **in Music Heaven speichern** (interne Bibliothek, sichtbar am Ende der App), oder
  - **extern speichern unter…** (freie Ordnerauswahl über den nativen Speichern-Dialog), oder
  - **verwerfen**, um es neu abzumischen/aufzunehmen.

## Fertigen Installer herunterladen (ohne Terminal)

Unter **[Releases](../../releases)** stehen fertig gebaute Installationsdateien zum Anklicken bereit:

- Windows: `.exe` (Installer)
- macOS: `.dmg`
- Linux: `.AppImage`

Einfach die passende Datei für dein Betriebssystem herunterladen und ausführen – kein `npm install`,
kein Terminal nötig.

Neue Installer werden automatisch von GitHub Actions gebaut, sobald ein neuer Versions-Tag
(z. B. `v1.0.0`) gepusht wird, oder manuell über den Button **"Run workflow"** im Tab
**Actions → Build & Release Desktop App**.

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
