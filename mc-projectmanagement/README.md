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
├── js/script.js       Tilt-Effekte, Scroll-Reveal, Zähler, Ticker, Mobile-Nav
└── assets/favicon.svg Favicon
```

## Inhalte & offene Platzhalter

- **Logo-Leiste ganz oben**: 4 animierte, abstrahierte Marken (ohne Text) der
  M&C Gruppe – M&C Holding, M&C Projectmanagement, M&C Baumanagement,
  M&C Akademie – als stilisierte Icon-Marken in 3D/Hochglanz-Optik, da die
  Original-Logodateien nicht vorlagen. Bei Bedarf können sie 1:1 durch die
  echten Logo-Grafiken (`assets/`) ersetzt werden.
- **E-Mail**: `info@mc-projectmanagement.com` (Kontaktformular, Kontaktkarte
  und animierter Lauftext im Footer).
- **Telefonnummer**: aktuell als Platzhalter `+49 (0) XXX XXX XXXX` /
  `tel:+49XXXXXXXXXX` hinterlegt – bitte in `index.html` an den beiden
  Stellen `contact-line` (Kontaktbereich) und `footer-contact-btn` (Footer)
  durch die echte Nummer ersetzen (Anzeigetext **und** `tel:`-Link).
- **Rechtliches**: „Impressum“ und „Datenschutz“ im Footer sind Platzhalter-Links
  (`href="#"`) und müssen noch auf echte Seiten verweisen.
- **Texte** (Leistungen, Über uns, Referenzen) sind exemplarisch formuliert und
  sollten fachlich gegengelesen/angepasst werden.

## Design

- Dunkles, glasartiges 3D-Design mit Verlaufs-„Orbs“, Perspektiven-Tilt auf
  Mauszeigerbewegung (Karten & Logos), Glanzlicht-Sweep auf Buttons,
  Chrome-Farbverlauf-Überschriften und animiertem E-Mail-Ticker im Footer.
- Berücksichtigt `prefers-reduced-motion` (Animationen werden reduziert/deaktiviert).
- Vollständig responsiv (Mobile-Navigation, gestapeltes Grid).
