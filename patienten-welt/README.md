# Patienten Welt

Die persönliche Gesundheits-App für Patientinnen und Patienten – Desktop-App (Windows, macOS, Linux) im Navy-Design mit weißer Open-Sans-Schrift, 3D-Hochglanz-Logo (Globus mit Herz) und Animationen. Gegenstück zu „Allgemein Docs“, aber vollständig getrennt: kein Datenaustausch, kein gemeinsamer Code, eigene Datei `patienten-welt-data.json`, eigene Schnittstelle `window.welt`.

**Meine Gesundheit:** Medikamente (Einnahmeplan), Meine Werte (Blutdruck-Tagebuch), Laborergebnisse (Ampel, Referenzbereich, Verlauf als Linie/Balken), Befunde, Vorsorge & Impfungen (Impfpass, Erinnerungen), Medikamentensuche (Beispielkatalog, ATC, Stärken)
**Organisation:** Meine Termine, E-Rezepte (QR-Code, Demo), Krankmeldungen (eAU-Status, druckbar), Überweisungen, Gesundheitskarte (3D-Karte), Praxis-Nachrichten
**System:** Demo & Medien (Video, Reel, Instagram-Bilder zum Download), Datenschutz & Sicherheit, Mein Profil

## Datenschutz und Sicherheit
- Beim ersten Start legt ein Assistent ein Passwort fest; alle Daten liegen als **AES-256-GCM-Tresor** (Schlüssel per PBKDF2, 600.000 Runden) in der Datei, dazu ein **Wiederherstellungsschlüssel** (`renderer/vault.js`). Der Hauptprozess sieht nur den undurchsichtigen Umschlag.
- Automatische Sperre, Strg+L, Verzögerung nach Fehlversuchen. Altdaten (Klartext oder frühere Schlüsselbund-Variante) werden beim Einrichten übernommen.
- Meine Daten: Auskunftsblatt (Art. 15), Datenkopie als JSON (Art. 20), unwiderrufliches Löschen (Art. 17). Verschlüsselte Sicherung `.pwbackup`, Einwilligungen, Sicherheits-Check.
- Keine Netzwerkverbindung, keine Telemetrie; alle Internetanfragen werden blockiert.

Beispieldaten sind frei erfunden. E-Rezept-QR-Codes, eAU-Status und Karte sind **Simulationen** ohne Anbindung an Praxen, Krankenkassen oder die Telematikinfrastruktur. Kein Ersatz für ärztliche Beratung.

```bash
npm install && npm start     # Entwicklung
npm test                     # Unit-Tests Tresor (node --test)
NODE_PATH=$(npm root -g) node test/e2e.js   # Playwright-E2E (Chromium)
npm run dist                 # Installer
```

Medien neu erzeugen (Playwright, ffmpeg): `cd marketing && node capture-shots.js && node build-instagram.js && node build-reel.js && node build-demo.js`. Release per Tag `patienten-welt-v1.1.0`.
