# M&C Akademie – Website

Statische, animierte Marketing-Website für die M&C Akademie (Schulungen, Unterweisungen, Sachkunde). Unabhängig vom Dozenten Dashboard und von `omniroute/` – siehe die Projekt-`CLAUDE.md` im Repo-Root.

## Struktur

- `index.html` – gesamter Seiteninhalt (Hero, Veranstaltungsinformationen, Programme, Kontakt, Footer)
- `css/style.css` – Styling: 3D-Tilt-Karten, Glossy-/Glass-Effekte, Farbverläufe, responsive Layout
- `js/main.js` – Interaktionen: Scroll-Reveal, Zähler-Animationen, Maus-Parallax, 3D-Kartenneigung, mobiles Menü, Kontaktformular (öffnet `mailto:` – kein Backend)

## Ansehen

Kein Build-Schritt nötig. Einfach `index.html` im Browser öffnen, oder lokal servieren, z. B.:

```bash
npx serve mc-akademie
```

## Anpassen

- Farben/Variablen: `:root` in `css/style.css` (`--red`, `--navy`, …)
- Inhalte/Texte: direkt in `index.html`
- Logo: Inline-SVG-Nachbau in `index.html` (`.brand-mark`) – bei Bedarf durch das Original-Logo (SVG/PNG) ersetzen
