# Datenschutz und Sicherheit in Allgemein Docs

Stand: Version mit Verschlüsselung, Anmeldung und DSGVO-Werkzeugen. Dieses Dokument beschreibt, was die Software technisch leistet und was die Praxis selbst organisieren muss. Es ist keine Rechtsberatung. Vor dem Echtbetrieb sollten die Praxisleitung und eine Datenschutzbeauftragte oder ein Datenschutzbeauftragter die Texte prüfen.

## 1. Was die Software technisch leistet

| Anforderung (DSGVO) | Umsetzung |
|---|---|
| Vertraulichkeit, Art. 32 (Verschlüsselung) | Alle Praxisdaten liegen als ein AES-256-GCM-Block in der Datei. Der Datenschlüssel ist zufällig und wird pro Benutzer mit einem Schlüssel aus dessen Passwort verpackt (PBKDF2-HMAC-SHA256, 600.000 Runden). Ohne Passwort oder Wiederherstellungsschlüssel ist kein Zugriff möglich. Implementierung: `renderer/vault.js`, getestet in `test/vault.test.js`. |
| Zugangskontrolle | Anmeldung mit persönlichem Passwort (mindestens 12 Zeichen, keine gängigen Wörter), Verzögerung nach Fehlversuchen, automatische Sperre nach einstellbarer Inaktivität, Sperre mit Strg+L. |
| Zugriffskontrolle | Rollen Inhaber/in, Arzt/Ärztin, Praxispersonal, Nur Lesen. Menüs und Aktionen sind nach Rolle eingeschränkt. |
| Eingabe- und Zugriffskontrolle | Protokoll als Hash-Kette (SHA-256): Anmeldungen, Aktenzugriffe, Ausstellen von Rezepten, Krankmeldungen, Überweisungen, Exporte, Löschungen, Benutzer- und Rollenänderungen. Es speichert nur Verweise, keine Gesundheitsdaten. Integritätsprüfung und CSV-Export in der App. |
| Weitergabekontrolle | Keine Netzwerkverbindung, keine Telemetrie. Das Programm blockiert alle Internetanfragen (`webRequest`), verweigert Berechtigungen und neue Fenster. Schriften sind lokal eingebunden. |
| Verfügbarkeit | Atomares Speichern mit Sicherheitskopie (`.bak`), verschlüsselte Datensicherung (`.adbackup`), Wiederherstellungsschlüssel. |
| Datenschutz durch Voreinstellung, Art. 25 | Namen im Wartezimmer standardmäßig gekürzt, Rollen mit minimalen Rechten, kurze Standardwerte für automatische Sperre. |
| Informationspflicht, Art. 13 | Vorlage „Datenschutzhinweis“, Dokumentation der Aushändigung je Akte. |
| Einwilligung, Art. 7 | Einwilligungen je Akte (Terminerinnerung, Befundübermittlung, Recall, Fotodokumentation) mit Datum und Widerruf. Vorlage „Einwilligungserklärung“. |
| Auskunft, Art. 15 | Auskunftsblatt zum Drucken und Datenkopie als Datei. |
| Berichtigung, Art. 16 | Akten und Einträge sind bearbeitbar. |
| Löschung, Art. 17 | Aufbewahrungsfrist je Akte (Standard 10 Jahre nach dem letzten Kontakt, § 630f Abs. 3 BGB), Liste löschfälliger Akten, Löschung mit Begründung und Protokolleintrag. |
| Einschränkung, Art. 18 | Akte sperren: keine neuen Einträge, Sperrvermerk sichtbar. |
| Übertragbarkeit, Art. 20 | Export der Akte als JSON. |
| Anfragenregister, Art. 12 | Betroffenenanfragen mit Monatsfrist und Überfälligkeitswarnung. |
| Meldung von Pannen, Art. 33 und 34 | Pannenregister mit 72-Stunden-Zähler und Entwurf der Meldung an die Aufsichtsbehörde. |
| Verzeichnis von Verarbeitungstätigkeiten, Art. 30 | Vorbelegtes, bearbeitbares Verzeichnis für eine Hausarztpraxis. |
| Technische und organisatorische Maßnahmen, Art. 32 | Automatisch aus den Einstellungen erzeugte Liste (Druck zusammen mit dem Verzeichnis). |

