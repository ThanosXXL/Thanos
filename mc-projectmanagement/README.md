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
├── assets/og-image.png Social-Media-Vorschaubild (1200×630, Open Graph/Twitter Card)
├── assets/video-vorstellung.mp4         Video unter „Video Vorstellung“ (siehe unten)
├── assets/video-vorstellung-poster.jpg  Vorschaubild des Videos
└── assets/team/*.jpg                    Echte Team-Porträtfotos (8 von 13 Personen, siehe unten)
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
  8 von 13 Personen (Madlen Golibersuch, Collin Golibersuch, Malte Kurm,
  Andrea Lejk, Rene Sangmeister, Adam Wujciow, Heiko Lerchner, Thorsten
  Heymann) zeigen inzwischen echte Porträtfotos (`assets/team/*.jpg`,
  `<img class="member-photo">`), aus den vom Kunden gesendeten
  Bildschirmfotos der Original-Seite zugeschnitten. Die übrigen 5
  (Murat Kyküz, Nordin Asrih, Deni Cizmar, Joachim Melzer, Matthias
  Gornik) zeigen weiterhin **Initialen-Avatare** (`.member-avatar`),
  da für sie noch kein Foto vorliegt bzw. die Originalseite für
  Matthias Gornik selbst „Bild folgt in Kürze“ anzeigt – sobald weitere
  Fotos vorliegen, einfach nach demselben Muster (`assets/team/`-Datei
  + `<img class="member-photo" src="…" alt="…">` anstelle des
  `<span class="member-avatar …">`) ergänzen. Bei Murat Kyküz wurde die
  auf der Originalseite
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
- **Video Vorstellung**: kein Platzhalter mehr, sondern ein echtes,
  abspielbares `<video>`-Element (`assets/video-vorstellung.mp4` mit
  `assets/video-vorstellung-poster.jpg` als Vorschaubild), inklusive
  glänzendem Play-Button-Overlay (`#videoPlayBtn`), das beim Abspielen
  ausgeblendet und bei Pause/Ende wieder eingeblendet wird
  (`js/script.js`). Aktuell läuft dort ein kurzer, selbst aufgenommener
  Rundgang durch die Website mit Hintergrundmusik – bitte durch das
  ausführliche, echte Firmenvideo ersetzen (einfach `src` im `<source>`
  sowie `poster` in `index.html` austauschen), sobald eines vorliegt.
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
    Westfeld 7, 44388 Dortmund), Vertreten durch Madlen Golibersuch
    (Inhaberin / Kaufmännische Geschäftsführung) sowie **ausschließlich
    E-Mail als Kontakt** (keine Telefonnummer, wie gewünscht). Enthält
    zusätzlich die Pflichtabschnitte „Verantwortlich für den Inhalt nach
    § 18 Abs. 2 MStV“, „EU-Streitschlichtung“ (Link zur OS-Plattform) und
    „Verbraucherstreitbeilegung“. Die Karte „Registereintrag“
    (Handelsregisternummer/-gericht) wurde auf Wunsch vollständig entfernt,
    da diese Angaben nicht existieren bzw. nicht zutreffen; die
    Umsatzsteuer-ID ist als „nicht bekannt“ ausgewiesen – bitte in
    `impressum.html` (Karte „Umsatzsteuer-ID“) ergänzen, sobald verfügbar.
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
