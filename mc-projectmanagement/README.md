# M&C Projectmanagement – Website (Redesign)

Statische, animierte Website im 3D-/Hochglanz-Stil für `mc-projectmanagement.de`,
Teil der M&C Gruppe (M&C Holding GmbH mit den Marken M&C Projectmanagement,
M&C Baumanagement und M&C Akademie).

Reines HTML/CSS/JS ohne Build-Schritt und ohne Abhängigkeiten – lässt sich direkt
im Browser öffnen oder mit einem beliebigen statischen Webserver ausliefern.

## Ansehen

```bash
# Variante 1: Datei direkt im Browser öffnen
open index.html            # macOS
xdg-open index.html        # Linux

# Variante 2: lokaler Server (empfohlen, z. B. für saubere relative Pfade)
python3 -m http.server 8080
# dann im Browser: http://localhost:8080
```

## Struktur

```
mc-projectmanagement/
├── index.html          Seiteninhalt (eine Seite mit Anker-Navigation)
├── impressum.html      Impressum-Seite (nur E-Mail als Kontakt, siehe unten)
├── datenschutz.html    Datenschutz-Seite (aktuell Platzhalter, siehe unten)
├── css/style.css       3D-/Glas-/Hochglanz-Design, Animationen, Responsive Layout
├── js/script.js        Tilt-, Magnet- & Ripple-Effekte, Scroll-Reveal, Scroll-Fortschritt, Zähler, Ticker, Mobile-Nav
├── assets/favicon.svg  Favicon
└── assets/og-image.png Social-Media-Vorschaubild (1200×630, Open Graph/Twitter Card)
```

## Inhalte & offene Platzhalter

- **Logo-Leiste ganz oben**: 4 animierte, ovale 3D-/Hochglanz-Marken der M&C
  Gruppe (M&C Holding GmbH, M&C Projectmanagement, M&C Baumanagement,
  M&C Akademie) – inklusive Schriftzug innerhalb jedes Logos, im Stil der
  Original-Logos nachgebaut, da die echten Logo-Dateien nicht vorlagen.
  Bei Bedarf 1:1 durch die echten Logo-Grafiken ersetzbar.
- **„Unser Team“-Sektion**: zeigt das vollständige, echte Team von
  `mc-projectmanagement.de/team-1` als Karten-Grid (`.team-roster` /
  `.team-member-card`), 13 Personen: Madlen Golibersuch, Collin
  Golibersuch, Malte Kurm, Andrea Lejk, Rene Sangmeister, Murat Kyküz,
  Nordin Asrih, Adam Wujciow, Heiko Lerchner, Thorsten Heymann, Deni
  Cizmar, Joachim Melzer und Matthias Gornik. Mario Kähler wurde auf
  Wunsch bewusst nicht übernommen. Jede Karte hat einen echten
  **„Mehr erfahren“-Ausklapper** (`<details class="vita-toggle">`) mit
  den echten Vita-Daten von der Original-Seite: „Bei M&C … seit [Jahr]“,
  Aufgabenliste, ggf. Qualifikationen sowie persönliche E-Mail-Adresse.
  Da nur Fotos vom Bildschirm (kein echtes Bilddateien-Material) vorlagen,
  sind die Porträts weiterhin **Initialen-Avatare** (`.member-avatar`)
  statt echter Fotos – bitte durch echte Porträtbilder ersetzen, sobald
  Bilddateien vorliegen. Bei Murat Kyküz wurde die auf der Originalseite
  fehlerhafte E-Mail-Domain (`mc-prpjectmanagement.de`) zu
  `mc-projectmanagement.de` korrigiert. Weitere Mitglieder lassen sich in
  `index.html` (`.team-roster` in der `#team`-Sektion) als zusätzliche
  `<article class="tilt-card team-member-card">`-Blöcke nach demselben
  Muster ergänzen.
- **3D-Globus „Unser Netzwerk“**: reiner CSS-/SVG-Globus mit animierten
  Pfeilen zu den fünf echten, bestätigten Standorten: Dortmund (Sitz,
  gold hervorgehoben), München, Passau, Reit im Winkl und Viechtach (die
  drei letzteren laut Unternehmensangaben Referenzorte des Netzwerk-Partners
  MC Projektsteuerung / MC Generalbau, siehe „Referenzen“). Die zuvor
  erfundenen Städte (Berlin, Dubai, Singapur, New York) sowie der
  Textclaim „rund um den Globus“ wurden entfernt, da sie weder belegt
  waren noch zur angegebenen Vertraulichkeit bei Projektnamen passten.
- **Video Vorstellung**: Platzhalter-Videoplayer im 4-Panel-Look
  (M&C Holding/Baumanagement/Akademie/Projectmanagement, an das echte
  Firmenvideo angelehnt), Play-Button, Beschriftung „Video-Vorstellung
  folgt in Kürze“ – bitte durch ein eingebettetes Video (`<video>`- oder
  YouTube/Vimeo-Embed) ersetzen, sobald eines vorliegt.
