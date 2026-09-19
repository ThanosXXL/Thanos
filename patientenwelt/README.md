# PatientenWelt

Eigenständige Electron-Desktop-App zur Verwaltung von Patientenakten (Praxisverwaltung) im
Blau-Weiß-3D-Hochglanz-Stil, inklusive Hochglanz-3D-Schrift (verchromter Farbverlauf-Text) für
Markenname, Überschriften, Patientennamen-Banner und aktive Tabs. Sie ist unabhängig vom
**Dozenten Dashboard** in diesem Repository (eigene `package.json`, eigener
`main.js`/`preload.js`/`renderer/`, eigene Datenablage) und wird nicht von dessen
`npm install`/`npm start`/`npm run dist`-Befehlen berührt.

## Funktionsumfang

- Symbolleiste mit Hochglanz-3D-Icon-Buttons (Patient wählen, Neuer Patient, Suche, Termine,
  Briefe, Laborwerte, Drucken, Neu laden)
- Übersicht mit Kennzahlen-Kacheln (Patienten gesamt, anstehende Termine, Verlaufseinträge)
- Patientenliste mit Suche, sortierbaren Spalten, Anlegen, Bearbeiten und Entfernen von Patienten
- Stammdaten je Patient (Name, Geburtsdatum, Geschlecht, Krankenkasse, Versichertennummer)
- Chronologisches Verlauf-/Journal (Anamnese, Befund, Diagnose, Therapie, Kontrolle, Sonstiges)
- Rezepte, Termine, Briefe und Laborwerte je Patient
- **Kalender** je Patient: Jahresansicht für das aktuelle und das folgende Jahr, Tag anklicken
  trägt einen neuen Termin für dieses Datum ein; Tage mit bestehenden Terminen sind hervorgehoben
- **Abrechnung**: Leistungen (Ziffer, Bezeichnung, Betrag) je Patient erfassen, nach
  Privatliquidation/KV/BG filtern, Rechnung für die Privatliquidation erzeugen und drucken;
  dazu praxisweite Sammelübersichten je Kategorie über die Seitenleiste — siehe „Abrechnung" unten
- Umfangreiche Seitenleiste analog zur Referenz-Praxissoftware — **jeder Menüpunkt hat eine echte
  Funktion**, keine toten Platzhalter mehr:
  - **Praxis**: Praxisgebühr Info (historischer Hinweis, seit 2013 abgeschafft), Praxisgebühr
    Kassenbuch (Bareinnahmen/-ausgaben mit laufendem Saldo), Registrierung Versichertenkarte
    (manuelle Status-Erfassung je Patient, da kein eGK-Terminal angebunden ist), Formulare
    (Vorlagen anlegen), Druckauftrag Formular (Vorlage + Patient wählen, drucken, wird protokolliert),
    Recallfunktion (Wiedervorstellungen mit Fälligkeitsdatum), Warteliste (Eintragen/Nachsehen als
    eine gemeinsame Tagesansicht mit Status wartet → aufgerufen → fertig)
  - **Behandlung** (je Patient): Laborwerterfassung (strukturiert: Parameter/Wert/Einheit/
    Referenzbereich), Leistungsstatus (offen/abgerechnet/bezahlt je Abrechnungsposition),
    Verordnungsstatus (offen/eingelöst/storniert je Rezept), **Überweisung** (Empfänger,
    Fachrichtung, Dringlichkeit, Grund/Verdachtsdiagnose — am PC ausfüllen und als
    Überweisungsschein für den Patienten ausdrucken), **Befund weiterleiten** (Befund an einen
    anderen Arzt/eine Praxis adressieren; der Befundtext lässt sich optional aus einem
    bestehenden Verlaufs- oder Laborwert-Eintrag übernehmen, dann ausdrucken)
  - **Patientenverwaltung** (je Patient): Scheinrückseite (Freitext-Notizen), Übergabe Patient
    (Übergabevermerke zwischen Behandelnden), Patientendaten duplizieren (z. B. für
    Familienangehörige — übernimmt Nachname/Krankenkasse, nicht Geburtsdatum/Vers.-Nr. oder
    Einträge), Archivinformation SD/MD (zwei Referenzfelder, eine gemeinsame Ansicht)
  - **Termine & Kommunikation**: zusätzlich zu Termine/Kalender/Briefe der Punkt **Nächster
    Termin** — für die Arzthelferin gedacht: nächsten Arzttermin (Datum/Uhrzeit/Grund) schnell
    eintragen und als Terminkarte ausdrucken, die der Patient mitnimmt
  - **Auswertung** (praxisweit): Analyse allgemein (Geschlechterverteilung, Durchschnittsalter,
    neue Patienten), Analyse Leistungen (Summen je Abrechnungskategorie, häufigste Ziffern),
    Analyse Verordnungen (häufigste Medikamente, Status-Verteilung)
  - **Weitere Services**: Katalog zusätzlicher Selbstzahlerleistungen (z. B. IGeL) mit Preis
