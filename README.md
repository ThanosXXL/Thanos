# Music Heaven

Desktop-Musik-App (Electron) im Design "frisches Grün auf Schwarz". Music Heaven hat zwei Ordner:

1. **Ordner 1 – Hochgeladene Musik**: Eigene Musikdateien hochladen (MP3, WAV, OGG, M4A, FLAC).
   Zwei Tracks (oder gleich die ganze Bibliothek) auswählen und Music Heaven mixt sie
   **vollautomatisch** ineinander – entweder als **nahtloser Crossfade** oder als
   simulierter **Scratch-Übergang** (Pitch-/Tempo-Wobble mit Cut, wie beim DJ-Scratchen).
2. **Ordner 2 – Musikstücke selbst kreieren**: Eigenes Musikstück aus Equipment bauen –
   Drums (Kick, Snare, Hi-Hat, Open Hat, Clap), Piano, Saxophon, Bass,
   **EFX** (Riser, Downlifter, Impact, Noise Sweep, Reverse Cymbal), **Loops**
   (Drum Loop, Bass Loop, Perc Loop, Arp Loop) und **Vocals** mit acht wählbaren Stilen
   (Gesang, Einzelne Wörter, Chor, Rap/Soul, House/Electro, Jazz, Pop, Hip Hop). Noten
   auswählen, Spuren zum Step-Sequencer hinzufügen, Pattern anklicken, Tempo einstellen.
   Alle Equipment-Pads haben einen glänzenden, gewölbten 3D-Tasten-Look (Hochglanz-Highlight,
   Tiefenschatten, die beim Klicken sichtbar "eindrücken").

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

## PWA – echte installierbare App für Android &amp; iOS

Da Electron nicht auf Mobilgeräten läuft, gibt es die Oberfläche zusätzlich als **PWA**
(Progressive Web App). Über den Browser lässt sie sich auf Android und iOS **installieren**
(eigenes App-Icon, Vollbild ohne Browserleiste, Offline-Start) – ganz ohne App Store, und mit
denselben Funktionen (Upload, Auto-Mix, Step-Sequencer, Aufnehmen, Speichern/Herunterladen).

Enthalten in `renderer/`:

- **`browser-demo.js`** – stellt `window.musicHeaven` bereit, falls kein Electron läuft: Uploads
  und gespeicherte Musikstücke landen in **IndexedDB** des Browsers, der Datei-Dialog nutzt
  `<input type="file">`, „Extern speichern unter…" löst einen Download (bzw. den nativen
  Speichern-Dialog, falls verfügbar) aus. In Electron tut diese Datei nichts.
- **`manifest.webmanifest`** – Name, Icons, Theme-Farbe (`#1fdb6f`, frisches Grün), Hintergrund
  (`#050a07`, Schwarz), Start im Vollbildmodus (`display: standalone`).
- **`sw.js`** – Service Worker: cached die App beim ersten Aufruf, damit sie auch offline bzw.
  bei wackliger Verbindung startet.
- **`icons/`** – App-Icons (192/512px, inkl. maskable-Variante für Android und Apple-Touch-Icon
  für iOS), generiert mit `scripts/generate-icons.js`.
- **`pwa-register.js`** – registriert den Service Worker nur im echten Browser (in Electron
  passiert nichts).

**Installieren:**

1. Lokal testen: `npm run serve` und `http://localhost:4173` öffnen.
2. Für eine echte Installation auf dem Smartphone wird eine **HTTPS-URL** benötigt (auf dem
   eigenen Gerät reicht `localhost` nicht). Dafür liegt der Workflow
   `.github/workflows/pages.yml` bereit, der `renderer/` auf **GitHub Pages** veröffentlicht
   (manuell auslösbar über den Tab **Actions → PWA auf GitHub Pages veröffentlichen → Run workflow**,
   oder automatisch bei Push auf diesen Branch). Danach die angezeigte `https://…github.io/…`-URL
   auf dem Smartphone öffnen:
   - **Android (Chrome):** Menü → „App installieren" / „Zum Startbildschirm hinzufügen".
   - **iOS (Safari):** Teilen-Symbol → „Zum Home-Bildschirm".

> Sobald dieser Branch in `main` gemerged ist, sollte der `push`-Trigger in `pages.yml` von
> diesem Feature-Branch auf `main` umgestellt werden.

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

## Nutzerhandbuch als PDF erzeugen

```bash
npm run handbook
```

`scripts/create-pdf.js` baut ein Nutzerhandbuch im Music-Heaven-Farbschema (frisches Grün auf
Schwarz) mit 3D-Beispielbildern der beiden Ordner und der Bibliothek. Das Skript erzeugt zunächst
eine HTML-Datei und rendert sie über einen vorhandenen Chromium/Chrome/Edge headless zu
`Music-Heaven-Handbuch.pdf`. Ist kein Browser vorhanden, bleibt die HTML-Datei erhalten und kann
manuell über „Drucken → Als PDF speichern" exportiert werden. Jede Seite trägt unten die
Copyright-Zeile `© {Jahr} Music Heaven – Alle Rechte vorbehalten. · Erstellt am {Datum}` – dasselbe
Format wie bei früheren Handbüchern in diesem Repository.
