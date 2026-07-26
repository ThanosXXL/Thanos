# MyWorkOut

MyWorkOut ist eine plattformübergreifende Fitness-App: Tagesaufgaben mit
Erledigt-Kennzeichnung, Trainingspläne mit wechselnden Muskelpartien und ein
kurzer Vorab-Dialog (Ziel → Muskelpartien → "Okay, lass uns beginnen!"), bevor
das Training startet. Oben in der Kopfzeile lässt sich die Hintergrundmusik
(Samba, Lounge, House, Motivation) auswählen, und sobald ein Training läuft
zeigt ein Badge dort die Programmdauer (z. B. „12 Wochen“) an. Design:
frisches Gelb mit schwarzer, glänzender 3D-Schrift.

Die App ist als ein einziges Vanilla-HTML/CSS/JS-Projekt gebaut (kein
Build-Schritt nötig) und läuft dadurch unverändert auf **5 Plattformen**:

| Plattform | Technik |
|---|---|
| Web (Browser/PWA) | direkt `index.html`, installierbar via `manifest.json` + `sw.js` |
| Windows | Electron (`electron-builder`, NSIS) |
| macOS | Electron (`electron-builder`, DMG) |
| Android | Capacitor-Wrapper um dieselbe Web-App |
| iOS | Capacitor-Wrapper um dieselbe Web-App |

(Linux ist als Bonus über dieselbe Electron-Konfiguration als AppImage
erhältlich.)

## Struktur

```
fitness-app/
  index.html       Grundgerüst: Kopfzeile, Tabs, Modals
  css/style.css     Gelb/Schwarz-Theme, responsive
  js/data.js        Übungen, Muskelgruppen, Wochenplan, Musikgenres
  js/audio.js       Wiedergabe der Hintergrundmusik
  js/exercise-icons.js  Prozedurale Übungs-Piktogramme (2 Posen je Übung)
  js/app.js         State, Rendering, Trainings-Flow
  assets/audio/     Platzhalter-Loops je Musikrichtung (synthetisch erzeugt)
  assets/icons/     App-Icons für Manifest/Homescreen
  manifest.json     PWA-Manifest
  sw.js             Service Worker (Offline-Cache)
  electron/         Desktop-Wrapper (main.js, preload.js)
  capacitor.config.json  Mobile-Wrapper-Konfiguration
```

## Funktionen

- **Musikauswahl**: Kopfzeile mit Play/Pause und vier Genres (Samba, Lounge,
  House, Motivation). Die mitgelieferten `assets/audio/*.wav` sind kurze,
  synthetisch erzeugte Platzhalter-Loops (keine echten Musiktitel) – für den
  produktiven Einsatz durch lizenzierte Tracks gleichen Dateinamens ersetzen.
- **Tagesaufgaben**: Liste mit Checkbox → Häkchen bei Erledigung. Aufgaben
  können ergänzt/entfernt werden; der Erledigt-Status setzt sich täglich
  automatisch zurück. Zwei anklickbare Modi: **Feste Liste** oder **Alle 3
  Tage mischen** – im Mischmodus wird alle drei Tage automatisch eine neue
  Auswahl von vier Aufgaben aus einem größeren Pool (`TASK_POOL` in
  `js/data.js`) zusammengestellt.
- **Trainingspläne**: Wochentabelle, die die Muskelpartien tageweise
  wechselt (z. B. Montag Brust & Arme, Dienstag Rücken, Mittwoch Beine …).
  Jede Übung zeigt 2 Piktogramme (Start-/Endposition einer Wiederholung) im
  Gelb/Schwarz-Glanzstil der App – prozedural als SVG-Strichfiguren erzeugt
  (`js/exercise-icons.js`), da keine echten Übungsfotos vorliegen.
- **Trainingsstart-Dialog**: Vor dem Training wird zuerst das Ziel
  (Ausdauertraining, Muskelaufbau, Muskeln definieren) und danach die
  gewünschten Muskelpartien abgefragt (Mehrfachauswahl). Nach der Auswahl
  erscheint kurz die Ansage **„Okay, lass uns beginnen!“**, bevor die aktive
  Übungsliste mit Sätzen/Wiederholungen passend zum gewählten Ziel angezeigt
  wird. Solange die Einheit läuft, zeigt die Kopfzeile die geplante
  Programmdauer des gewählten Ziels (Ausdauertraining 8, Muskelaufbau 12,
  Muskeln definieren 10 Wochen).

## Entwicklung & Build je Plattform

```bash
npm install          # installiert Electron/Capacitor-Tooling
npm run web           # startet einen lokalen Server unter http://localhost:8080
npm start              # startet die Desktop-App (Electron) mit Live-Dateien
npm run dist            # baut Windows-/macOS-/Linux-Installer nach dist/
```

### Android / iOS (Capacitor)

Capacitor verpackt dieselbe Web-App als natives Android-/iOS-Projekt. Dafür
sind lokal Android Studio bzw. Xcode nötig (in dieser Umgebung nicht
verfügbar, daher nur die Konfiguration vorbereitet):

```bash
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # öffnet Android Studio
npx cap open ios        # öffnet Xcode
```

Es gibt keine separate Test-Suite; Änderungen werden durch `npm run web` im
Browser bzw. `npm start` in Electron geprüft.
