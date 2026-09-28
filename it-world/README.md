# IT - World · SaaS ERP / CRM Business-Plattform

Maßgeschneiderte, mandantenfähige Web-App mit Admin-Dashboard für **IT - World – IT Solutions**:
CRM, Vertrieb, Rechnungen, Lager, Projekte, Support, Personal, Finanzen und Berichte in einer Plattform –
im Schwarz/Gold-Design mit 3D-Hochglanz-Logo, voll responsiv für Desktop, Tablet und Smartphone (als App installierbar).

![Logo](public/img/logo-640.jpg)

## Funktionsumfang

| Bereich | Funktionen |
|---|---|
| **Dashboard** | KPIs (Umsatz, offene Forderungen, gewichtete Pipeline, Kunden, Tickets, Aufgaben), 12-Monats-Umsatzdiagramm, Pipeline, überfällige Rechnungen, Termine, Projekte, Top-Kunden, Lagerwarnungen, Aktivitäten |
| **CRM** | Kunden (360°-Ansicht mit Umsatz, offenen Posten, allen Belegen/Projekten/Tickets/Dokumenten), Kontakte, Verkaufschancen als Kanban-Board (Drag & Drop) |
| **Vertrieb** | Angebote → Aufträge → Rechnungen (Umwandlung per Klick), Positions-Editor mit Produktauswahl, Rabatt und mehreren MwSt.-Sätzen, Nummernkreise (`RE-2026-0001`), Festschreiben (GoBD-orientiert: festgeschriebene Rechnungen sind gesperrt, nur Storno), Druck-/PDF-Ansicht im Firmen-Layout, Versand per E-Mail |
| **Zahlungen** | Zahlungseingänge (Überweisung, SEPA, PayPal, Stripe, Kreditkarte, Bar), automatischer Status *Offen / Teilbezahlt / Bezahlt*, Überfälligkeits-Erkennung |
| **Produkte & Lager** | Produkte, Dienstleistungen, Abos/Lizenzen, automatische Lagerbuchung beim Festschreiben (Rückbuchung bei Storno), manuelle Lagerbuchungen, Bewegungshistorie, Mindestbestand-Warnungen, Lieferanten |
| **Projekte** | Projekte mit Budget, Fortschritt, Stundensatz; Aufgaben-Board; Zeiterfassung; **offene Zeiten mit einem Klick in eine Rechnung übernehmen** |
| **Support** | Tickets mit Priorität, Kategorie, Zuständigkeit, Board-Ansicht |
| **Personal** | Mitarbeiterakte (nur Admin/Manager), Zeiterfassung pro Benutzer |
| **Finanzen** | Ausgaben mit Brutto/Netto, Berichte: Umsatz, Zahlungseingang, Ausgaben, Ergebnis, USt./Vorsteuer/Zahllast pro Monat, Umsatz nach Kunden/Produkten, Stunden je Projekt, CSV-Export |
| **Kalender** | Monatsansicht + Agenda mit Terminen, fälligen Aufgaben/Rechnungen, Projekt-Deadlines und Abschlussterminen |
| **Dokumente** | Datei-Upload (Content Upload, bis 15 MB) mit Zuordnung zu Kunde/Projekt, sichere Downloads |
| **Anmeldeformular** | Öffentliches Anfrageformular `/form/<mandant>` (einbettbar) → legt automatisch Lead, Kontakt und Verkaufschance an; **Autoresponder** und interne Benachrichtigung |
| **Verwaltung** | Benutzer & Rollen (Administrator, Manager, Mitarbeiter, Nur Lesen), Module ein-/ausschalten (Plugins/Erweiterungen), Firmendaten, Bankverbindung, Belegtexte, Kleinunternehmerregelung, Social-Media-Links mit Icons, Postausgang, Aktivitätsprotokoll, JSON-Datensicherung |
| **Überall** | Globale Suche (Strg+K), Schnellanlage „+ Neu“, Notizen & Änderungsverlauf je Datensatz, CSV-Export/-Import, Hell/Dunkel-Modus |

### SaaS / Mandantenfähigkeit
Über „Unternehmen registrieren“ legt jede Firma ihren eigenen, **vollständig getrennten Mandanten** an
(eigene Daten, Nummernkreise, Benutzer, Einstellungen). Registrierung abschaltbar mit `ALLOW_REGISTRATION=false`.

