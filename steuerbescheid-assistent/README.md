# Steuerbescheid-Assistent

Ein geführter Assistent für die eigene Einkommensteuererklärung (Deutschland),
rückwirkend ab dem Steuerjahr 2023. Die App zeigt Schritt für Schritt, welche
amtlichen Anlagen (Formulare) je nach persönlicher Situation relevant sind,
welche Angaben dort gefragt sind, und mit welchen Unterlagen (Foto/Scan) man
sich vorbereiten sollte.

**Wichtig:** Der Assistent ist ein Organisations- und Lernwerkzeug mit einer
zusätzlichen, freiwilligen **automatischen Steuerschätzung** am Ende. Diese
Schätzung ist ein **ungefährer Richtwert, keine verbindliche Steuerberechnung**
und stimmt nicht immer zu 100 % mit dem echten Steuerbescheid überein – meist
weil einzelne absetzbare Posten (allen voran Werbungskosten, aber auch
Sonderausgaben, außergewöhnliche Belastungen o. Ä.) aus Unerfahrenheit
vergessen oder nicht vollständig eingetragen werden. Der Assistent ersetzt
keine Steuerberatung und übermittelt keine Daten an das Finanzamt oder einen
Server – alle Eingaben (Checkboxen, Beträge, Fotos/Scans) bleiben
ausschließlich lokal im Browser (`localStorage`). Die eigentliche
Steuererklärung reicht man selbst über [ELSTER](https://www.elster.de) ein
oder lässt sich von einer steuerberatenden Person unterstützen.

## Funktionsumfang

- Auswahl von Steuerjahr (2023–2025), Familienstand (ledig, verheiratet
  zusammen-/einzelveranlagt, getrennt/geschieden, verwitwet) und Situationen
  (Angestellt, Kinder, Erst-/Zweitausbildung/Studium, Kapitalerträge,
  Vermietung, Selbstständigkeit, Vorsorgeaufwendungen, Spenden,
  außergewöhnliche Belastungen, Unterhalt, Homeoffice)
- Daraus generierte Schritt-für-Schritt-Checkliste mit den relevanten
  amtlichen Anlagen (Anlage N, Kind, KAP, V, S/G, Vorsorgeaufwand, U, …)
- Schematische Beispielansicht pro Formular (SVG, klar als "kein amtliches
  Formular" gekennzeichnet)
- Dokumenten-Checkliste je Schritt mit Ankreuzen und optionalem
  Foto-/Scan-Upload (Kamera auf Mobilgeräten wird direkt unterstützt)
- Fortschritt wird automatisch im Browser gespeichert, sodass man später
  weitermachen kann
- Zusammenfassung am Ende, druckbar/als PDF speicherbar
- Optionale Beträge-Felder direkt in den passenden Schritten (Bruttolohn,
  Werbungskosten, Homeoffice-Tage, Kapitalerträge, Vermietung, Vorsorge,
  Spenden, außergewöhnliche Belastungen, Unterhalt, Kirchensteuersatz …), aus
  denen am Ende automatisch eine **vereinfachte Steuerschätzung** (zu
  versteuerndes Einkommen, Einkommensteuer nach § 32a EStG, Kirchensteuer,
  Soli, Abgeltungsteuer, mögliche Erstattung/Nachzahlung) berechnet wird –
  deutlich als Richtwert gekennzeichnet, nicht als verbindliche Berechnung

## Technik

Reines HTML/CSS/JavaScript ohne Build-Schritt oder Abhängigkeiten – läuft in
jedem modernen Browser. Als [PWA](https://web.dev/progressive-web-apps/)
installierbar (`manifest.json` + `sw.js`), damit die App auf **Windows, macOS,
Linux, Android und iOS** einheitlich über den Browser genutzt und auf den
Startbildschirm gelegt werden kann (Menü → „App installieren“ bzw. „Zum
Home-Bildschirm“).

## Lokal starten

```bash
cd steuerbescheid-assistent
python3 -m http.server 8080
# dann im Browser: http://localhost:8080
```

Jeder statische Webserver funktioniert; ein Build-Schritt ist nicht nötig.

## Dateien

- `index.html` – Grundgerüst (Header, Fortschrittsbalken, `#content`)
- `style.css` – gelb-orange, glänzendes 3D-Design, responsiv
- `data.js` – Inhaltsdaten: Steuerjahre, Familienstände, Situationen und die
  daraus abgeleiteten Formular-/Unterlagen-/Beträge-Schritte
- `calc.js` – vereinfachte Steuerschätzung (§ 32a-EStG-Tarif für 2023–2025,
  Grund-/Splittingtabelle, Kirchensteuer, Soli, Abgeltungsteuer)
- `app.js` – Wizard-Logik, Zustandsverwaltung (`localStorage`), Datei-Upload,
  Beträge-Eingabefelder, Beispielbild-Erzeugung (SVG)
- `manifest.json`, `sw.js`, `icons/icon.svg` – PWA-/Installations-Setup

## Grenzen

- Keine ELSTER-Anbindung/-Übermittlung – die Schätzung bleibt lokal
- Die Steuerschätzung ist bewusst vereinfacht und **keine verbindliche
  Steuerfestsetzung**. Nicht abgebildet sind u. a.: Kinderfreibetrag-
  Günstigerprüfung, Steuerklassenkombinationen bei Ehepaaren,
  Verlustvorträge aus Vorjahren, die exakte Vorsorgepauschale, die Gleitzone
  beim Solidaritätszuschlag, Handwerkerleistungen/haushaltsnahe
  Dienstleistungen, Behinderten-Pauschbeträge u.v.m. Die Genauigkeit hängt
  außerdem direkt davon ab, ob alle absetzbaren Posten (allen voran
  Werbungskosten) überhaupt vollständig eingetragen wurden
- Die genannten Pauschbeträge/Freibeträge sind Richtwerte zur Orientierung
  und können sich ändern – bitte im Zweifel aktuell auf elster.de oder bei
  einer steuerberatenden Person prüfen
- Der Bereich „Selbstständige/gewerbliche Tätigkeit“ ist bewusst nur grob
  skizziert, da eine vollständige Gewinnermittlung den Rahmen sprengt
