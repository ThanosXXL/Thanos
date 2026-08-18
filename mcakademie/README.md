# M&C Akademie – Website-Vorlage

Statische Website-Vorlage (HTML/CSS/JS, keine Build-Tools nötig) für **M&C Akademie**,
passend zum Instagram-Auftritt `@mcakademiedo`. Dieser Ordner ist eigenständig und
unabhängig vom Dozenten-Dashboard und von `omniroute/` – siehe `/CLAUDE.md` im
Repo-Root für den Gesamtüberblick über dieses Repository.

## Struktur

```
mcakademie/
├── index.html        # Einseitige Vorlage: Logo/Hero, Über uns, Instagram
├── css/style.css      # Styling inkl. Farbvariablen
├── js/main.js         # Mobile-Menü + Jahr im Footer
├── assets/logo.png    # Original-Logo, freigestellt (transparenter Hintergrund)
├── build-standalone.py # Buendelt alles zu einer einzigen HTML-Datei (siehe unten)
└── README.md
```

## Verwenden

`index.html` direkt im Browser öffnen (kein Server/Build-Schritt nötig) oder den
Ordner auf beliebigem Webspace/Hosting hochladen.

## Als eine einzige Datei exportieren (für Download/Versand)

```bash
python3 mcakademie/build-standalone.py
```

Erzeugt `mcakademie/mcakademie-standalone.html` – eine einzelne, in sich
geschlossene HTML-Datei mit eingebettetem CSS, JS und Logo (als base64), ganz
ohne externe Dateien. Praktisch, um die fertige Seite als **eine** Datei zu
verschicken oder herunterzuladen (z. B. als Chat-Anhang), statt den ganzen
Ordner. Optional lässt sich ein anderer Zielpfad angeben:
`python3 mcakademie/build-standalone.py pfad/zur/datei.html`.

Für eine Live-Vorschau mit echtem Download-Button (über die
`window.claude.downloads`-Capability des Artifact-Viewers) wird derselbe
Bündelungs-Ansatz verwendet: das Ergebnis von `build-standalone.py` als
Payload in ein `<script type="text/plain">`-Element einbetten (literale
`</script`-Vorkommen vorher z. B. durch `@@MC_ENDSCRIPT@@` ersetzen und beim
Download wieder zurücktauschen) und per Button-Klick mit
`window.claude.downloads.save({ filename, data })` anbieten.

## Farben (aus dem Logo abgeleitet)

Definiert als CSS-Variablen in `css/style.css` (`:root`), damit sie an einer
zentralen Stelle angepasst werden können:

| Variable          | Wert      | Verwendung                          |
|--------------------|-----------|--------------------------------------|
| `--mc-red`         | `#e2101b` | Akzentfarbe, Buttons, Icons          |
| `--mc-red-dark`     | `#b30d15` | Hover-Zustand für rote Buttons       |
| `--mc-black`        | `#111111` | Text, Header, dunkle Flächen         |
| `--mc-white`        | `#ffffff` | Hintergrund, helle Flächen           |
| `--mc-gray-light`   | `#f4f4f4` | Sekundäre Flächen (z. B. Angebote)   |
| `--mc-gray`         | `#6b6b6b` | Fließtext/sekundärer Text            |

## Logo

`assets/logo.png` ist das Original-Logo (schwarz-rotes Schwung-Oval mit dem
Schriftzug „M&C AKADEMIE" und Pfeil-Unterstreichung), aus dem im Chat geteilten
Bild freigestellt (Hintergrund entfernt, transparenter PNG, 1400×542px). Es wird
genau einmal, groß, im Hero-Bereich eingesetzt. Zum Austauschen einfach
`assets/logo.png` ersetzen (Dateiname/Pfad beibehalten oder den `<img src>`-Pfad
in `index.html` anpassen).

## Anpassen

- **Texte/Inhalte**: Platzhaltertexte in `index.html` (Über uns) durch echte
  Inhalte ersetzen.
- **Instagram-Link**: aktuell `https://instagram.com/mcakademiedo` – bei Bedarf
  in `index.html` (Instagram-Sektion) anpassen.
- **Farben**: nur die CSS-Variablen in `css/style.css` ändern, der Rest folgt automatisch.
