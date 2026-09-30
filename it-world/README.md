# IT-World

Landingpage für Web-App-Entwicklung im schwarz-goldenen 3D-/Hochglanz-Design (Fiverr-Gig
"IT-World – IT Solutions"). Eigenständige Next.js/React-App, unabhängig vom Dozenten Dashboard,
`omniroute/`, `it-schulung/`, `videowelt/` und `videowelt-mobile/` in diesem Repository.

## Inhalt

Eine einseitige Landingpage (`app/page.tsx`) mit folgenden Abschnitten:

- **Hero** – Logo, Headline, Kurzbeschreibung, Tech-Badges, CTA
- **Demo** – eingebetteter `<video>`-Player (Poster-Frame + Controls) plus Download-Button für das
  Demo-Video (`components/Demo.tsx`)
- **Galerie** – die 5 KI-generierten Fiverr-Gig-Bilder (Cover, Leistungen, Tech-Stack, Pakete,
  Call-to-Action) als Hochglanz-Kacheln mit 3D-Tilt-Hover-Effekt (`components/Gallery.tsx`)
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

## Galerie (`public/gig/`)

`public/gig/01-cover.webp` … `05-cta.webp` (je ~75–95 KB, 1280×720) sind die 5 Fiverr-Gig-Bilder,
KI-generiert (gpt-image-2 über die ElevenLabs-Bildgenerierung) und mit ffmpeg von PNG nach WebP
konvertiert (nur temporär als devDependency installiert, nicht Teil von `package.json`). Sie sind
fertige, eingecheckte Binärdateien. Zum Austauschen einfach eine neue Datei unter demselben Pfad
und Namen ablegen (Seitenverhältnis 16:9); `components/Gallery.tsx` referenziert sie per `<img>`
mit festen `width`/`height` (1280×720) gegen Layout-Shift.

## Rechtliches: Impressum (`app/impressum/`)

`/impressum` (verlinkt im Footer, `components/Footer.tsx`) enthält ein Impressum-Gerüst gemäß § 5
DDG mit **Platzhalter-Angaben** (Name/Firma, Anschrift, Kontakt, USt-ID). Diese Platzhalter müssen
vor dem Livegang durch die echten Angaben ersetzt werden – direkt in
`app/impressum/page.tsx`. Ein fehlendes oder fehlerhaftes Impressum ist in Deutschland abmahnfähig;
diese Seite selbst macht darauf mit einem gelb umrandeten Warnhinweis aufmerksam. Der Footer zeigt
zusätzlich die Copyright-Zeile ("© {Jahr} IT-World – IT Solutions. Alle Rechte vorbehalten.") auf
jeder Seite.

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

## Fertigstellung & Go-Live

### 1. Vor der Veröffentlichung ausfüllen (Checkliste)

- [ ] **Impressum** – echte Angaben in `app/impressum/page.tsx` eintragen (siehe oben)
- [ ] **Kontakt-E-Mail** – Platzhalter `kontakt@it-world.dev` in `components/Contact.tsx` durch die
      echte Adresse bzw. den Fiverr-Gig-Link ersetzen
- [ ] **Domain** – Umgebungsvariable `NEXT_PUBLIC_SITE_URL` auf die echte Domain setzen (wirkt sich
      auf `sitemap.xml`, `robots.txt` und die Open-Graph-Vorschau aus)
- [ ] Optional: eigenes Logo/Bilder/Preise anpassen (`components/Logo.tsx`, `public/gig/`,
      `components/Pricing.tsx`)

### 2. Lokale Installation

Voraussetzung: Node.js 18.18+ (getestet mit Node 22) und npm.

```bash
cd it-world
npm install       # Abhängigkeiten installieren (legt node_modules/ an)
npm run build     # Produktions-Build erzeugen (prüft TypeScript + ESLint)
npm start         # Produktions-Server lokal starten, Standard-Port 3000
```

Danach ist die Seite unter `http://localhost:3000` erreichbar. Für die Entwicklung mit
Hot-Reload stattdessen `npm run dev` verwenden.

### 3. Deployment (Optionen)

**Vercel (einfachster Weg für Next.js):**
1. Repository (bzw. den Unterordner `it-world/`) mit einem Vercel-Projekt verbinden
2. Root Directory auf `it-world` setzen
3. Umgebungsvariable `NEXT_PUBLIC_SITE_URL` im Vercel-Projekt hinterlegen
4. Vercel baut und deployed automatisch bei jedem Push

**Eigener Server / anderes Hosting (Node.js-fähig):**
1. `npm install && npm run build` auf dem Server bzw. im CI ausführen
2. `npm start` dauerhaft laufen lassen, z. B. mit einem Prozess-Manager wie PM2
   (`pm2 start npm --name it-world -- start`)
3. Einen Reverse Proxy (z. B. nginx) vor den Next.js-Port (Standard 3000) schalten und dort
   TLS/HTTPS terminieren
4. DNS der Domain auf den Server zeigen lassen, danach `NEXT_PUBLIC_SITE_URL` entsprechend setzen
   und neu bauen/starten

Es gibt keinen Datenbank- oder Backend-Teil zu installieren – die Seite ist rein statisch
generierbar (keine Server-seitige Logik außer den Next.js-eigenen Metadaten-Routen
`app/icon.tsx`, `app/opengraph-image.tsx`, `app/robots.ts`, `app/sitemap.ts`).
