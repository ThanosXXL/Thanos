# CLAUDE.md — mc-akademie/

Diese Datei gilt für den Unterordner `mc-akademie/`. Er ist ein eigenständiges,
von der Dozenten-Dashboard-App und von `omniroute/` unabhängiges Projekt — siehe
die Root-`CLAUDE.md` für den Gesamtüberblick über das Repository.

## Überblick

Statische, animierte Marketing-Website für die **M&C Akademie** (Schulungen,
Unterweisungen, Sachkunde). Reines HTML/CSS/JS ohne Build-Schritt, ohne
Framework, ohne Abhängigkeiten — `index.html` direkt im Browser öffnen oder
lokal servieren (z. B. `npx serve mc-akademie`).

## Sprache — wichtig

**In diesem Projekt wird ausschließlich Deutsch verwendet** — nicht nur die
sichtbaren Website-Texte, sondern auch:

- alle Code-Kommentare in `index.html`, `css/style.css`, `js/main.js`
- Commit-Messages zu Änderungen in diesem Ordner
- der Chat mit dem Nutzer bei der Arbeit an diesem Projekt

Das gilt dauerhaft für alle zukünftigen Sessions, nicht nur für die aktuelle.

## Struktur

- `index.html` — gesamter Seiteninhalt (Hero, Veranstaltungsinformationen,
  Programme, Kontakt, Footer)
- `css/style.css` — Styling: 3D-Tilt-Karten, Glossy-/Glass-Effekte,
  animiertes Logo, Farbverläufe, responsives Layout
- `js/main.js` — Interaktionen: Scroll-Reveal, Zähler-Animationen,
  Maus-Parallax, 3D-Kartenneigung, mobiles Menü, Kontaktformular (öffnet
  `mailto:` — kein Backend)
- `assets/` — Logo (`logo.png`, freigestellt aus dem Original-Logo-Bild),
  Favicon, echtes Team-/Schulungsfoto (`team-photo.jpg`)

## Bekannte Stolperfallen (bereits behoben, beim Weiterbauen beachten)

- `.reveal`/`.reveal.in-view` (Scroll-Einblendung) und die 3D-Tilt-Karten
  (`.prog-card`, `.info-visual-inner`) setzen beide `transform` auf
  überlappenden Elementen. Bei gleicher/niedrigerer Spezifität gewinnt sonst
  eine Regel stillschweigend und die andere wird nie sichtbar — siehe die
  kombinierten `.prog-card.reveal` / `.prog-card.reveal.in-view`-Regeln in
  `style.css` als Muster für neue Elemente mit beiden Klassen.
- CSS-Animationen (`animation: ...`) überschreiben *immer* per JavaScript
  gesetzte Inline-`transform`-Werte auf derselben Eigenschaft, unabhängig von
  Spezifität. Für Maus-getriebene Effekte auf animierten Elementen (z. B. die
  schwebende Hero-Karte) die globalen `--px`/`--py`-Variablen direkt in den
  Keyframes referenzieren, statt einen separaten `mousemove`-Handler mit
  eigenem Inline-`transform` zu schreiben.

## Deployment

Der Branch `gh-pages` enthält einen automatisch generierten Snapshot dieses
Ordners direkt im Branch-Root (für GitHub Pages). Dort nichts von Hand
bearbeiten — Änderungen immer hier in `mc-akademie/` vornehmen und den
`gh-pages`-Branch neu erzeugen.
