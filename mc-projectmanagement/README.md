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
├── index.html        Seiteninhalt (eine Seite mit Anker-Navigation)
├── css/style.css      3D-/Glas-/Hochglanz-Design, Animationen, Responsive Layout
├── js/script.js       Tilt-, Magnet- & Ripple-Effekte, Scroll-Reveal, Zähler, Ticker, Mobile-Nav
└── assets/favicon.svg Favicon
```

## Inhalte & offene Platzhalter

- **Logo-Leiste ganz oben**: 4 animierte, ovale 3D-/Hochglanz-Marken der M&C
  Gruppe (M&C Holding GmbH, M&C Projectmanagement, M&C Baumanagement,
  M&C Akademie) – inklusive Schriftzug innerhalb jedes Logos, im Stil der
  Original-Logos nachgebaut, da die echten Logo-Dateien nicht vorlagen.
  Bei Bedarf 1:1 durch die echten Logo-Grafiken ersetzbar.
- **„Unser Team“-Sektion**: Foto-Bereich für die Mitarbeiter ist aktuell ein
  klar gekennzeichneter **Platzhalter** (vier stilisierte Avatare, Beschriftung
  „Foto-Platzhalter – hier erscheint das echte Teamfoto“), da kein echtes
  Foto der 4 Mitarbeiter als Datei vorlag. Bitte das echte Teamfoto in
  `index.html` (`.team-photo-frame`) einsetzen.
- **3D-Globus mit Baustellen-Standorten**: reiner CSS-/SVG-Globus mit
  animierten, umlaufenden Pfeilen zu vier Beispiel-Standorten (Berlin, Dubai,
  Singapur, New York) als **Platzhalter-Städte**. Bitte in `index.html`
  (`.site-pin` + zugehörige `<path class="flow-path">`-Koordinaten) durch die
  tatsächlich realisierten Baustellen-Standorte ersetzen.
- **Video Vorstellung**: Platzhalter-Videoplayer (Play-Button, Equalizer-
  Animation, Beschriftung „Video-Vorstellung folgt in Kürze“) – bitte durch
  ein eingebettetes Video (`<video>`- oder YouTube/Vimeo-Embed) ersetzen,
  sobald eines vorliegt.
- **E-Mail**: `info@mc-projectmanagement.com` (Kontaktformular, Kontaktkarte,
  Footer-Button und animierter Lauftext im Footer).
- **Adresse**: „Im II. Westfeld 7, 44388 Dortmund“ (Kontaktkarte & Footer).
- **Telefonnummer**: auf Wunsch entfernt – Kontakt läuft aktuell ausschließlich
  über E-Mail und Adresse. Soll wieder eine Nummer ergänzt werden, einfach
  einen `contact-line`-/`footer-contact-btn`-Block (siehe Aufbau der
  E-Mail-Blöcke) mit `tel:`-Link in `index.html` hinzufügen.
- **Rechtliches**: Der Footer enthält nur noch „Datenschutz“ (Platzhalter-Link
  `href="#"`, noch auf eine echte Seite zu verweisen) – „Impressum“ wurde auf
  Wunsch entfernt.
- **Texte** (Leistungen, Über uns, Referenzen) sind teils exemplarisch
  formuliert und sollten fachlich gegengelesen/angepasst werden; der
  Kontakt-Intro-Text stammt bereits von der echten Seite.

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
