# Pharma-Tech Mobile

Android/iOS-Gegenstück zur Pharma-Tech-Desktop-App (`pharmatech-app/`). Statt die
neun Ansichten (Dashboard, Warenwirtschaft, Kasse, Kunden & Rezepte, Bestellungen,
Analysen, Team & Notizen, Datenübernahme, Einstellungen) nativ in React Native
nachzubauen, bettet die App den identischen, vollständig clientseitigen Prototyp
(`assets/www/index.html`, eine Kopie von `pharma-tech-prototype/index.html`) über
eine `react-native-webview`-Ansicht ein. Das ist bewusst anders als bei VideoWelt
Mobile: VideoWelt braucht echte native Videoverarbeitung (ffmpeg-kit), die eine
WebView nicht leisten kann — Pharma-Tech ist reine Demo-Oberfläche mit
Fake-Daten und keinen echten Backend-Aufrufen, für die eine WebView die
pragmatische Wahl ist.

`metro.config.js` fügt `html` zu `resolver.assetExts` hinzu, damit
`require('./assets/www/index.html')` als Asset gebündelt wird; `App.tsx` lädt es
per `Asset.fromModule(...).downloadAsync()` und reicht die lokale URI an die
WebView weiter.

## Befehle

```bash
npm install
npx expo start        # Entwicklung (Expo Go — react-native-webview ist dort unterstützt)
npx expo export --platform android   # Bundle-Check
npx expo export --platform ios       # Bundle-Check
eas build -p android --profile preview   # echter APK-Build über EAS
```

In dieser Sandbox wurde verifiziert: `npx tsc --noEmit` ist sauber, `expo export`
bündelt für Android und iOS fehlerfrei, und `expo prebuild --platform android`
erzeugt ein korrektes `android/app/build.gradle` mit
`applicationId "com.pharmatech.mobile"`. Ein echter Geräte-Build (APK/IPA) kann
hier nicht erzeugt werden (kein Android-SDK/Emulator, kein Xcode, kein
Proxy-Zugriff auf Google/Apple-Build-Infrastruktur) — das läuft über `eas build`
mit einem eigenen (kostenlosen) Expo-Account.

Teilt sich keine Dependencies, Build-Konfiguration oder CI mit der
Dozenten-Dashboard-App, `omniroute/`, `pharmatech-app/` oder den übrigen
Projekten in diesem Repository.
