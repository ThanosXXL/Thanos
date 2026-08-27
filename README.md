# IT Schulungsmaßnahmen

Desktop-Dashboard (Electron) zur Verwaltung von bis zu vier Dozenten. Jeder Dozent hat drei Listen:

1. **Liste 1 – To-Do-Liste** (Aufgabenliste)
2. **Liste 2 – Offene Projekte**
3. **Liste 3 – Erledigte Projekte**

Projekte lassen sich per Klick von "Offene Projekte" nach "Erledigte Projekte" verschieben (und zurück).
Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem Neustart erhalten.

Zusätzlich bietet jedes Dozenten-Panel eine Werkzeugleiste mit:

- **📷 Screenshot** – nimmt den gesamten Bildschirm auf.
- **✂️ Sniping** – Bereichsauswahl-Screenshot: Ausschnitt mit der Maus aufziehen (ESC bricht ab).
  Aufnahmen werden im Bilder-Ordner gespeichert und – sofern ein Google-Drive-Token hinterlegt
  ist (Button **⚙ Drive**) – automatisch nach Google Drive hochgeladen.
- **🎥 Video-Chat** – öffnet den Video-Live-Chat mit den Kacheln *Dozent* und *Ich*.
- **🎤 Audio an/aus** und **📹 Video an/aus** – Umschalter für Mikrofon und Kamera, sowohl in der
  Werkzeugleiste als auch direkt im Video-Chat-Fenster. Der Status (*Mikro aus* / *Kamera aus*)
  erscheint als Markierung in der eigenen Kachel.

Das Video-Chat-Fenster ist als **Unterrichts-Ansicht** aufgebaut:

- **Teilnehmer-Leiste** (oben): kleine Live-Kacheln aller Teilnehmer mit Namen und Gesamtanzahl.
  Über **+ Teilnehmer** treten weitere Personen bei – die Teilnahme erfolgt immer per Videochat.
- **Live-Übertragung – Unterricht** (links): das große Video der Unterrichtsübertragung.
- **Unterrichts-Chat** (rechts daneben): Chat für **alle** Teilnehmer, z. B. für Fragen. Über
  **⏸ Pause** lässt sich eine Pause für alle sichtbar eintragen.
- **Privat- & Gruppenchat** (darunter): Klick auf einen Teilnehmer öffnet einen **Privatchat**;
  über **+ Gruppe** lassen sich mehrere Teilnehmer auswählen und zu einem **Gruppenchat** zusammenfassen.
- **Moderation**: Der Dozent kann über **🔇 Alle stummschalten** alle Teilnehmer stummschalten – dann
  ist nur der Dozent zu hören. Teilnehmer können sich per **✋ Melden** melden; der Dozent schaltet die
  gemeldete Person dann über **🔊** frei, sodass sie sprechen kann und alle es hören.

Unter jedem Dozenten-Panel gibt es außerdem zwei Ordner:

- **📁 Ordner: Hausaufgaben** – Teilnehmer reichen Hausaufgaben ein (mit optionalem Datei-Anhang);
  im selben Ordner korrigiert der Dozent sie mit Feedback und gibt sie über
  **Korrigieren & zurückgeben** zurück.
- **📁 Ordner: Kalender – Tests & Prüfungen** – ein Echtzeit-Kalender mit laufender Uhr (Wochentag,
  Datum, Monat, Jahr, Uhrzeit). Anstehende Tests/Prüfungen lassen sich mit Titel, Datum und Uhrzeit
  eintragen und werden mit Countdown angezeigt.

Im Video-Chat-Fenster gibt es außerdem eine **Dateifreigabe**:

- Ein-/Ausschalter, der die Funktion aktiviert.
- **📁 Datei aus Ordner öffnen** (nur bei eingeschalteter Freigabe) – öffnet den Datei-Dialog des Geräts.
- Nach der Auswahl kann die Datei an **Nur Dozent** oder **Alle Teilnehmer** geteilt werden; geteilte
  Dateien erscheinen in einer Liste. Ein kompakter 📎-Button in der Steuerleiste öffnet die Auswahl direkt.

> Hinweis: Der Google-Drive-Upload nutzt einen manuell hinterlegten OAuth-Access-Token; ohne Token
> wird der Screenshot ausschließlich lokal gespeichert.

