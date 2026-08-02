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

**Hinweis zur Signatur:** Solange kein eigener Signing-Key hinterlegt ist, sind die
Release-Builds mit dem automatisch generierten Debug-Zertifikat signiert. Das reicht zum
Sideloading auf dem eigenen Handy ("Installation aus unbekannten Quellen" erlauben), aber
**nicht** für eine Veröffentlichung im Play Store oder Weitergabe an andere Nutzer.

Um einen echten Release-Key zu nutzen: Keystore erzeugen (`keytool -genkey -v -keystore
release.keystore -alias freshtrades -keyalg RSA -keysize 2048 -validity 10000`) und die
folgenden vier Properties setzen – lokal in `~/.gradle/gradle.properties` (niemals in dieser
Datei/im Repo, da geheim!) oder in CI als `-P`-Flags aus GitHub Secrets:

```
RELEASE_STORE_FILE=/pfad/zu/release.keystore
RELEASE_STORE_PASSWORD=...
RELEASE_KEY_ALIAS=freshtrades
RELEASE_KEY_PASSWORD=...
```

Sind alle vier gesetzt, verwendet `assembleLiveRelease`/`assembleDemoRelease` automatisch
diesen Key statt des Debug-Zertifikats.

## Berechtigungen

Die App fragt beim ersten Tippen auf das Mikrofon-Symbol nach der Aufnahme-Berechtigung
(`RECORD_AUDIO`), um die Sprach-zu-Text-Erkennung von Android zu nutzen.

## Sniping-Screenshots: Speicherort

Beim ersten Antippen von Sniping öffnet sich ein Ordner-Auswahldialog (Android-eigener
Speicherzugriff, kein Zugriff auf die öffentliche Bildergalerie). Danach fragt die App, ob
dieser Ordner für zukünftige Screenshots gemerkt werden soll:

- **"Immer in diesem Ordner speichern"** – der Ordner wird dauerhaft gespeichert
  (`SharedPreferences`), zukünftige Screenshots landen dort ohne erneute Nachfrage.
- **"Nur dieses Mal"** – der Screenshot wird einmalig dort gespeichert, beim nächsten
  Sniping wird erneut nach einem Ordner gefragt.
