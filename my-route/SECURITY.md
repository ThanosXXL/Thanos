# Sicherheit – My Route

## Schwachstelle melden

Bitte melde Sicherheitslücken **vertraulich** über „Security → Report a vulnerability“ (privates Melden von Schwachstellen)
im GitHub-Repository – nicht als öffentliches Issue. Wir bestätigen den Eingang zeitnah und informieren dich über die Behebung.

## Unterstützte Versionen

Nur die jeweils **neueste Version** wird mit Sicherheitsupdates versorgt. Die Desktop-App holt sie beim Start automatisch
(Windows, Linux/AppImage; auf macOS ohne Apple-Signatur per Download-Seite).

## Schutzmaßnahmen im Überblick

**Desktop (Electron)**
- Sandbox, `contextIsolation`, kein Node-Zugriff in der Oberfläche; die Brücke (`preload.js`) ist eingefroren und bietet nur feste Funktionen.
- Jeder IPC-Aufruf wird geprüft: nur vom Hauptframe des eigenen Fensters (`lib/security.js → isTrustedSender`).
- Strenge Content-Security-Policy (`default-src 'none'`, kein Inline-Skript, keine Fremdverbindungen, Trusted Types); Netzwerkzugriffe laufen ausschließlich über den Hauptprozess.
- Keine Navigation weg von der lokalen Seite, keine Popups, keine Webviews, Berechtigungen (Kamera, Mikrofon, Standort …) werden verweigert, Zertifikatsfehler werden nicht übergangen.
- Externe Links nur zu festen Zielen (Google Maps, Apple Karten, OpenStreetMap, Release-Seite) und nur per `https`.
- Antworten externer Dienste werden mit Zeit- und Größenlimit gelesen, auf Zahlen reduziert und müssen vom erwarteten Host kommen.
- Daten: atomar geschrieben, Rechte `0600`, mit dem Schlüsselbund des Betriebssystems verschlüsselt (`safeStorage`), Sicherungskopie `.bak`; unlesbare Dateien werden beiseitegelegt statt überschrieben.
- Electron-Fuses: kein `RunAsNode`, keine `NODE_OPTIONS`/`--inspect`-Hintertür, App nur aus dem Archiv ladbar, Cookie-Verschlüsselung.
- Einzelinstanz-Sperre (kein paralleler Zugriff auf die Datendatei).

**Browser-/Android-Version**
- Dieselbe strenge CSP (inkl. Trusted Types), nur drei feste Verbindungsziele.
- Optionaler Passwortschutz: AES-GCM-256, Schlüssel per PBKDF2-SHA256 (600 000 Runden), Bremse bei Fehlversuchen.
- Android: App-Datensicherungen (`allowBackup`) und unverschlüsselter Netzwerkverkehr sind abgeschaltet.

**Updates**
- Update-Quelle ist fest eingebaut (`https://github.com/thanosxxl/thanos/releases/download/my-route-updates`), Dateien werden gegen den SHA-512-Hash aus `latest*.yml` geprüft; manipulierte Dateien werden abgelehnt.
- Downgrades und Vorabversionen sind ausgeschaltet.
- Prüfsummen aller Downloads: `SHA256SUMS.txt` im Release (APK zusätzlich als `.apk.sha256`).

**Entwicklung & Lieferkette**
- `npm run check` prüft den Quellcode auf gefährliche Muster und fehlende Schutzeinstellungen; `npm test` prüft Speicher, Verschlüsselung und Eingabeprüfungen.
- CI: reproduzierbare Installation nach Lockfile (`npm ci`), `npm audit`, minimale Berechtigungen, Dependabot für Abhängigkeiten und Actions.

## Bekannte Grenzen (ehrlich benannt)
- **Code-Signierung fehlt:** Windows-/macOS-Installer sind nicht signiert (SmartScreen/Gatekeeper warnen). Automatische Updates unter macOS erfordern eine Apple-Signatur; ohne sie bleibt der Weg über die Download-Seite. Mit einem Zertifikat lässt sich beides ergänzen.
- Die Android-APK ist debug-signiert (direkt installierbar, aber nicht für Stores). Für Updates ohne Neuinstallation sollte ein dauerhafter Release-Schlüssel verwendet werden.
- Auf Linux ohne Schlüsselbund (Secret Service/KWallet) bleibt die Datendatei durch Dateirechte (`0600`), aber nicht verschlüsselt.
- Browser-Version: ohne Passwortschutz liegen die Daten im lokalen Browser-Speicher; bei `file://`-Seiten teilen sich alle lokalen Dateien im Browser diesen Speicher – Passwortschutz einschalten, wenn das ein Risiko ist.
