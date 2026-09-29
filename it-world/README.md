# IT-World

Landingpage für Web-App-Entwicklung im schwarz-goldenen 3D-/Hochglanz-Design (Fiverr-Gig
"IT-World – IT Solutions"). Eigenständige Next.js/React-App, unabhängig vom Dozenten Dashboard,
`omniroute/`, `it-schulung/`, `videowelt/` und `videowelt-mobile/` in diesem Repository.

## Inhalt

Eine einseitige Landingpage (`app/page.tsx`) mit folgenden Abschnitten:

- **Hero** – Logo, Headline, Kurzbeschreibung, Tech-Badges, CTA
- **Demo** – eingebetteter `<video>`-Player (Poster-Frame + Controls) plus Download-Button für das
  Demo-Video (`components/Demo.tsx`)
- **Leistungen** – die sechs Kernangebote (SaaS, CRM/ERP, eCommerce, Buchungsportale,
  KI-Web-Apps, Workflow-Automatisierung)
- **Warum uns** – fünf Gründe für IT-World
- **Pakete** – die drei Fiverr-Pakete (Basic/Standard/Premium) mit Preisen, Revisionen und
  Lieferzeiten
- **Tech-Stack** – Programmiersprache, Expertise, Frontend-/Backend-Frameworks sowie
  KI-/No-Code-Builder als gruppierte Badges
- **Kontakt** – CTA mit Kontakt-Link (Platzhalter-E-Mail in `components/Contact.tsx`, bitte durch
  die echte Kontaktadresse bzw. den Fiverr-Gig-Link ersetzen)

Das Logo (glänzende 3D-Weltkugel mit Goldring, `components/Logo.tsx`) ist als reines SVG
nachgebaut, keine externe Bilddatei nötig. `components/Nav.tsx` ist eine fixierte Kopfzeile mit
Anker-Links zu den Sektionen (Desktop-Leiste + Mobile-Menü). Favicon (`app/icon.tsx`) und das
Social-Share-Vorschaubild (`app/opengraph-image.tsx`) werden zur Build-Zeit von Next.js aus Code
generiert (`next/og`), ebenso `app/robots.ts`/`app/sitemap.ts`.

## Demo-Video (`public/demo/`)

`public/demo/it-world-demo.mp4` (~2,8 MB, ~30s, 1440×900) ist eine aufgezeichnete Bildschirmtour
durch die Seite, unterlegt mit einer Musikspur passender Länge; `it-world-demo-poster.jpg` ist das
Vorschaubild für den `<video>`-Tag. Beides sind fertige, eingecheckte Binärdateien – keine
Build-Artefakte. Neu erzeugt wurden sie mit Playwrights `recordVideo` (Chromium fährt automatisiert
durch alle Sektionen inkl. Hover-Effekten) und ffmpeg (Zuschnitt auf die Musiklänge, Ein-/Ausblenden,
H.264/AAC-Mux); beide Tools waren dafür nur temporär als devDependency installiert und sind nicht
Teil von `package.json`. Um das Video zu ersetzen, einfach eine neue Datei unter demselben Pfad
ablegen (Seitenverhältnis/Codec wie oben, `<video>`-Tag und Download-Button in `components/Demo.tsx`
bleiben unverändert).

## Bekannter Hinweis (npm audit)

`npm audit` meldet eine kritische Next.js-Advisory zur Image-Optimization-API bei AVIF-Dateien
(GHSA-2xp9-vwfh-vxw4), die erst in Next 16 gepatcht ist. Diese Seite verwendet `next/image` an
keiner Stelle und konfiguriert keine `remotePatterns`, die Optimization-API ist also faktisch nicht
erreichbar/nutzbar – das Risiko wurde bewusst akzeptiert, statt auf das (breaking) Next 16 zu
wechseln. Alle anderen von `npm audit` gemeldeten Next.js-CVEs sind durch `next@14.2.35` bereits
behoben.

## Umgebungsvariable

`NEXT_PUBLIC_SITE_URL` – die echte Domain, sobald die Seite live ist (wird für `sitemap.xml`,
`robots.txt` und absolute Open-Graph-Bild-URLs verwendet). Ohne gesetzte Variable wird der
Platzhalter `https://it-world.example` genutzt.

## Befehle

```bash
npm install     # Abhängigkeiten installieren
npm run dev      # Entwicklungsserver starten (http://localhost:3000)
npm run build    # Produktions-Build erzeugen
npm start        # Produktions-Build starten
npm run lint     # ESLint (next/core-web-vitals)
```

Ausführen aus `it-world/`, nicht aus dem Repo-Root.