## 2. Was die Praxis selbst tun muss

- Computer und Betriebssystem absichern: Festplattenverschlüsselung, Updates, Virenschutz, Bildschirmsperre, getrennte Windows-Konten.
- Wiederherstellungsschlüssel ausdrucken und getrennt vom Computer sicher aufbewahren. Ohne Passwort und Schlüssel sind die Daten verloren.
- Regelmäßig verschlüsselte Sicherungen erstellen und an einem getrennten Ort aufbewahren. Das Wiedereinspielen einmal testen.
- Beschäftigte auf Vertraulichkeit und Schweigepflicht verpflichten (§ 203 StGB) und schulen.
- Auftragsverarbeitungsverträge (Art. 28) mit allen Dienstleistern schließen, die Zugriff auf die Daten haben können (zum Beispiel IT-Betreuung).
- Datenschutzbeauftragte/n benennen, wenn die gesetzlichen Schwellen erreicht sind (§ 38 BDSG), und die Aufsichtsbehörde im Verzeichnis eintragen.
- Datenschutz-Folgenabschätzung prüfen (Art. 35). Für kleine Einzelpraxen ist sie oft nicht erforderlich, die Entscheidung ist zu dokumentieren.
- Die Beispieldaten vor dem Echtbetrieb löschen.

## 3. Grenzen und ehrliche Hinweise

- Die Software ist kein zertifiziertes Praxisverwaltungssystem und nicht an die Telematikinfrastruktur angebunden. Karte, E-Rezept und KIM-Versand sind Simulationen.
- Die Rollen- und Berechtigungsprüfung findet in der Anwendung statt. Sie schützt vor Fehlbedienung und regelt die Arbeit im Alltag. Wer die Datei samt Passwort und Programmcode kontrolliert, ist nicht durch Rollen eingeschränkt. Der Schutz gegen Dritte kommt aus der Verschlüsselung.
- Benutzernamen stehen unverschlüsselt in der Datei (für die Anmeldeauswahl). Fehlgeschlagene Anmeldungen werden dort ohne Authentifizierung vermerkt und beim nächsten Login gemeldet.
- Der Schlüssel liegt während der Sitzung im Arbeitsspeicher. Gegen Schadsoftware mit Zugriff auf den laufenden Rechner hilft nur die Absicherung des Rechners.
- Texte (Datenschutzhinweis, Einwilligung, Auskunft, Meldung, Verzeichnis) sind Muster und müssen geprüft werden.

## 4. Technische Eckdaten

- Dateiformat: `{ vault: 2, kdf, users[], recovery, events[], iv, data, saved }`. Alles in `data` ist AES-256-GCM mit zusätzlich authentifiziertem Etikett (`allgemein-docs/v2/data`).
- Die Datei ist nur für den Benutzer lesbar (Modus 0600) und wird atomar geschrieben.
- Electron: `contextIsolation`, `sandbox`, kein `nodeIntegration`, Content-Security-Policy ohne externe Quellen (`connect-src 'none'`), Prüfung des IPC-Absenders, Entwicklerwerkzeuge nur in der Entwicklung.
- Tests: `npm test` (Verschlüsselung), `NODE_PATH=$(npm root -g) node test/e2e.js` (Einrichtung, Sperre, Anmeldung, Rollen, Protokoll, Wiederherstellung).
- Die Web-App (PWA) nutzt dieselbe Verschlüsselung. Die Daten liegen verschlüsselt im Browser (localStorage) dieses Geräts.
