# VideoWelt Mobile

Die mobile Schwester-App von [VideoWelt](../videowelt) – ein schwarz-goldener Video-Editor für
Android und iOS aus einer gemeinsamen Codebasis (Expo / React Native + TypeScript). Läuft
komplett eigenständig, teilt keine Abhängigkeiten, keinen Build und keine CI mit der
Desktop-App, `it-schulung/`, `omniroute/` oder dem Dozenten-Dashboard.

## Warum ein eigenes Projekt?

Die Desktop-Version von VideoWelt ist eine Electron-App (Chromium + Node.js) – das läuft
technisch nicht auf Handys. VideoWelt Mobile ist deshalb eine komplett neue App mit anderer
Technologie (React Native statt Electron, natives ffmpeg statt `ffmpeg-static`/`fluent-ffmpeg`),
die aber dieselbe Design-Sprache (Schwarz/Gold) und ein vergleichbares Kernkonzept verfolgt:
Medien importieren → Timeline aus Clips bauen → trimmen, Tempo/Effekte anpassen → Text-Overlays
→ export.

## Funktionsumfang

- **Medien-Import** (`src/screens/ImportScreen.tsx`): Videos aus der Foto-/Videomediathek des
  Geräts importieren (`expo-image-picker`), inkl. Best-Effort-Probing von Dauer/Auflösung/Audio-
  Spur via `FFprobeKit` (nur im Dev-Client/Standalone-Build verfügbar, siehe unten).
- **Timeline** (`src/screens/TimelineScreen.tsx`): Clips hinzufügen, per Pfeiltasten neu
  ordnen, duplizieren, löschen; pro Clip: Start/Ende trimmen, Geschwindigkeit (0.25×–2×),
  Helligkeit/Kontrast/Sättigung, Graustufen/Sepia, Stummschaltung. Vorschau über `expo-video`.
- **Text-Overlays** (`src/screens/TextOverlayScreen.tsx`): Mehrere Textfelder mit Farbe,
  Schriftgröße, Position (X/Y) und Start-/Endzeit.
- **Export** (`src/screens/ExportScreen.tsx`): Plattform-Presets (YouTube 16:9/4K, YouTube
  Shorts/Reels/Story 9:16, Instagram/Facebook-Feed 1:1, HD/SD) und echter nativer Export via
  `ffmpeg-kit-react-native` (Trim, Tempo, Farb-/Effektfilter, Concat, eingebrannte Text-Overlays
  via `drawtext`), Fortschrittsanzeige, Speichern in der Mediathek und Teilen.
- **Projekt** (`src/screens/ProjectScreen.tsx`): Projekt umbenennen, als `.vwmproj`-JSON-Datei
  speichern/teilen/laden, neues Projekt beginnen. Der aktuelle Stand wird zusätzlich laufend
  automatisch in `AsyncStorage` gesichert und beim nächsten App-Start wiederhergestellt.

Der komplette State (`src/state/types.ts`, `src/state/ProjectStore.tsx`) ist eine eigenständige,
zu `.vwproj` der Desktop-App **nicht** kompatible Struktur (`.vwmproj`), da Mobile mit
Geräte-URIs statt absoluten Dateipfaden arbeitet.

## Testbarkeit: Expo Go vs. Dev-Client

`ffmpeg-kit-react-native` ist ein natives Modul – es kann grundsätzlich **nicht** in Expo Go
laufen (Expo Go bündelt nur einen festen Satz vorinstallierter nativer Module). Deshalb ist die
App bewusst so gebaut, dass sie in zwei Stufen nutzbar ist:

1. **Sofort, ganz ohne Build, mit Expo Go** (`npx expo start`, dann QR-Code mit der Expo-Go-App
   auf dem Handy scannen): Import, Timeline, Trimmen, Tempo, Effekte-Vorschau, Text-Overlays,
   Projekt speichern/laden funktionieren bereits vollständig. Der Export-Tab zeigt einen
   Hinweis, dass der native Export einen eigenen Build braucht (`isNativeExportAvailable()` in
   `src/export/ffmpegExport.ts` prüft das automatisch zur Laufzeit).
