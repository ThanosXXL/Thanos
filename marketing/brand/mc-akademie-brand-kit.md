# M&C Akademie – Brand Kit

Navy/Gold-Designsprache mit 3D-Optik und Hochglanzeffekten für M&C-Akademie-Materialien. Dient als Referenz für künftige Flyer, Landingpages und andere Marketing-Assets, damit sie visuell konsistent bleiben.

## Dateien

- `mc-akademie-effects.css` – wiederverwendbare CSS-Bausteine (Farbtoken, Glossy-Badges, Glass-Cards, Shimmer-Text, Sheen-Sweep, Glow-Puls, CTA-Glanzlicht, Fade-Up-Kaskade). In neue HTML/CSS-Projekte per `<link>` einbinden oder Klassen/Keyframes kopieren.
- `../flyer/it-schulungen-flyer.dc.html` – vollständiges Beispiel (IT-Schulungen-Flyer), das alle Bausteine im Kontext zeigt.
- `../flyer/logo.png` – freigestelltes M&C-Akademie-Logo (transparenter Hintergrund).

## Farbpalette

| Token | Wert | Verwendung |
|---|---|---|
| `--mc-navy-900` | `#0a1730` | Basisfläche (dunkel) |
| `--mc-navy-800` | `#0d1d42` | Basisfläche (Verlaufsmitte) |
| `--mc-navy-footer` | `#081228` | Footer/Kontaktleiste |
| `--mc-gold-100` … `--mc-gold-950` | `#fbe7b0` → `#7c581a` | Gold-Verläufe für Badges, Linien, Akzente |
| `--mc-gold-text-dark` | `#3a2a06` | Text auf goldenem Untergrund |
| Weiß | `#ffffff` / `rgba(255,255,255,0.65–0.86)` | Fließtext auf Navy (Primär- vs. Sekundärtext) |

## Typografie

- Headlines: **Space Grotesk** (600/700)
- Fließtext: **Manrope** (400–800)
- Google Fonts: `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap`

## Logo-Regel

Das M&C-Akademie-Logo nutzt eigene Markenfarben (Schwarz/Rot) und geht auf dunklem Navy-Grund farblich unter. Deshalb immer auf einer hellen "Plaque" platzieren (`.mc-logo-plaque` in der CSS-Datei) statt direkt auf Navy.

## 3D- & Hochglanz-Prinzipien

- Badges/Siegel: radialer Gold-Verlauf + `inset`-Schatten (hell oben-links, dunkel unten-rechts) für Kugel-Optik, kombiniert mit leichtem `rotateY`-Schweben (`mc-badge-float`) für einen 3D-Dreheffekt.
- Karten: leicht transparente Verläufe + dünne Gold-Kontur + weicher Außenschatten (`mc-glass-card`).
- Bewegung: dezente, endlose Ambient-Loops (Sheen-Sweep, Glow-Puls, Shimmer-Text) plus eine einmalige Eintritts-Kaskade (`mc-fade-up`, gestaffelte `animation-delay`) – nichts Hektisches, `prefers-reduced-motion` wird respektiert.

## Neues Projekt starten

1. `mc-akademie-effects.css` einbinden (oder relevante Klassen kopieren).
2. Google-Fonts-Link aus diesem Dokument übernehmen.
3. Layout mit `.mc-surface` (Basisfläche) + `.mc-glass-card` / `.mc-glossy-badge` aufbauen.
4. Logo immer über `.mc-logo-plaque` einsetzen.
