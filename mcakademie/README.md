# M&C Akademie – Website-Vorlage

Statische Website-Vorlage (HTML/CSS/JS, keine Build-Tools nötig) für **M&C Akademie**,
passend zum Instagram-Auftritt `@mcakademiedo`. Dieser Ordner ist eigenständig und
unabhängig vom Dozenten-Dashboard und von `omniroute/` – siehe `/CLAUDE.md` im
Repo-Root für den Gesamtüberblick über dieses Repository.

## Struktur

```
mcakademie/
├── index.html        # Einseitige Vorlage: Hero, Über uns, Angebote, Instagram, Kontakt
├── css/style.css      # Styling inkl. Farbvariablen
├── js/main.js         # Mobile-Menü + Jahr im Footer
├── assets/logo.svg    # Nachgebautes Logo als Vektorgrafik
└── README.md
```

## Verwenden

`index.html` direkt im Browser öffnen (kein Server/Build-Schritt nötig) oder den
Ordner auf beliebigem Webspace/Hosting hochladen.

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

`assets/logo.svg` ist eine per Hand nachgebaute Vektorversion des Original-Logos
(schwarz-rotes Schwung-Oval mit dem Schriftzug „M&C AKADEMIE" und Pfeil-Unterstreichung),
da im Repository keine Originaldatei vorlag – nur ein im Chat geteiltes Bild. Als
SVG ist sie verlustfrei skalierbar und wird in Header, Hero und Über-uns-Bereich
eingesetzt. Sobald die Original-Logodatei verfügbar ist, kann sie einfach unter
`assets/logo.svg` (oder als `.png`, mit Anpassung der `<img src>`-Pfade) ersetzt
werden.

## Anpassen

- **Texte/Inhalte**: Platzhaltertexte in `index.html` (Über uns, Angebote, Kontaktdaten)
  durch echte Inhalte ersetzen.
- **Instagram-Link**: aktuell `https://instagram.com/mcakademiedo` – bei Bedarf
  in `index.html` (Hero, Instagram-Sektion, Footer) anpassen.
- **Farben**: nur die CSS-Variablen in `css/style.css` ändern, der Rest folgt automatisch.
