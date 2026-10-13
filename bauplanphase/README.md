# Bauplanphase

Eigenständige Desktop-App (Electron) für den täglichen Baustellenreport. Kein Bezug zu den anderen
Projekten in diesem Repository – eigene Codebasis, eigener Prozess, eigene Datenablage.

## Funktionen

- **Tagesreport**: Tageseinträge (Bautagebuch, Wetter, Besonderheiten) mit Wochen-/Monatskalender,
  automatisches Speichern (Autosave)
- **Status**: Bauabschnitt sowie Wochen-/Monatsziel per Regler
- **Bestellstatus**: Materialbestellungen mit Status "Ausstehend"/"Geliefert"
- **Screenshots**: Fotos/Screenshots pro Baustelle (client-seitig verkleinert, max. 60 Stück)
- **Reminder**: Hinweis ab 12:00 Uhr, solange der Tagesreport des Tages noch nicht ausgefüllt ist

Alle Daten werden lokal im Benutzerdatenverzeichnis der App gespeichert (`bauplanphase-data.json`) und
bleiben nach dem Neustart erhalten.

## Sicherheit (Härtung)

Gleiche Härtung wie das Dozenten Dashboard in diesem Repository:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; DevTools nur im nicht
  gepackten Build
- Strikte `Content-Security-Policy` (`default-src 'none'`, nur `'self'` für Skripte/Styles/Bilder,
  `connect-src 'none'` – die App stellt zur Laufzeit keinerlei Netzwerkverbindungen her)
- Anwendungsmenü entfernt, keine Navigation weg von der Oberfläche, keine Popups/neuen Fenster
- Kamera-/Mikrofon-/Standort-/Benachrichtigungs-Anfragen werden grundsätzlich abgelehnt
- Schreibzugriffe auf die Datendatei sind validiert, größenbegrenzt (40 MB), atomar (temp + rename)
  und mit `0600`-Rechten versehen

## Datenschutz (DSGVO)

- **Rein lokale Verarbeitung:** Alle Daten werden ausschließlich lokal in `bauplanphase-data.json`
  gespeichert. Keine Cloud-Synchronisierung, kein Server, keine Telemetrie.
- **Datenportabilität (Art. 20 DSGVO):** Über den Button **„Export"** im Kopfbereich lässt sich der
  gesamte Datenbestand jederzeit als JSON-Datei an einem frei wählbaren Ort speichern.
- **Recht auf Löschung (Art. 17 DSGVO):** Über **„Löschen"** (mit Bestätigungsdialog) lassen sich
  alle gespeicherten Tagesreporte, Status, Bestellungen und Screenshots unwiderruflich entfernen.
- **Eigenverantwortung bei gemeinsam genutzten Rechnern:** Die Datendatei liegt unverschlüsselt auf
  der Festplatte. Auf gemeinsam genutzten oder nicht vollplattenverschlüsselten Geräten entsprechend
  sensibel mit den gespeicherten Berichten/Fotos umgehen.
- **Impressum-Platzhalter:** `renderer/impressum.html` (über den Footer-Link „Impressum &
  Datenschutz" erreichbar) enthält ein vorausgefülltes Impressum-Gerüst nach § 5 TMG / § 18 MStV
  mit `[Platzhalter: ...]`-Markierungen. **Vor einer echten Veröffentlichung müssen diese durch die
  tatsächlichen Angaben (Name/Firma, Anschrift, Kontakt, ggf. Registereintrag/USt-ID) ersetzt
  werden** – ein unausgefülltes Impressum erfüllt die gesetzliche Impressumspflicht nicht.

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

## Web-App / PWA (inkl. iOS)

`renderer/index.html` funktioniert auch direkt in jedem Browser und lässt sich dank `manifest.json` +
Service Worker als Web-App installieren ("Zum Home-Bildschirm hinzufügen"). Für iOS ist das aktuell der
einzige Installationsweg: Eine echte `.ipa`-Datei zum direkten Installieren erfordert ein kostenpflichtiges
Apple-Developer-Konto (Code-Signierung) – das ist eine Einschränkung von Apple, keine dieses Projekts.

## Releases (CI)

`.github/workflows/bauplanphase-release.yml` baut bei jedem Tag `bauplanphase-v*` (z. B.
`bauplanphase-v1.0.0`) automatisch Installer für Windows/macOS/Linux sowie ein Android-APK und
veröffentlicht alle vier Dateien gemeinsam in einem GitHub Release. Eigener Tag-Präfix, damit es nie mit
den `v*`-Tags des Dozenten Dashboards oder den anderen Projekten in diesem Repository kollidiert. Lässt
sich auch manuell über **Actions → Build & Release Bauplanphase → Run workflow** anstoßen.
