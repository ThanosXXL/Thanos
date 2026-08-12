# SteuerWelt-Lizenzserver

Kleiner, eigenständiger Dienst, der die Geräte-gebundene Online-Aktivierung
der SteuerWelt-Desktop-App übernimmt. Läuft unabhängig von der App und vom
Dozenten-Dashboard in diesem Repository — eigenes `package.json`, eigene
Datenbank, eigener Container.

## Funktionsweise

- Jede Lizenz hat einen Schlüssel (`STWL-XXXX-XXXX-XXXX-XXXX`), einen
  Kundennamen und eine Anzahl erlaubter Geräteplätze (`seats`).
- Beim ersten Start meldet sich die App mit Lizenzschlüssel + einer aus der
  Hardware abgeleiteten Geräte-ID unter `POST /api/activate`. Ist ein Platz
  frei, bekommt sie ein signiertes Aktivierungszertifikat mit
  Ablaufdatum zurück.
- Die App prüft das Zertifikat danach **offline** mit einem fest
  eingebauten öffentlichen Schlüssel — der Server muss nur erreichbar sein,
  um das Zertifikat zu erneuern (`POST /api/validate`, standardmäßig alle
  30 Tage, mit Gnadenfrist in der App).
- `POST /api/deactivate` gibt einen Geräteplatz frei, z. B. bei einem
  Rechnerwechsel.
- Es gibt **keinen** Server-Zugriff zur Laufzeit für die eigentlichen
  Mandanten-/Kanzleidaten — die bleiben lokal auf dem Rechner der Kanzlei.
  Der Lizenzserver sieht nur Lizenzschlüssel, Geräte-IDs und Zeitstempel.

## Einmalige Einrichtung

```bash
cd steuerwelt-license-server
npm install
cp .env.example .env          # anpassen falls nötig
npm run generate-keys         # erzeugt keys/private.pem + keys/public.pem
```

`keys/private.pem` **niemals** committen oder weitergeben — er ist bereits
in `.gitignore` ausgeschlossen. `keys/public.pem` wird anschließend in die
SteuerWelt-App eingebaut (`steuerwelt/license/public-key.js`).

## Lokal starten

```bash
node --env-file=.env src/server.js
# oder ohne .env-Datei, mit Umgebungsvariablen direkt gesetzt:
npm start
```

Der Server benötigt **Node.js 22.5 oder neuer** (nutzt das eingebaute,
noch experimentelle `node:sqlite`-Modul — dafür ist keine zusätzliche
Datenbank-Installation nötig, die Warnung `ExperimentalWarning: SQLite...`
beim Start ist normal und unschädlich).

## Lizenz für einen Kunden ausstellen

```bash
node scripts/create-license.js --customer "Kanzlei Müller" --seats 3
```

Gibt den Lizenzschlüssel aus, den ihr an die Kanzlei weitergebt.

## Deployment (selbst hosten)

Es gibt noch keine Infrastruktur dafür — hier zwei unkomplizierte Optionen,
beide mit dem mitgelieferten `Dockerfile`:

**Option A — kleiner VPS (z. B. Hetzner, Contabo, jeder Anbieter mit Docker)**

```bash
docker build -t steuerwelt-license-server .
docker run -d \
  --name steuerwelt-license-server \
  -p 4400:4400 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/keys:/app/keys \
  --restart unless-stopped \
  steuerwelt-license-server
```

Danach die App auf die öffentliche Adresse des Servers zeigen lassen
(z. B. hinter einem Reverse Proxy mit TLS, etwa Caddy oder nginx +
Let's Encrypt — die App spricht nur HTTPS).

**Option B — Plattform mit Docker-Support (Fly.io, Render, Railway, …)**

Alle drei bauen aus dem `Dockerfile` direkt; Volumes für `/app/data` und
`/app/keys` (bzw. das jeweilige Pendant der Plattform für persistenten
Speicher) sind einzurichten, sonst gehen Lizenzdaten und Schlüssel beim
nächsten Deploy verloren. Env-Variablen wie in `.env.example` setzen.

Wichtig in jedem Fall:
- **Backups von `data/licenses.sqlite`** — das ist die einzige Quelle, wer
  welche Lizenz hat.
- **`keys/private.pem` sichern**, aber niemals im Repository oder
  öffentlich ablegen. Geht er verloren, müssen neue Schlüssel erzeugt und
  alle Kunden-Apps neu aktiviert werden (weil sie den alten Public Key
  fest eingebaut haben).
