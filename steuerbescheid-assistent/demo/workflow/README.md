# Demo-Video-Workflow

Wiederverwendbarer Ablauf, mit dem das Demo-Video unter `../steuerbescheid-assistent-demo.mp4`
entstanden ist – und mit dem sich künftige Demovideos (auch für Änderungen an
dieser oder anderen Seiten in diesem Repo) genauso bauen lassen, ohne die
Hintergrundmusik neu erzeugen zu müssen.

## Dateien hier

- **`lounge-band.mp3`** – die Hintergrundmusik (Klavier/Streicher, weicher
  Kick/Rim-Beat, ~30s, geloopt für längere Videos). Synthetisch erzeugt,
  lizenzfrei für Projekte in diesem Repo nutzbar. Ursprünglich für das
  MSR_DELUXE-Dashboard-Demo erstellt (`branding/lounge-band.mp3` im Branch
  `claude/msr175-dashboard-demo-fyhsly`), hier dauerhaft gesichert, damit sie
  nicht mehr aus einem anderen Branch geholt werden muss.
- **`intro.html`** / **`outro.html`** – Vorlagen für die Standbilder am
  Anfang/Ende (1280×720, Gelb-Orange-Glossy-Stil des Steuerbescheid-
  Assistenten). Für ein neues Video Texte/Icon anpassen.
- **`record_walkthrough.js`** – Playwright-Skript, das einen Klick-Durchlauf
  durch die App als Video aufnimmt. Der Klickpfad ist auf den
  Steuerbescheid-Assistenten zugeschnitten; für andere Seiten den Ablauf
  entsprechend anpassen, das Aufnahme-Setup (Viewport, `recordVideo`) bleibt
  gleich.
- **`build-demo-video.sh`** – ffmpeg-Skript, das Intro-Standbild +
  Walkthrough-Aufnahme + Outro-Standbild + Musik zu einem fertigen mp4
  zusammenmischt (inkl. Audio-Loop und Ein-/Ausblendung).

## Ein neues Demo-Video bauen

```bash
# 1. App lokal starten (Beispiel für den Steuerbescheid-Assistenten)
cd ../../                                   # steuerbescheid-assistent/
python3 -m http.server 8642 &

# 2. Intro-/Outro-Standbilder rendern (1280x720 Screenshot der HTML-Dateien,
#    z. B. per Playwright: page.goto('file://.../intro.html'); page.screenshot(...))

# 3. Walkthrough aufnehmen
cd demo/workflow
APP_URL=http://127.0.0.1:8642/index.html node record_walkthrough.js
# -> erzeugt eine <hash>.webm-Datei in diesem Ordner

# 4. Alles zusammenmischen
./build-demo-video.sh \
  --intro intro.png --outro outro.png \
  --walkthrough <hash>.webm \
  --music lounge-band.mp3 \
  --out ../steuerbescheid-assistent-demo.mp4
```

Node-Voraussetzung: `playwright` (inkl. Chromium). In dieser Sandbox liegt es
bereits global unter `/opt/node22/lib/node_modules/playwright` mit Chromium
unter `/opt/pw-browsers/chromium` – `record_walkthrough.js` findet das
automatisch, falls kein lokales `node_modules/playwright` vorhanden ist.

## Für andere Projekte/Seiten wiederverwenden

Die Musik und die ffmpeg-Zusammenschnitt-Logik sind projektunabhängig. Für
ein neues Demo-Video einer anderen Seite genügt es, eigene `intro.html`/
`outro.html`-Vorlagen (im passenden Farbschema) sowie einen eigenen
Klick-Durchlauf in `record_walkthrough.js` zu erstellen und dann
`build-demo-video.sh` mit `--music lounge-band.mp3` aus diesem Ordner
aufzurufen.
