# SteuerWelt

Kanzleisoftware für Steuerberater — Mandanten, Fristen, Dokumente,
Zeiterfassung, Rechnungen und Notizen. Electron-Desktop-App nach demselben
Aufbau wie das Dozenten-Dashboard in diesem Repository, aber ein komplett
eigenständiges Projekt (eigenes `package.json`, eigene Daten, keine
gemeinsame Codebasis).

## Ablauf beim Start

1. **Lizenzaktivierung** — beim allerersten Start wird ein Lizenzschlüssel
   abgefragt und einmalig online gegen den
   [Lizenzserver](../steuerwelt-license-server/) aktiviert (siehe dort für
   Betrieb/Deployment). Danach läuft die App bis zu 14 Tage auch offline,
   bevor sie sich erneut online melden muss.
2. **Benutzerkennung** — Mitarbeiter wählen ihr Profil (Name + PIN) oder
   legen ein neues an. Das ist **keine Zugriffskontrolle**, sondern nur
   eine Zuordnung, damit Zeiterfassung und Notizen erkennen lassen, wer sie
   erstellt hat. Wer Zugriff auf den Rechner hat, sieht ohnehin alle Daten.
3. **Hauptanwendung** — Mandantenliste links, Module oben: Übersicht,
   Mandanten, Fristen, Dokumente, Zeiterfassung, Rechnungen, Notizen.

## Module

| Modul | Zweck |
|---|---|
| Übersicht | Fällige Fristen (7 Tage), überfällige Rechnungen, heute erfasste Zeit, zuletzt bearbeitete Mandanten. |
| Mandanten | Stammdaten, Status (aktiv/ehemalig), keine feste Obergrenze. |
| Fristen | To-dos mit Fälligkeit und Dringlichkeits-Anzeige, Vorlagen für wiederkehrende Fristen. |
| Dokumente | Ablage je Mandant mit festen Kategorien, verweist auf lokale Dateien (kein Datei-Import/Kopieren). |
| Zeiterfassung | Start/Stopp-Timer oder manuelle Eingabe je Mandant. |
| Rechnungen | Honorarnoten mit Positionen, Status offen/bezahlt/überfällig, PDF-Export. |
| Notizen | Laufendes Gesprächsprotokoll je Mandant, mit Autor. |

**Bewusst nicht enthalten:** eine nach aktuellem Recht zertifizierte
Steuerberechnung sowie eine echte DATEV- oder ELSTER-Anbindung.

## Daten & Sicherung

Alle Daten liegen lokal in einer einzigen JSON-Datei
(`app.getPath('userData')/steuerwelt-data.json`). Bei jedem Speichern wird
vorher automatisch eine Sicherungskopie in `.../userData/backups/`
abgelegt (die letzten 10 werden aufbewahrt) — ein Programmabsturz oder
eine beschädigte Datei kostet damit höchstens den letzten Speicherstand.

## Vor der ersten Auslieferung an Kunden

`license/public-key.js` enthält aktuell einen **Entwicklungs-Schlüssel**.
Vor dem Bau echter Installer:

1. Auf dem Lizenzserver `npm run generate-keys` ausführen.
2. Den erzeugten `keys/public.pem`-Inhalt in `license/public-key.js`
   einsetzen.
3. `license/server-config.js` bzw. die Umgebungsvariable
   `STEUERWELT_LICENSE_SERVER_URL` auf die echte, öffentlich erreichbare
   Adresse des Lizenzservers setzen.

## Entwicklung

```bash
npm install
npm start        # Electron im Dev-Modus
npm run dist      # Installer bauen (win: nsis, mac: dmg, linux: AppImage)
```

Für lokale Tests ohne echten Server:
`STEUERWELT_LICENSE_SERVER_URL=http://localhost:4400 npm start`, während
der Lizenzserver lokal läuft (siehe dessen README).