2. **Für den echten Video-Export** braucht es einen **Dev-Client** oder **Standalone-Build**
   (`expo-dev-client`/`eas build`), weil dabei `ffmpeg-kit-react-native` mitkompiliert wird. Ein
   Expo-Config-Plugin (`plugins/withFfmpegKitFull.js`) schaltet dabei automatisch die
   `full-gpl`-Variante von ffmpeg-kit frei (die Standard-„min“-Variante hat weder `drawtext` noch
   den `libx264`-Encoder).

## Bekannte Einschränkung dieser Session

Diese Codebasis wurde in einer Cloud-Sandbox ohne Xcode, ohne Android-SDK/-Emulator und ohne
Zugriff auf `dl.google.com`/Maven (Netzwerk-Policy) entwickelt. Das heißt konkret:

- ✅ Geprüft: TypeScript kompiliert fehlerfrei (`npx tsc --noEmit`), der Metro-Bundler baut das
  JS-Bundle für **iOS und Android** ohne Fehler (`npx expo export --platform android/ios`), der
  Config-Plugin patcht `android/build.gradle` nachweislich korrekt (`ext.ffmpegKitPackage =
  "full-gpl"`) bei `expo prebuild`.
- ❌ Nicht geprüft: der native ffmpeg-Export wurde **nicht auf einem echten Gerät/Emulator**
  gegenüberstehend getestet (das ist in dieser Sandbox technisch nicht möglich) – anders als bei
  der Desktop-App, wo der komplette Export mehrfach live gegen echte Videodateien verifiziert
  wurde.

## App auf dein Handy bringen

### Schnell testen (kein Build nötig)

```bash
cd videowelt-mobile
npm install
npx expo start
```

QR-Code mit der **Expo Go**-App (Play Store/App Store) scannen. Import/Timeline/Text-Overlays
funktionieren sofort; der Export-Tab weist auf den nötigen Custom-Build hin.

### Echte installierbare App mit Video-Export (empfohlen: EAS Build)

Kostenloses Expo-Konto auf https://expo.dev anlegen, dann:

```bash
cd videowelt-mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview   # erzeugt eine installierbare .apk
eas build -p ios --profile preview        # braucht ein (kostenpflichtiges) Apple-Entwickler-Konto
```

Der Build läuft in Expos Cloud (nicht auf deinem Rechner) und dauert je nach Warteschlange
5–20 Minuten; am Ende bekommst du einen Download-Link für die `.apk` (Android, direkt
installierbar) bzw. eine `.ipa`/TestFlight-Einladung (iOS).

### Alternative: lokaler Build

Falls du lieber lokal baust (Android Studio bzw. Xcode auf einem Mac vorausgesetzt):

```bash
npx expo prebuild
npx expo run:android   # oder: npx expo run:ios
```

## Projektstruktur

```
videowelt-mobile/
  App.tsx                     Tab-Shell (Medien/Timeline/Text/Export/Projekt)
  app.json                    Expo-Konfiguration, Berechtigungen, Plugins
  eas.json                    EAS-Build-Profile (development/preview/production)
  plugins/withFfmpegKitFull.js  Config-Plugin: schaltet ffmpeg-kit auf "full-gpl"
  src/
    state/                    ProjectState-Typen + React-Context-Store (Autosave via AsyncStorage)
    screens/                  Die fünf Haupt-Screens
    components/               Button, LabeledSlider (wiederverwendete UI-Bausteine)
    export/                   ffmpegExport.ts (Filtergraph-Aufbau + FFmpegKit-Aufruf),
                               probeMedia.ts (FFprobeKit-Wrapper), presets.ts (Export-Auflösungen)
    theme/                    Farben/Spacing, an die Desktop-App angelehnt
```
