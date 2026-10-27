# My Route – Datenschutz & technisch-organisatorische Maßnahmen

> Arbeitsgrundlage für die Datenschutz-Dokumentation. Sie beschreibt, was die App technisch tut. Verantwortlicher, Kontaktdaten,
> Impressum und die abschließende rechtliche Bewertung ergänzt der Anbieter (IT - WORLD · IT SOLUTIONS) bzw. eine Datenschutzberatung.

## 1. Überblick
My Route speichert Favoriten (Orte) und Routen **ausschließlich lokal** auf dem Gerät. Es gibt kein Konto, keine Server des Anbieters,
keine Werbung, keine Analyse- oder Tracking-Dienste, keine Cookies und keinen Absturzbericht-Versand.

## 2. Verarbeitete Daten
| Daten | Zweck | Speicherort | Dauer |
|---|---|---|---|
| Favoriten (Name, Adresse, Koordinaten, Notiz, Symbol, Liste) | Kernfunktion | lokal (Desktop: App-Datenordner, verschlüsselt über Betriebssystem-Schlüsselbund; Browser/Android: Browser-Speicher, optional Passwortschutz) | bis zur Löschung durch die Nutzer |
| Routen (Stopps, Verkehrsmittel, Gebiet/Land, Fahrthäufigkeit, letzte Fahrt) | Kernfunktion | lokal wie oben | wie oben |
| Einstellungen (Optik, Bedienung, Kartenansicht, Zustimmungen, Update-Einstellung) | Bedienkomfort, Nachweis der Entscheidung | lokal wie oben | wie oben |
| Standort | nur für „Mein Standort“ (Start der Live-Optionen, Koordinaten-Eintrag) | **nicht gespeichert**, nur im Arbeitsspeicher | Sitzung |

## 3. Datenübermittlungen (nur auf Klick bzw. nach Information)
| Empfänger | Auslöser | Übermittelte Daten | Rechtsgrundlage |
|---|---|---|---|
| OpenStreetMap Nominatim | „Koordinaten zur Adresse finden“ | Adresstext, IP-Adresse | Einwilligung (Art. 6 Abs. 1 lit. a), Abfrage vor erster Nutzung |
| OSRM-Routing-Dienst (router.project-osrm.org) | „Optionen laden“ | Start-/Zielkoordinaten (ggf. Standort), IP-Adresse | Einwilligung (lit. a), Abfrage vor erster Nutzung |
| Karten-Dienst nach Wahl (Google Maps, Apple Karten, OpenStreetMap) | „Route fahren“ | Link mit Start, Ziel, Zwischenstopps | Nutzerveranlasste Öffnung eines Links; danach gilt die Erklärung des Dienstes |
| GitHub (Update-Quelle) | Start der App (wenn Updates aktiviert), „Jetzt nach Updates suchen“ | IP-Adresse, Versionsstand | berechtigtes Interesse an IT-Sicherheit (lit. f) bzw. Information und Wahlmöglichkeit beim Erststart |

Mögliche Drittlandübermittlung (z. B. GitHub/USA) und die Rolle der Dienste sind vom Anbieter in der Datenschutzerklärung aufzunehmen.

## 4. Betroffenenrechte (Art. 15–21 DSGVO)
- **Auskunft/Berichtigung:** alle Daten sind in der App sichtbar und änderbar.
- **Datenübertragbarkeit:** „Sichern“ erzeugt eine JSON-Datei (ohne Einstellungen zu Zustimmungen).
- **Löschung:** „Info → Datenschutz & Sicherheit → Alle Daten löschen“ entfernt Datendatei, Sicherungskopie und beiseitegelegte Dateien bzw. den Browser-Speicher.
- **Widerruf von Einwilligungen:** jederzeit unter „Info → Datenschutz & Sicherheit“.

## 5. Technisch-organisatorische Maßnahmen (Art. 32)
| Schutzziel | Maßnahme |
|---|---|
| Vertraulichkeit | Verschlüsselung ruhender Daten (Schlüsselbund bzw. Passwort/AES-256), Dateirechte 0600, Sandbox und Prozessisolation, strikte CSP, geprüfte IPC, keine Fremdverbindungen aus der Oberfläche, Android ohne Backup-Zugriff |
| Integrität | Eingabe- und Importbereinigung, Schemaprüfung, atomares Schreiben, Hash-Prüfung der Updates (SHA-512), Prüfsummen der Downloads (SHA-256) |
| Verfügbarkeit | Sicherungskopie (`.bak`), Wiederherstellung, kein Überschreiben unlesbarer Dateien, Export/Import |
| Belastbarkeit | Zeit- und Größenlimits für externe Antworten, Einzelinstanz-Sperre |
| Datenminimierung | keine Konten, keine Telemetrie, Standort nicht gespeichert, nur nötige Daten an Dienste |
| Transparenz | Information beim Erststart, Einwilligungsdialoge, Übersicht „Welche Daten gehen wann an wen?“ in der App |
| Überprüfung | `npm run check`, `npm test`, `npm audit`, Dependabot, Quellcode-Prüfung in der CI |

## 6. Entwurf Verzeichnis von Verarbeitungstätigkeiten (Art. 30)
- **Tätigkeit:** Bereitstellung der Routenplaner-App My Route (lokale Verarbeitung durch die Nutzer selbst).
- **Betroffene:** Nutzer der App. **Datenkategorien:** Ortsangaben/Adressen, Routen, Einstellungen.
- **Empfänger:** nur die in Abschnitt 3 genannten Dienste, jeweils auf Veranlassung der Nutzer.
- **Löschfristen:** durch die Nutzer jederzeit. **TOM:** siehe Abschnitt 5.
- Eine Datenschutz-Folgenabschätzung dürfte mangels umfangreicher Verarbeitung durch den Anbieter nicht erforderlich sein – bitte rechtlich prüfen lassen. Ein Auftragsverarbeitungsvertrag ist nicht nötig, solange der Anbieter keine Daten der Nutzer verarbeitet.
