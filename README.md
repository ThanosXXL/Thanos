# Dozenten Dashboard

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
