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