- **E-Mail**: `info@mc-projectmanagement.com` (Kontaktformular, Kontaktkarte,
  Footer-Button und animierter Lauftext im Footer).
- **Adresse**: „Im II. Westfeld 7, 44388 Dortmund“ (Kontaktkarte & Footer).
- **Social-Media-Buttons** (Footer, `.social-icons`): YouTube, LinkedIn,
  Xing, Instagram und TikTok als glänzende, animierte Icon-Buttons mit
  durchlaufendem Glanz-Effekt, verlinkt auf die echten Profile:
  YouTube (`@InfoMC-Projectmanagement`) und LinkedIn/Xing laufen unter
  M&C Projectmanagement, Instagram und TikTok (`@mcakademiedo`) aktuell
  unter der M&C-Akademie-Marke – so wie von den echten Profilen bestätigt.
- **Telefonnummer**: auf Wunsch entfernt – Kontakt läuft aktuell ausschließlich
  über E-Mail und Adresse. Soll wieder eine Nummer ergänzt werden, einfach
  einen `contact-line`-/`footer-contact-btn`-Block (siehe Aufbau der
  E-Mail-Blöcke) mit `tel:`-Link in `index.html` hinzufügen.
- **Rechtliches**: Der Footer enthält wieder „Impressum“ und „Datenschutz“,
  beide als eigene Seiten im gleichen Design:
  - `impressum.html` – Angaben gemäß § 5 DDG (M&C Holding GmbH, Im II.
    Westfeld 7, 44388 Dortmund), Geschäftsführung (Madlen & Collin
    Golibersuch) sowie **ausschließlich E-Mail als Kontakt** (keine
    Telefonnummer, wie gewünscht). Enthält zusätzlich die Pflichtabschnitte
    „Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV“,
    „EU-Streitschlichtung“ (Link zur OS-Plattform) und
    „Verbraucherstreitbeilegung“. Handelsregisternummer, Registergericht
    und USt-IdNr. sind als Platzhalter markiert, da diese Angaben noch
    nicht vorlagen – bitte in `impressum.html` (Karte „Registereintrag“ /
    „Umsatzsteuer-ID“) ergänzen, sobald verfügbar (rechtlich notwendig für
    ein vollständiges Impressum).
  - `datenschutz.html` – ehrlicher Hinweis „Datenschutzerklärung folgt in
    Kürze“. Sobald der echte Text vorliegt, einfach den Absatz im
    `<div class="tilt-card ...">` ersetzen (Struktur/Design bleiben
    bestehen).
- **Texte** (Leistungen, Über uns, Referenzen) sind teils exemplarisch
  formuliert und sollten fachlich gegengelesen/angepasst werden; der
  Kontakt-Intro-Text stammt bereits von der echten Seite.

## Weitere Verbesserungen

- **Open Graph / Twitter Card**: eigens gerendertes Vorschaubild
  (`assets/og-image.png`, 1200×630, im Chrome-/Hochglanz-Look der Seite)
  plus Meta-Tags in `index.html`, damit geteilte Links (z. B. über die
  neuen Social-Buttons) mit Bild, Titel und Beschreibung angezeigt werden.
  `og:url`/`og:image` verweisen aktuell auf `https://mc-projectmanagement.de/`
  – bitte anpassen, falls die Seite unter einer anderen Domain live geht.
- **DSGVO-Einwilligung im Kontaktformular**: Pflicht-Checkbox mit Link zur
  Datenschutzerklärung, bevor eine Nachricht gesendet werden kann.
- **Scroll-Fortschrittsbalken**: dünne, glänzende Leiste ganz oben
  (`.scroll-progress`), die den Lesefortschritt auf allen drei Seiten
  anzeigt.

## Design & Haptik

- Dunkles, glasartiges 3D-Design mit Verlaufs-„Orbs“, Perspektiven-Tilt auf
  Mauszeigerbewegung (Karten & Logos), Glanzlicht-Sweep auf Buttons,
  Chrome-Farbverlauf-Überschriften und animiertem E-Mail-Ticker im Footer.
- **Haptik-/Blickfang-Effekte**: Klick-Ripple auf allen Glossy-Buttons,
  „magnetische“ Primär-Buttons (folgen der Maus leicht), Cursor-Spotlight
  (folgt der Maus über die ganze Seite), Scroll-Parallax der Hintergrund-Orbs,
  feine Film-Korn-Textur für mehr Tiefe/Materialität.
- Berücksichtigt `prefers-reduced-motion` (Animationen werden reduziert/deaktiviert).
- Vollständig responsiv (Mobile-Navigation, gestapeltes Grid).
