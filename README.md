# Dozenten Dashboard

Desktop-Dashboard (Electron) zur Verwaltung von bis zu vier Dozenten. Jeder Dozent hat drei Listen:

1. **Liste 1 – To-Do-Liste** (Aufgabenliste)
2. **Liste 2 – Offene Projekte**
3. **Liste 3 – Erledigte Projekte**

Projekte lassen sich per Klick von "Offene Projekte" nach "Erledigte Projekte" verschieben (und zurück).
Alle Daten werden lokal gespeichert (im Benutzerdatenverzeichnis der App) und bleiben nach dem Neustart erhalten.

## Baustelle — Tagesreport

Über den Link "Baustelle Tagesreport" im Header gelangt man zu einer zweiten Ansicht innerhalb derselben App:

- **Tagesreport**: Tageseinträge (Bautagebuch, Wetter, Besonderheiten) mit Wochen-/Monatskalender
- **Status**: Bauabschnitt sowie Wochen-/Monatsziel per Regler
- **Bestellstatus**: Materialbestellungen mit Status "Ausstehend"/"Geliefert"
- **Screenshots**: Fotos/Screenshots pro Baustelle (client-seitig verkleinert und lokal gespeichert)

Ein Reminder-Hinweis in der Kopfzeile macht ab 12:00 Uhr darauf aufmerksam, solange der Tagesreport des Tages
noch nicht ausgefüllt ist. Alle Daten werden ebenfalls lokal im Benutzerdatenverzeichnis der App gespeichert
(separat von den Dozenten-Daten).

## Live-Demo (Bauplanphase)

Unter `docs/demo.html` liegt eine eigenständige, interaktive Klick-Demo ("Bauplanphase") zum Zeigen der
Kernfunktionen (Tagesreport, Status, Bestellstatus, Screenshots, Team-Einladung) – ganz ohne Installation
im Browser. Die Demo speichert bewusst nichts dauerhaft (nur im Arbeitsspeicher des Browser-Tabs); ein
Banner weist darauf hin, dass in der echten App die Daten stattdessen per Cloud mit dem Team synchronisiert
würden.

So bekommt sie einen öffentlichen Link über GitHub Pages:

1. Repository-Einstellungen öffnen → **Settings → Pages**
2. Unter "Build and deployment" → **Source: Deploy from a branch** wählen
3. Branch auf diesen Branch (bzw. nach dem Merge auf den Standard-Branch) und Ordner **`/docs`** stellen
4. Speichern – GitHub zeigt danach die Demo-URL an (z. B. `https://<user>.github.io/<repo>/`)

Alternativ funktioniert `docs/demo.html` auch einfach lokal per Doppelklick im Browser, ganz ohne Server.

## Fertige Installer herunterladen (ohne Terminal)

Unter **[Releases](../../releases)** stehen fertig gebaute Dateien zum Anklicken bereit:

### Desktop

- Windows: `.exe` (Installer)
- macOS: `.dmg`
- Linux: `.AppImage`

Einfach die passende Datei für dein Betriebssystem herunterladen und ausführen – kein `npm install`,
kein Terminal nötig.

### Android

- `dozenten-dashboard-android.apk` direkt herunterladen und antippen.
- Da die App nicht über den Play Store verteilt wird, fragt Android beim ersten Mal nach der Erlaubnis
  **"Installation aus unbekannter Quelle zulassen"** – das ist normal für Apps außerhalb des Play Stores
  und muss einmalig bestätigt werden.
- Die APK ist selbstsigniert (Debug-Signatur); Daten werden lokal auf dem Gerät gespeichert.

### iOS (iPhone/iPad)

Eine echte, direkt installierbare `.ipa`-Datei ist ohne kostenpflichtiges Apple-Developer-Konto
(Code-Signierung, App Store bzw. TestFlight-Review) technisch nicht möglich – das ist eine
Einschränkung von Apple, keine Einschränkung dieses Projekts. Stattdessen läuft die App als
**installierbare Web-App (PWA)**:

1. Die Datei `renderer/index.html` (bzw. eine gehostete Version davon) in **Safari** öffnen.
2. Auf das Teilen-Symbol tippen → **"Zum Home-Bildschirm"**.
3. Die App erscheint danach als eigenes Icon auf dem Home-Bildschirm und startet im Vollbild,
   ganz ohne Browser-Leiste.

Sobald ein Apple-Developer-Konto mit Zertifikat/Provisioning-Profil zur Verfügung steht, lässt sich
über das bereits vorbereitete Capacitor-Setup (siehe unten) zusätzlich eine echte iOS-App bauen
(`npx cap add ios`).

Neue Installer/APKs werden automatisch von GitHub Actions gebaut, sobald ein neuer Versions-Tag
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

## Android-App bauen (für Entwicklung)

Die Web-Oberfläche unter `renderer/` läuft dank [Capacitor](https://capacitorjs.com/) unverändert auch als
native Android-App (`android/`-Ordner). Persistiert wird dort über das `@capacitor/preferences`-Plugin statt
über Electron-IPC (siehe `renderer/platform-bridge.js`).

```bash
npx cap sync android
cd android
./gradlew assembleDebug
```

Das fertige, direkt installierbare APK liegt danach unter `android/app/build/outputs/apk/debug/app-debug.apk`.
In der CI (`.github/workflows/build-release.yml`) passiert das automatisch bei jedem Versions-Tag; das Ergebnis
landet als `dozenten-dashboard-android.apk` im GitHub Release.

## Web-App / PWA

`renderer/index.html` und `renderer/tagesreport.html` funktionieren auch direkt in jedem Browser (z. B. über
GitHub Pages oder einen beliebigen Webserver) und lassen sich dank `manifest.json` + Service Worker als
Web-App installieren ("Zum Home-Bildschirm hinzufügen" auf iOS/Android).