**Sichere Token-Speicherung:** Der Google-Drive-Token wird über
[`keytar`](https://www.npmjs.com/package/keytar) im **OS-Schlüsselbund** gespeichert (Windows
Credential Manager, macOS Keychain, Linux Secret Service via libsecret) statt im Klartext. Ein
evtl. vorhandener alter Klartext-Token wird beim ersten Start automatisch migriert. Ist auf einem
System kein Schlüsselbund-Backend verfügbar (z. B. Linux ohne libsecret), fällt die App
automatisch auf die bisherige Klartext-Datei zurück – das Einstellungen-Fenster zeigt in diesem
Fall eine Warnung (🔒 sicher / ⚠ Klartext) an.

> `keytar` ist ein natives Modul. `npm install` lädt für gängige Plattformen vorkompilierte
> Binärdateien; auf ungewöhnlichen Systemen kann der Download/Build fehlschlagen. Der `postinstall`-
> Schritt (`electron-builder install-app-deps`) baut es automatisch passend zur Electron-Version
> neu. Sollte die Installation dennoch Probleme machen, kann die Zeile `"keytar"` aus den
> `dependencies` in `package.json` entfernt werden – die App läuft dann unverändert weiter, nur
> ohne die sichere Schlüsselbund-Speicherung.

**Token-Ablauf:** Google-OAuth-Access-Tokens sind typischerweise nur **~1 Stunde gültig**. Schlägt
der Upload mit HTTP 401 fehl, zeigt die App gezielt „Google-Drive-Token abgelaufen oder ungültig –
bitte im ⚙ Drive-Fenster einen neuen Token eintragen" statt einer allgemeinen Fehlermeldung. Ein
vollständiger OAuth-Anmelde-Flow (mit automatischer Token-Erneuerung) würde ein eigenes
Google-Cloud-Projekt mit OAuth-Client-ID benötigen, das nur der Repository-Betreiber einrichten
kann – das ist bewusst nicht Teil dieser App.

## Fertigen Installer herunterladen (ohne Terminal)

Unter **[Releases](../../releases)** stehen fertig gebaute Installationsdateien zum Anklicken bereit:

- Windows: `.exe` (Installer)
- macOS: `.dmg`
- Linux: `.AppImage`

Einfach die passende Datei für dein Betriebssystem herunterladen und ausführen – kein `npm install`,
kein Terminal nötig.

Neue Installer werden automatisch von GitHub Actions gebaut, sobald ein neuer Versions-Tag
(z. B. `v1.0.0`) gepusht wird, oder manuell über den Button **"Run workflow"** im Tab
**Actions → Build & Release Desktop App**.

## Download-Seite (alle 5 Plattformen, 1-Klick)

`renderer/download.html` ist eine eigenständige Landingpage im gleichen Farbschema wie das
Dashboard (Sandton/Beige, dunkelrotes Header-Gradient). Sie erkennt die Plattform des
Besuchers automatisch und bietet **1-Klick-Download-Buttons** für **Windows, Mac, Linux,
Android und iOS** – gedacht für Teilnehmer, Dozenten und Admins, *bevor* sie sich zum
Unterricht anmelden.

- In der App: Button **„⬇ App herunterladen (alle Plattformen)"** oben rechts im Header.
- Direkt: `http://localhost:4173/download.html` (nach `npm run serve` bzw. `start-browser.ps1`).

**Geräteauswahl mit vollautomatischem Download:** Ganz oben auf der Seite steht eine
Schnellauswahl mit fünf Buttons (Windows/Mac/Linux/Android/iOS). Klick auf ein Gerät startet
sofort und vollautomatisch den Download der **Vollversion** für dieses Gerät – ohne weiteren
Klick nötig.