- **Ausdrucke für Patienten**: Überweisungsschein, Befundmitteilung und Terminkarte nutzen alle
  dasselbe Druck-Layout wie die Rechnung (Praxis-Kopfzeile, `window.print()` + `@media print`,
  Unterschriftszeile wo passend) und werden im Protokoll festgehalten (z. B. „Überweisung
  gedruckt"). Es handelt sich um ausdruckbare Dokumente, **keine elektronische Übermittlung**
  (kein KIM/Fax/E-Mail-Versand) — passend zum Stand ohne TI-Anbindung, siehe „Grenzen"
- Bedienkomfort: Enter speichert/bestätigt das offene Formular, Escape schließt es
- **Datensicherheit**: verschlüsselte Datenablage (AES-256-GCM), Anmeldung mit Benutzerrollen
  (Administrator/Mitarbeiter), automatische Sperre nach Inaktivität, Audit-Protokoll, automatische
  Backups mit Wiederherstellung — siehe Abschnitt „Datensicherheit" unten
- **Datenexport** (Art. 20 DSGVO): einzelne Patientenakten als JSON oder CSV exportieren (Tab
  „Basis"), für Administratoren zusätzlich alle Patientendaten der Praxis auf einmal (JSON) sowie
  das Protokoll als CSV — jeweils über den nativen Speichern-unter-Dialog, siehe „Datenexport" unten

Alle Beispieldaten sind frei erfunden. Es werden keine echten Patientendaten mitgeliefert.

**Wichtig:** Trotz Verschlüsselung ist diese App **kein zulassungsfähiges Praxisverwaltungssystem**
und darf nicht mit echten Patientendaten verwendet werden — es fehlen KBV-Zulassung, TI-Anbindung
(eHealth-Konnektor, eRezept/eAU/ePA) und eine echte Abrechnungsschnittstelle. Details siehe
„Grenzen" am Ende dieser Datei.

## Installation & Start

```bash
cd patientenwelt
npm install
npm start
```

## Desktop-Anwendung bauen

```bash
cd patientenwelt
npm run dist
```

## Architektur

Gleiches Muster wie das Dozenten Dashboard: `contextIsolation: true`, `nodeIntegration: false`.

- **`main.js`** — erstellt das `BrowserWindow` und besitzt die gesamte Kryptografie/Persistenz
  (siehe „Datensicherheit"). Der Daten-Schlüssel (DEK) lebt ausschließlich im Hauptprozess-Speicher,
  nie im Renderer.
- **`preload.js`** — exponiert `window.patientenweltAPI` (Auth: `hasAccount`, `listUsers`, `setup`,
  `login`, `lock`, `addUser`, `removeUser`, `changePassword`; Daten: `saveData`, `reloadData`;
  Backups: `listBackups`, `restoreBackup`) als einzige Brücke zum Renderer.
- **`renderer/`** — komplette UI als Vanilla-JS-IIFE (`renderer.js`), statisches HTML-Grundgerüst
  (`index.html`) und Styling (`style.css`). Zustand liegt in einem einzigen `state = { patients: [],
  auditLog: [] }`; jede Änderung folgt dem Muster **State mutieren → `logAction()` →
  `persist()` → `render()`**, ganz ohne inkrementelles DOM-Update. Vor der Anmeldung zeigt
  `#authScreen` Einrichtung/Login; `#appShell` (Header, Symbolleiste, Sidebar, Content) bleibt bis
  zur erfolgreichen Anmeldung `hidden`.

## Datensicherheit

- **Verschlüsselung**: Die Datendatei (`patientenwelt-data.json` in `userData`) liegt als
  AES-256-GCM-verschlüsselte Hülle vor. Jeder Benutzer wickelt (wrapped) denselben zufälligen
  Daten-Schlüssel (DEK) mit seinem eigenen, per PBKDF2-SHA256 (210.000 Iterationen) abgeleiteten
  Passwort-Schlüssel ein — mehrere Benutzer können so unabhängig voneinander entschlüsseln, ohne
  dass der DEK je unverschlüsselt gespeichert wird. Beide Krypto-Grundfunktionen nutzen ausschließlich
  Node's eingebautes `crypto`-Modul, keine zusätzliche Abhängigkeit.
- **Benutzerrollen**: `admin` (Benutzerverwaltung, Protokoll, Datensicherung, Patienten löschen)
  und `mitarbeiter` (alles andere: Patienten anlegen/bearbeiten, Einträge erfassen). Der letzte
  verbleibende Administrator kann nicht entfernt werden.
- **Sperre**: manueller „Sperren"-Button im Header sowie automatische Sperre nach 5 Minuten
  Inaktivität (`IDLE_LOCK_MS` in `renderer.js`). Beim Sperren wird der Hauptprozess-Schlüssel
  verworfen; ohne erneute Anmeldung ist kein Zugriff mehr möglich.
- **Audit-Protokoll**: `state.auditLog` (Teil der verschlüsselten Daten) protokolliert jede Mutation
  (Patient/Eintrag angelegt/geändert/gelöscht, Benutzer angelegt/entfernt, Anmeldung, Sperre) mit
  Zeitstempel und Benutzer. Nur lesbar für Administratoren, im UI nicht löschbar.
- **Backups**: bei jedem Speichern wird automatisch eine Sicherung der verschlüsselten Datei unter
  `userData/backups/` abgelegt (die letzten 10 werden aufbewahrt). Administratoren können über
  „Datensicherung" einen früheren Stand wiederherstellen; der aktuelle Stand wird davor selbst noch
  gesichert.
- **Kein Passwort-Recovery ohne zweiten Administrator**: Wer sein Passwort vergisst und der einzige
  Benutzer ist, kann die Daten nicht wiederherstellen — das ist die erwartete Konsequenz echter
  Verschlüsselung, keine fehlende Funktion. Ein zweiter Administrator kann das Passwort eines
  anderen Benutzers ohne Kenntnis des alten zurücksetzen (`auth:change-password`).

Verifiziert über eine eigenständige Node-Testsuite für die Krypto-Grundfunktionen (Round-Trip,
falsches Passwort, Mehrbenutzer-Unwrapping, Manipulationserkennung) sowie einen vollständigen
Playwright-Durchlauf der UI (Einrichtung → Patient/Benutzer anlegen → Protokoll → Backup → Sperren →
Rollenwechsel → Fehlermeldung bei falschem Passwort) gegen eine Stub-Implementierung von
`window.patientenweltAPI`, da in dieser Umgebung kein `npm install`/`npm start` der echten
Electron-App möglich war (kein Netzwerkzugriff für `electron`-Paket).

## Datenexport

Für Art. 20 DSGVO (Datenportabilität) und für den Fall einer Kündigung: `main.js` registriert
`export:save-file` (öffnet den nativen „Speichern unter"-Dialog via `dialog.showSaveDialog` und
schreibt die vom Renderer übergebene, bereits entschlüsselte Datei — verlangt trotzdem eine aktive
Anmeldung, damit im gesperrten Zustand nichts exportiert werden kann). Der Renderer bietet:

- **Je Patient** (Tab „Basis", jede Rolle): vollständige Akte als JSON (1:1-Objekt, alle Felder) oder
  als CSV (eine Zeile pro Eintrag über alle Kategorien hinweg — `Kategorie;Datum;Uhrzeit;Titel;
  Beschreibung;Betrag` — mit UTF-8-BOM, damit Excel Umlaute korrekt anzeigt)
  über `exportPatientJSON()`/`exportPatientCSV()` in `renderer.js`
- **Praxisweit** (Seitenleiste „Sicherheit" → „Datenexport", nur Administratoren): alle Patienten
  auf einmal als JSON über `exportAllPatientsJSON()`
- **Protokoll** (Seitenleiste „Sicherheit" → „Protokoll", nur Administratoren): das Audit-Protokoll
  als CSV über `exportAuditLogCSV()`, Button direkt in der Protokoll-Ansicht
- Jeder erfolgreiche Export wird selbst als Audit-Eintrag protokolliert; Abbruch durch den Nutzer
  bleibt bewusst still, ein Schreibfehler zeigt eine Fehlermeldung — beides ohne Protokolleintrag

Verifiziert per Playwright gegen eine Stub-Implementierung von `exportFile()` (Erfolgs-, Abbruch-
und Fehlerfall, sowie Inhalt/Dateiname aller vier Export-Wege).

## Abrechnung

Je Patient im Tab „Abrechnung" (`patient.abrechnung`, Einträge `{ kategorie, ziffer, bezeichnung,
betrag }`): Leistungen erfassen (mit `ZIFFERN_VORSCHLAEGE` als Ausfüllhilfe — **keine offizielle
EBM/GOÄ-Datenbank**, nur ein paar Beispielziffern), nach Kategorie filtern (Alle/Privat/GKV/BG) und
die Summe sehen. Im Privat-Filter erzeugt „Rechnung erstellen" (`ui.viewMode = 'invoice'`) eine
druckfertige Rechnung (Rechnungsnummer, Datum, Patient, Leistungen, Summe); „Drucken" ruft
`window.print()`, `@media print` in `style.css` blendet Header/Symbolleiste/Sidebar aus.

Über die Seitenleiste („Abrechnung"-Gruppe, für alle Rollen sichtbar) gibt es zusätzlich
praxisweite, patientenübergreifende Sammelübersichten je Kategorie (`renderBillingOverview()`) —
das bildet die Sammelerklärung-artige Natur von KV-/BG-Abrechnung nach, ohne einen echten
KVDT-Export zu erzeugen.

## Grenzen (siehe auch Auswertung im Chat)

Verschlüsselung, Rollen und Audit-Log machen die App für eine interne Demo/Prototyp-Nutzung
angemessen sicher, und die Abrechnungs-Oberfläche bildet Leistungserfassung und Rechnungsstellung
nach. Das macht die App aber **nicht** zu einem zulassungsfähigen Praxisverwaltungssystem: keine
KBV-Zulassung, keine TI-Anbindung (eHealth-Konnektor, eRezept/eAU/ePA), kein echter KVDT-Export für
die KV-Sammelerklärung, keine offizielle EBM/GOÄ-Ziffern-Datenbank. Für echte Patientendaten
ungeeignet.

**Realistischer Zielmarkt ohne diese Zertifizierung:** Berufsgruppen ohne KV-Zulassungs-/
TI-Anbindungspflicht — Heilpraktiker, reine Privatpraxen, Physiotherapie, Osteopathie u. ä. Vertrags-
und Haftungsvorlagen für diesen Einsatz liegen in `patientenwelt/legal/` (AVV-Vorlage,
Haftungsausschluss — beides ungeprüfte Entwürfe, siehe dortige README).

### Hochglanz-3D-Schrift

`style.css` definiert Utility-Klassen `.text-glossy-dark` (verchromter, heller Text auf dunkelblauen
Flächen wie Kopfleiste und Patienten-Banner) und `.text-glossy-blue` (verchromter, blauer Text auf
weißen Flächen wie Panel-Überschriften). Beide nutzen einen Farbverlauf als Textfüllung
(`background-clip: text` + `-webkit-text-fill-color: transparent`), **bewusst ohne** `text-shadow`
oder `filter: drop-shadow(...)` — diese Kombination führt in dieser Chromium-Engine nachweislich zu
verwaschenem Doppel-Rendering des Textes. Für den aktiven Tab liegt der Effekt auf einem inneren
`<span class="tab-label">`, nicht auf dem `<button>` selbst, damit das eigene `background`-Shorthand
des Buttons (für die Tab-Hervorhebung) das Text-Clipping nicht überschreibt — bei neuen
Glanztext-Stellen dasselbe Muster verwenden, falls das Element selbst schon einen Hintergrund per
`background`-Shorthand setzt.

### Seitenleiste: `MENU_GROUPS` und `MENU_ACTIONS`

`renderer.js` verdrahtet jeden Seitenleisten-Eintrag mit einer echten Funktion. Fest im Markup
verankerte Kern-Navigation (Patient wählen/erfassen/ändern, Verlauf, Rezepte, Laborwerte, Termine,
Kalender, Abrechnung, Briefe, Benutzerverwaltung/Protokoll/Datensicherung/Datenexport für Admins)
lebt direkt in `renderSidebar()`. Alle übrigen, aus der Referenz-Praxissoftware übernommenen
Menüpunkte (Praxisgebühr, Registrierung, Formulare, Warteliste, Auswertung, Patientenverwaltung
usw.) sind in `MENU_GROUPS` (Gruppierung/Reihenfolge der Labels) und `MENU_ACTIONS` (pro Label:
`onClick`, optional `activeViewMode` für die Sidebar-Hervorhebung, optional `requiresPatient` für
patientenbezogene Werkzeuge) definiert; `sidebarActionBtn(label)` schlägt das Label in
`MENU_ACTIONS` nach und rendert Klick-Handler/Deaktivierung/Hervorhebung daraus. Mehrere Labels
dürfen bewusst auf dieselbe Ansicht zeigen (z. B. „Warteliste Eintragen"/„Warteliste Nachsehen" auf
`'warteliste'`, „Archivinformation SD"/„MD" auf `'tool-archivinfo'`) — dann trägt nur eines der
beiden Labels das `activeViewMode`, damit nicht zwei Menüpunkte gleichzeitig aktiv erscheinen. Eine
neue Funktion hinzufügen heißt: Render-Funktion schreiben, einen `viewMode`-Zweig in
`renderContent()` ergänzen und einen Eintrag in `MENU_ACTIONS` hinzufügen — kein separater
Platzhalter-Mechanismus mehr vorhanden.