### Sicherheit
scrypt-Passwort-Hashes · HttpOnly-Session-Cookies mit `SameSite=Strict` · CSRF-Schutz per Pflicht-Header ·
strikte Content-Security-Policy · Rate-Limiting für Login/Registrierung/Formular · Rollen- und Modulrechte serverseitig
geprüft · alle SQL-Abfragen parametrisiert · mandantenübergreifende Referenzen werden abgelehnt ·
Uploads werden nur als Download (oder sandboxed bei Bildern/PDF) ausgeliefert · CSV-Export mit Formel-Injection-Schutz ·
Passwortwechsel beim ersten Login erzwungen.

### Geschwindigkeit
Keine Abhängigkeiten und kein Build-Schritt, eingebettete SQLite-Datenbank (WAL-Modus, Indizes),
Gzip-Kompression, ETags und Browser-Caching für statische Dateien.

## Schnellstart

Voraussetzung: **Node.js 22.5 oder neuer** (nutzt das eingebaute `node:sqlite` – kein `npm install` nötig).

```bash
cd it-world
npm start          # http://localhost:3000
npm run dev        # mit automatischem Neustart bei Änderungen
npm test           # automatisierte API-Tests
```

Beim ersten Start wird der Mandant **IT - World** mit Demo-Daten angelegt:

- E-Mail: `admin@it-world.de`
- Passwort: `admin1234` → muss bei der ersten Anmeldung geändert werden

## Hosting-Einrichtung

### Docker (empfohlen)
```bash
cd it-world
docker compose up -d --build
```
Die Datenbank und Uploads liegen im Volume `it-world-data` (`/data`).

### Eigener Server (VPS) hinter nginx mit HTTPS
```nginx
server {
  server_name erp.ihre-domain.de;
  client_max_body_size 25m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Dazu `TRUST_PROXY=true` und `COOKIE_SECURE=true` setzen und das Zertifikat z. B. mit `certbot --nginx` einrichten.
Als Dienst z. B. per systemd (`ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning /opt/it-world/server.js`).

### Umgebungsvariablen

| Variable | Standard | Bedeutung |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Port und Adresse |
| `DB_FILE` | `./data/it-world.db` | SQLite-Datei (Uploads liegen daneben in `uploads/`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@it-world.de` / `admin1234` | Erst-Administrator (mit `ADMIN_PASSWORD` entfällt der Änderungszwang) |
| `SEED_DEMO` | `true` | Demo-Daten beim ersten Start |
| `ALLOW_REGISTRATION` | `true` | Selbstregistrierung neuer Mandanten |
| `TRUST_PROXY` / `COOKIE_SECURE` | `false` | Betrieb hinter HTTPS-Reverse-Proxy |
| `FRAME_ANCESTORS` | – | Erlaubt das Einbetten des Anfrageformulars, z. B. `https://www.ihre-domain.de` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` | – | E-Mail-Versand (STARTTLS auf 587, `SMTP_SECURE=true` für 465). Ohne SMTP werden E-Mails nur im Postausgang protokolliert |

### Datensicherung
Einstellungen → System & Daten → „Backup herunterladen“ (JSON je Mandant) – zusätzlich regelmäßig die
Datei `DB_FILE` und den Ordner `uploads/` sichern.

## Architektur

```
it-world/
├── server.js            HTTP-Server, Erststart/Seed
├── src/
│   ├── schema.js        zentrale Datenmodell-Definition (Felder, Rechte, Module) → DB, API und UI
│   ├── db.js            SQLite, automatische Spalten-Migration
│   ├── crud.js          generische mandantengetrennte Datenschicht + Fachlogik (Belege, Lager, Zahlungen)
│   ├── app.js           Routing & REST-API (Auth, Dashboard, Berichte, Kalender, Formular, Uploads …)
│   ├── auth.js          Passwort-Hashing, Sessions, Rate-Limiting
│   ├── mailer.js        SMTP-Client ohne Abhängigkeiten, Postausgang
│   ├── csv.js           CSV-Export/-Import
│   └── seed.js          Erst-Mandant und Demo-Daten
├── public/              Single-Page-App (Vanilla JS-Module, kein Build)
│   ├── js/main.js       Anmeldung, App-Shell, Router
│   ├── js/generic.js    Listen, Kanban, Details, Formulare, Beleg-Editor, Druckansicht
│   ├── js/pages.js      Dashboard, Kalender, Berichte, Einstellungen, Benutzer …
│   ├── js/charts.js     SVG-Diagramme
│   └── css/app.css      Schwarz/Gold-Design mit Hochglanz-Effekten
└── test/                node:test-Integrationstests
```

Neue Felder oder ganze Bereiche werden in `src/schema.js` ergänzt – Datenbankspalten, API, Listen, Formulare,
Detailseiten, Suche und CSV-Export entstehen daraus automatisch.