**Zusätzlich vollautomatisch beim Laden:** Die Seite startet außerdem von selbst den Download
der Vollversion für die automatisch erkannte Plattform (nach 1,5 Sekunden, mit sichtbarem
Banner und „Abbrechen"-Option). Zum reinen Stöbern ohne sofortigen Download:
`download.html?auto=0` aufrufen. Beide Wege sind per echtem Headless-Browser-Test verifiziert:
die jeweilige Datei landet tatsächlich im Download-Ordner, nicht nur simuliert.

Enthält zusätzlich Download-Links für:
- **Handzettel für Teilnehmer** (weiche Farben, Hochglanz-3D) – `downloads/Handzettel-Teilnehmer.pdf`
- **Installationshandbücher** je Plattform (inkl. dem jeweiligen PowerShell-Skript im Wortlaut) –
  `downloads/Installationshandbuch-{Windows,Mac,Linux,Android,iOS}.pdf`

Alle Dateien in `downloads/` werden per Node-Skript erzeugt (kein PowerShell nötig, nur ein
lokal vorhandener Chromium/Chrome/Edge):

```
node scripts/build-materials.js
```

> **Wichtiger Hinweis:** Aus Sicherheitsgründen können Webseiten eine heruntergeladene Datei
> nicht automatisch auf dem Desktop speichern – sie landet im üblichen Download-Ordner des
> Browsers. Für Windows/Mac/Linux lädt der Button das **Start-Skript** der Vollversion herunter
> (kein kompiliertes Installer-Programm, da dafür ein Versions-Tag-Release über
> `build-release.yml` nötig wäre); für Android/iOS lädt er die **Vollversion-PDF**, da Electron
> dort nicht nativ läuft. Damit die Seite auch für entfernte Teilnehmer über das Internet
> erreichbar ist, muss sie öffentlich gehostet werden (z. B. über die PWA auf GitHub Pages,
> sobald dort aktiviert).

## Echter Mehrgeräte-Video-Chat (Signaling-Server + WebRTC)

Ohne einen laufenden Signaling-Server sind "Teilnehmer" im Video-Chat nur **lokale
Platzhalter auf einem einzelnen Gerät** – Dozent und Teilnehmer auf verschiedenen Rechnern
sehen sich sonst nicht. Mit `server/signaling-server.js` werden mehrere echte Geräte in
einem gemeinsamen Raum verbunden: WebRTC-Signaling (Angebot/Antwort/ICE) läuft über den
Server, Audio/Video fließen anschließend **direkt Peer-zu-Peer** zwischen den Geräten.
Zusätzlich werden Unterrichts-Chat, Alle-Stummschalten, Melden/Freischalten und
PowerPoint-Präsentationen in Echtzeit an alle verbundenen Geräte verteilt.

**Server starten** (auf einem Rechner, z. B. dem des Dozenten, oder zentral im Netzwerk):

```
pwsh ./scripts/start-signaling-server.ps1        # Standard-Port 8787
# oder plattformunabhängig:
npm run signaling
```

**Verbinden** (im Video-Chat-Fenster, oberhalb der Teilnehmer-Leiste): Server-Adresse
eintragen (z. B. `ws://192.168.1.10:8787` für dasselbe Netzwerk, `ws://localhost:8787` für
denselben Rechner; wird für nächste Verbindungen gemerkt) und einen **Raum-Code** – wird
beim Öffnen automatisch pro Dozent vorgeschlagen und groß mit 📋-Kopieren-Button angezeigt,
damit er einfach an Teilnehmer weitergegeben werden kann – dann **„Verbinden"** klicken.

> Ohne aktive Verbindung funktioniert die Video-Chat-Ansicht unverändert wie zuvor rein
> lokal (manuell hinzugefügte Teilnehmer zum Demonstrieren ohne Zweitgerät). Für Verbindungen
> über das Internet (nicht nur im selben Netzwerk) muss der Server öffentlich erreichbar sein
> (Portfreigabe/Firewall bzw. Hosting auf einem erreichbaren Server) – das ist bewusst nicht
> Teil dieses Skripts. `ws` (die Server-Bibliothek) ist reines JavaScript ohne native
> Kompilierung, im Gegensatz zu `keytar` also unkompliziert per `npm install` nutzbar.

### Dozenten-Daten geräteübergreifend synchronisieren

Der Signaling-Server hält zusätzlich einen **serverweiten** Stand der Dozenten-Daten
(Listen, Hausaufgaben, Kalender, Chat/Notizen – nicht raumgebunden, da die App insgesamt
bis zu 4 Dozenten verwaltet) und verteilt Änderungen an alle verbundenen Geräte:

- Beim Verbinden fragt das Gerät den aktuellen Stand ab. Kennt der Server noch keine Daten,
  wird der eigene lokale Stand zur neuen Quelle. Kennt der Server bereits Daten, übernimmt
  das Gerät sie (lokale Daten werden dabei ersetzt).
- Jede Änderung (Aufgabe hinzufügen, Hausaufgabe korrigieren, Termin eintragen, …) wird
  danach automatisch an alle anderen verbundenen Geräte weitergegeben.
- **Wichtige Einschränkung:** Es gilt "letzter Stand gewinnt" – es gibt kein
  Konfliktmanagement für zeitgleiche Änderungen auf zwei Geräten. Für den
  Klassenzimmer-Maßstab dieser App (wenige gleichzeitige Bearbeiter) ist das ausreichend,
  für sehr viele gleichzeitige Schreibzugriffe wäre ein echtes Merge-Verfahren nötig.
- Der Server speichert den Stand zusätzlich in `server/data-store.json`, damit er einen
  Server-Neustart übersteht (Datei ist über `.gitignore` ausgeschlossen).

Verifiziert wurde diese Funktion mit zwei vollständig unabhängigen Chromium-Prozessen
(simulierte Kamera/Mikrofon), die sich über einen lokal laufenden Signaling-Server
verbunden haben: echter WebRTC-Medienfluss (`readyState` der Video-Elemente = Daten
vorhanden), Teilnehmerzahl-Synchronisation, geräteübergreifender Unterrichts-Chat, eine
über das Netzwerk wirksame Stummschaltung sowie korrekte Erkennung, wenn ein Gerät den
Raum verlässt.

## PWA – echte installierbare App für Android &amp; iOS

Da Electron nicht auf Mobilgeräten läuft, gibt es die Oberfläche zusätzlich als **PWA**
(Progressive Web App). Über den Browser lässt sie sich auf Android und iOS **installieren**
(eigenes App-Icon, Vollbild ohne Browserleiste, Offline-Start) – ganz ohne App Store.

Enthalten in `renderer/`:

- **`manifest.webmanifest`** – Name, Icons, Theme-Farbe (`#8c3b3b`, das bekannte Dunkelrot),
  Hintergrundfarbe (`#f2ead9`, Sandton), Start im Vollbildmodus (`display: standalone`).
- **`sw.js`** – Service Worker: cached die App beim ersten Aufruf, damit sie auch offline bzw.
  bei wackliger Verbindung startet.
- **`icons/`** – App-Icons (192/512px, inkl. maskable-Variante für Android und Apple-Touch-Icon
  für iOS).
- **`pwa-register.js`** – registriert den Service Worker nur im echten Browser (in Electron
  passiert nichts).

**Installieren:**

1. Lokal testen: `pwsh ./scripts/start-browser.ps1` (oder `npm run serve`) und
   `http://localhost:4173` öffnen.
2. Für eine echte Installation auf dem Smartphone wird eine **HTTPS-URL** benötigt (auf dem
   eigenen Gerät reicht `localhost` nicht). Dafür liegt der Workflow
   `.github/workflows/pages.yml` bereit, der `renderer/` auf **GitHub Pages** veröffentlicht
   (manuell auslösbar über den Tab **Actions → PWA auf GitHub Pages veröffentlichen → Run workflow**,
   oder automatisch bei Push auf diesen Branch). Danach die angezeigte `https://…github.io/…`-URL
   auf dem Smartphone öffnen:
   - **Android (Chrome):** Menü → „App installieren" / „Zum Startbildschirm hinzufügen".
   - **iOS (Safari):** Teilen-Symbol → „Zum Home-Bildschirm".

> Sobald dieser Branch in `main` gemerged ist, sollte der `push`-Trigger in `pages.yml` von
> diesem Feature-Branch auf `main` umgestellt werden.

## Vollversion starten (PowerShell)

Für den produktiven Einsatz (echte, persistente Daten – **kein** Demo-Modus) gibt es eigene
Start-Skripte im Ordner `scripts/`:

| Ziel                 | Befehl                                                          |
| -------------------- | -------------------------------------------------------------- |
| Windows              | `powershell -ExecutionPolicy Bypass -File scripts\start-windows.ps1` |
| macOS                | `pwsh ./scripts/start-macos.ps1`                               |
| Linux                | `pwsh ./scripts/start-linux.ps1`                               |
| Automatisch erkennen | `pwsh ./scripts/start-all.ps1`                                 |
| Browser (ohne Electron) | `pwsh ./scripts/start-browser.ps1` → `http://localhost:4173` |
| Android (PDF)        | `pwsh ./scripts/start-android.ps1`                             |
| iOS (PDF)            | `pwsh ./scripts/start-ios.ps1`                                 |

Für Windows/macOS/Linux startet das die interaktive App mit Datei-Speicherung; im Browser
läuft die Vollversion mit leerem Start (Speicherung im `localStorage`). Da Electron nicht auf
Android/iOS läuft, erzeugen die Mobil-Skripte die **Vollversion als PDF-Broschüre**.

### Alle Plattform-PDFs auf einmal (3D-Bilder + Copyright)

`scripts/create-all-pdfs.ps1` erzeugt für **jede** Plattform eine eigene PDF-Datei mit
**3D-Beispielbildern** und Copyright im Farbschema (Sandton/Beige, weiße Flächen, dunkelrote
Headlines):

```
pwsh ./scripts/create-all-pdfs.ps1
```

Ergebnis: `IT-Schulungsmassnahmen-Vollversion-{Windows,Mac,Android,iOS,Browser}.pdf`.
Einzeln geht es auch: `pwsh ./scripts/create-pdf.ps1 -Label Windows -Edition Vollversion`.

## Demo-Version starten (PowerShell)

Für eine schnelle Vorführung gibt es eine **Demo-Version** mit vorbefüllten Beispieldaten
(zwei Dozenten inkl. Aufgaben, Hausaufgaben und anstehenden Prüfungen). Die Demo nutzt eine
eigene Datendatei und lässt die echten Daten unangetastet.

PowerShell-Skripte (PowerShell 7+/`pwsh`; unter Windows auch Windows PowerShell) im Ordner `scripts/`.

**Desktop (interaktive App):**

| Plattform            | Befehl                                                        |
| -------------------- | ------------------------------------------------------------ |
| Windows              | `powershell -ExecutionPolicy Bypass -File scripts\demo-windows.ps1` |
| macOS                | `pwsh ./scripts/demo-macos.ps1`                              |
| Linux (Bonus)        | `pwsh ./scripts/demo-linux.ps1`                              |
| Automatisch erkennen | `pwsh ./scripts/demo-all.ps1`                                |

Diese Skripte prüfen Node.js, installieren bei Bedarf die Abhängigkeiten, setzen
`DASHBOARD_DEMO=1` und starten die App. Alternativ manuell:

```bash
# macOS/Linux
DASHBOARD_DEMO=1 npm start
```

**Browser (ohne Electron):**

Die Oberfläche läuft auch direkt im Browser – ganz ohne Electron-Installation. Daten werden
dabei lokal im Browser (`localStorage`) gespeichert, der Video-Chat nutzt Kamera/Mikrofon des
Browsers, und der Screenshot nutzt die Bildschirmfreigabe. Google Drive ist in der reinen
Browser-Demo nicht verfügbar.

```
pwsh ./scripts/demo-browser.ps1        # Server + Browser mit Beispieldaten (?demo=1)
# oder plattformunabhängig:
npm run serve                          # dann http://localhost:4173/?demo=1 öffnen
```

Ohne `?demo=1` startet die Browser-**Vollversion** leer (siehe `start-browser.ps1`).

> Empfehlung: über `http://localhost` starten (nicht per Doppelklick als `file://`), damit
> Kamera und Bildschirmfreigabe im sicheren Kontext funktionieren.

**Mobil (Android / iOS):**

Die App basiert auf **Electron** und läuft daher **nicht nativ auf Android oder iOS**.
Für Mobilgeräte ist die Demo die gestaltete **PDF-Broschüre** (mit Beispielbildern im
bekannten Farbschema). Die folgenden Skripte werden auf einem Rechner ausgeführt und
erzeugen die passende PDF, die anschließend auf das Gerät übertragen und dort geöffnet wird:

| Plattform | Befehl                             | Ergebnis                                   |
| --------- | ---------------------------------- | ------------------------------------------ |
| Android   | `pwsh ./scripts/demo-android.ps1`  | `IT-Schulungsmassnahmen-Demo-Android.pdf`  |
| iOS       | `pwsh ./scripts/demo-ios.ps1`      | `IT-Schulungsmassnahmen-Demo-iOS.pdf`      |

> Ein echtes natives Mobil-App-Paket würde einen anderen Technologie-Stack erfordern
> (z. B. eine PWA oder einen Capacitor-/React-Native-Wrapper) – das ist bewusst nicht Teil
> dieses Desktop-Projekts.

## Demo-PDF erzeugen

`scripts/create-pdf.ps1` erstellt eine gestaltete Demo-Broschüre als **PDF** im bekannten
Farbschema (Sandton/Beige-Hintergrund, weiße Folienfläche, dunkelrote Headlines) mit
Beispielbildern und Copyright-Zeile am unteren Rand:

```
pwsh ./scripts/create-pdf.ps1
```

Das Skript baut eine HTML-Datei und rendert sie über einen vorhandenen Chromium/Chrome/Edge
headless zu `IT-Schulungsmassnahmen-Demo.pdf`. Ist kein Browser vorhanden, bleibt die
HTML-Datei erhalten und kann manuell über „Drucken → Als PDF speichern" exportiert werden.

## Demo-Video &amp; 3D-Collage erzeugen

Auf der Download-Seite (Abschnitt „Demo ansehen") gibt es zusätzlich ein kurzes **Video**
und eine große **3D-Glanz-Collage** – beide zum Anschauen direkt auf der Seite und zum
Herunterladen:

```bash
node scripts/build-demo-collage.js   # -> downloads/IT-Schulungsmassnahmen-Demo-Collage.png
node scripts/build-demo-video.js     # -> downloads/IT-Schulungsmassnahmen-Demo.webm
```

- **Collage**: hochauflösendes Sammelbild aus Laptop-/Handy-Rahmen mit den App-Ansichten,
  im bekannten Sandton/Dunkelrot-Farbschema mit Hochglanz-Lichtstreifen.
- **Video**: `build-demo-video.js` braucht **kein ffmpeg** – Chromium nimmt eine animierte
  Canvas-Sequenz direkt über die im Browser eingebaute `MediaRecorder`-API (VP9-Encoder) auf
  und lädt das Ergebnis als `.webm` herunter. Die Aufnahme läuft in Echtzeit (~15 Sekunden).
  **Ohne Ton** – es stand keine Hintergrundmusik zur Verfügung.

Beide Skripte benötigen nur einen lokal vorhandenen Chromium/Chrome (`CHROME_PATH` env var
zum Überschreiben des Auto-Erkennungspfads).

## Tests & CI

Automatisierte Tests laufen mit dem in Node eingebauten Test-Runner (`node:test`, keine
Zusatz-Abhängigkeit nötig):

```bash
npm test
```

Enthalten sind reine Logik-Tests (`test/state.test.js`, `test/calendar.test.js`) sowie ein
**echter Integrationstest** für den Signaling-Server (`test/signaling-server.test.js`): er
startet den echten Serverprozess und verbindet echte WebSocket-Clients, um Beitritt,
Signaling-Weiterleitung, Broadcast und die Dozenten-Daten-Synchronisation zu prüfen – keine
Mocks der Serverlogik.

`.github/workflows/ci.yml` führt bei jedem Push/PR automatisch Syntax-Checks aller
JavaScript-Dateien sowie `npm test` aus – getrennt vom Versions-Tag-Release-Workflow
(`build-release.yml`) und vom PWA-Pages-Deploy (`pages.yml`).

## Installation (für Entwicklung)

```bash
npm install
```

## Starten (Entwicklung)

```bash
npm start
```

## Code-Struktur (renderer/js/)

Die Oberflächen-Logik ist in `renderer/js/` in fachliche Module aufgeteilt (keine einzelne
1800-Zeilen-Datei mehr). Es sind klassische `<script>`-Dateien ohne `type="module"` und ohne
eigene IIFE-Klammer je Datei – sie teilen sich dadurch bewusst dieselbe globale Umgebung
(`let`/`const`/Funktionsdeklarationen auf Top-Level sind über Dateigrenzen hinweg sichtbar,
solange keine Datei sie in einer eigenen Closure versteckt). Ladereihenfolge in `index.html`:

1. `state.js` – gemeinsamer Grundzustand (Dozenten-Daten, DOM-Referenzen, `persist()`, `findDozent()`, …)
2. `toast.js` – Kurzmeldungen
3. `dozenten.js` – Tabs, Listen, Chat-Panel, Panel-Rendering
4. `toolbar-screenshot.js` – Werkzeugleiste, Screenshot & Sniping
5. `room-client.js` – Netzwerk-Client für den echten Mehrgeräte-Video-Chat (WebSocket + WebRTC)
6. `video-chat.js` – Video-Live-Chat/Unterricht: Teilnehmer, Moderation, Lektions-Chat, Privat-/Gruppenchat
7. `file-share.js` – Dateifreigabe im Video-Chat-Fenster
8. `presentation.js` – PowerPoint-Präsentation teilen
9. `drive-settings.js` – Google-Drive-Einstellungen
10. `homework.js` – Ordner: Hausaufgaben
11. `calendar.js` – Ordner: Kalender
12. `app-init.js` – **muss zuletzt geladen werden**: Event-Verdrahtung und App-Start (`init()`)

> Wird eine neue Datei ergänzt, unbedingt vor `app-init.js` in `index.html` einbinden (und ggf.
> in `renderer/sw.js`s `PRECACHE_URLS` sowie den entsprechenden CACHE_NAME-Versionszähler pflegen).

## Desktop-Anwendung bauen

```bash
npm run dist
```

Erzeugt eine installierbare Desktop-Anwendung (Windows/macOS/Linux) im Ordner `dist/`.
