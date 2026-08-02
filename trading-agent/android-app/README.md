# FreshTrades – Android

Native Android-App (Kotlin) mit eingebetteter Google-Suche und einer schwarz-goldenen
Werkzeugleiste: Mikrofon-Spracheingabe, Sniping-Umschalter, Vorlesen (Sprachausgabe) und
Speichern unter.

## Voraussetzungen

- Android Studio (aktuelle Version) oder JDK 17 + Android SDK (compileSdk 34) im Terminal
- Der Ordner `android-app/` in Android Studio als Projekt öffnen

## Starten (Entwicklung)

In Android Studio: **Run ▶** auf einem Gerät/Emulator.

Alternativ im Terminal:

```bash
./gradlew installLiveDebug
```

## APK bauen

```bash
./gradlew assembleLiveRelease   # normale Version
./gradlew assembleDemoRelease   # Demo-Variante (Banner "Demo-Modus")
```

Die APKs liegen danach unter `app/build/outputs/apk/live/release/` bzw.
`app/build/outputs/apk/demo/release/`.

**Hinweis zur Signatur:** Die Release-Builds sind bewusst mit dem automatisch generierten
Debug-Zertifikat signiert (kein eigener Signing-Key hinterlegt). Das reicht zum Sideloading
auf dem eigenen Handy ("Installation aus unbekannten Quellen" erlauben), aber **nicht** für
eine Veröffentlichung im Play Store – dafür müsste ein echter Release-Signing-Key in
`app/build.gradle.kts` (`signingConfigs`) hinterlegt werden.

## Berechtigungen

Die App fragt beim ersten Tippen auf das Mikrofon-Symbol nach der Aufnahme-Berechtigung
(`RECORD_AUDIO`), um die Sprach-zu-Text-Erkennung von Android zu nutzen.
