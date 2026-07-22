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

## Installation (für Entwicklung)

```bash
npm install
```

## Starten (Entwicklung)

```bash
npm start
```

## Desktop-Anwendung bauen

```bash
npm run dist
```

Erzeugt eine installierbare Desktop-Anwendung (Windows/macOS/Linux) im Ordner `dist/`.
