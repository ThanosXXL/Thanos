# Code-Signierung für Pharma-Tech-Installer

Diese Anleitung beschreibt, was du besorgen und wo du es hinterlegen musst, damit
die Installer signiert gebaut werden. Ohne diese Secrets baut der Workflow
weiterhin ganz normal unsignierte Installer — nichts bricht, solange du das
noch nicht eingerichtet hast.

## 1. Windows: Authenticode-Zertifikat

**Was besorgen:** Ein "Code Signing"-Zertifikat (`.pfx`-Datei) von einer
Zertifizierungsstelle, z. B.:
- DigiCert (~300–500 €/Jahr)
- Sectigo/SSL.com (günstiger, teils ~150–250 €/Jahr)
- SignPath.io (für Open-Source-Projekte teils kostenlos)

**Was die Zertifizierungsstelle von dir verlangt:** Firmennachweis (Handelsregisterauszug
o. Ä.) oder Einzelunternehmer-Identitätsnachweis — Ausstellung dauert oft
1–5 Werktage.

**Was du danach ins Repo einträgst** (GitHub → Settings → Secrets and variables
→ Actions → "New repository secret"):

| Secret-Name | Wert |
|---|---|
| `WIN_CSC_LINK` | Die `.pfx`-Datei, base64-kodiert als ein Textblock |
| `WIN_CSC_KEY_PASSWORD` | Das Passwort, das du beim Export der `.pfx` vergeben hast |

Base64 erzeugen:
```bash
# macOS/Linux:
base64 -w0 mein-zertifikat.pfx > cert.b64   # Inhalt von cert.b64 in das Secret einfügen

# Windows (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("mein-zertifikat.pfx")) | Set-Clipboard
```

## 2. macOS: Apple Developer Program + Notarisierung

**Was besorgen:**
1. Ein **Apple Developer Program**-Account (99 $/Jahr, auf developer.apple.com)
2. Darin ein **"Developer ID Application"-Zertifikat** erstellen und als `.p12`
   exportieren (über Xcode oder das Developer-Portal + Schlüsselbund)
3. Ein **App-spezifisches Passwort** für dein Apple-ID-Konto erzeugen
   (appleid.apple.com → Sicherheit → App-spezifische Passwörter)
4. Deine **Team-ID** (im Developer-Portal unter Membership sichtbar, 10-stelliger Code)

**Secrets im Repo:**

| Secret-Name | Wert |
|---|---|
| `MAC_CSC_LINK` | Die `.p12`-Datei, base64-kodiert (siehe Befehl oben) |
| `MAC_CSC_KEY_PASSWORD` | Passwort, das du beim `.p12`-Export vergeben hast |
| `APPLE_ID` | Deine Apple-ID-E-Mail-Adresse |
| `APPLE_APP_SPECIFIC_PASSWORD` | Das app-spezifische Passwort aus Schritt 3 |
| `APPLE_TEAM_ID` | Deine 10-stellige Team-ID aus Schritt 4 |

electron-builder notarisiert automatisch, sobald alle drei `APPLE_*`-Secrets
gesetzt sind — kein weiterer Konfigurationsschritt nötig.

## 3. Linux

AppImages werden in der Praxis nicht auf die gleiche Art codesigniert — hier
gibt es kein vergleichbares Betriebssystem-Sicherheitsgate wie SmartScreen
oder Gatekeeper. Nichts zu tun.

## Was sich danach ändert

| Plattform | Ohne Signierung | Mit Signierung |
|---|---|---|
| Windows | SmartScreen-Warnung, 2 Klicks zum Fortfahren | Installer öffnet direkt |
| macOS | Rechtsklick → "Öffnen" nötig | Doppelklick genügt |
| Linux | `chmod +x` einmalig | unverändert |

Der `pharmatech-release.yml`-Workflow liest diese Secrets automatisch beim
nächsten Release-Build — du musst am Workflow selbst nichts mehr ändern.
