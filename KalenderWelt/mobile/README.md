# KalenderWelt – Mobile (Android & iOS)

Dieser Ordner enthält die Capacitor-Konfiguration, die den gemeinsamen Web-Code aus
`../app` als native Android- und iOS-App verpackt. Die nativen Projektordner
`android/` und `ios/` sind **nicht** eingecheckt (siehe `.gitignore`) – sie werden
deterministisch aus `app/` erzeugt und müssen lokal einmalig generiert werden.

## Voraussetzungen

- Node.js + npm
- Für Android: Android Studio inkl. Android SDK
- Für iOS: **ein Mac mit Xcode** – iOS-Apps können ausschließlich auf macOS gebaut
  und signiert werden. Diese Cloud-Umgebung kann daher keinen iOS-Build erzeugen;
  die folgenden Schritte müssen auf einem Mac (oder einem macOS-CI-Runner)
  ausgeführt werden.

## Einrichtung

```bash
cd mobile
npm install

# Native Projekte erzeugen (einmalig, oder nach Löschen erneut)
npx cap add android
npx cap add ios      # nur auf macOS nötig/möglich

# Nach jeder Änderung an ../app die Web-Assets in beide Projekte übernehmen
npx cap sync
```

## Android

```bash
npx cap open android
# In Android Studio: Run ▶ auf Gerät/Emulator, oder Build > Generate Signed Bundle/APK
```

## iOS (nur auf macOS)

```bash
npx cap open ios
# In Xcode: Signing & Capabilities → eigenes Apple-Team wählen, dann Run ▶
```

## Verwendete native Plugins

- `@capacitor/local-notifications` – tägliche Termin-Erinnerung ab 7 Uhr, auch wenn
  die App geschlossen ist
- `@capacitor/filesystem` + `@capacitor/share` – erzeugte Word-Dateien im nativen
  Share-Sheet (E-Mail/WhatsApp/Signal/…) anbieten
- `@capacitor/browser` – externe Links (mailto, wa.me, signal.me) öffnen

## Bekannte Einschränkung: E-Mail-Postfach auf Mobilgeräten

Direkte IMAP/SMTP-Socket-Verbindungen sind aus einer Capacitor-WebView heraus nicht
zuverlässig möglich (Sandbox-Beschränkungen). Der E-Mail-Bereich der App spricht
deshalb auf allen Plattformen denselben Vermittlungsserver aus `../server` per
HTTPS an. Dieser Server muss erreichbar sein (lokal im WLAN oder öffentlich
gehostet) – die Server-Adresse lässt sich in der App unter `AppState.state.serverUrl`
anpassen.
