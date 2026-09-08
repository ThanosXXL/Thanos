# Signaling-Server dauerhaft hosten (für Online-Live-Schulungen)

Dieser Ordner (`server/`) ist bewusst **eigenständig** gehalten (eigenes, schlankes
`package.json` mit nur `ws` als Abhängigkeit) – so lässt er sich unabhängig von der
Electron-App auf einer beliebigen Node-Hosting-Plattform deployen, ohne `keytar` oder
`electron-builder` mitzuschleppen.

Damit Video-Chat und Dozenten-Daten-Sync auch funktionieren, wenn Teilnehmende **nicht**
im selben lokalen Netz sind, muss `signaling-server.js` unter einer von außen erreichbaren
Adresse laufen – idealerweise mit `wss://` (verschlüsselt), weil Browser eine sichere
WebSocket-Verbindung verlangen, sobald die aufrufende Seite selbst über `https://` läuft.

Der Code ist dafür bereits vorbereitet:
- Port kommt aus der Umgebungsvariable `PORT` (von den meisten Plattformen automatisch gesetzt).
- Ein einfacher HTTP-Healthcheck (`GET /`) antwortet mit `200 OK`.
- Ping/Pong-Keepalive alle 25s verhindert, dass Reverse-Proxys eine "stille" Verbindung
  während einer laufenden Schulung als inaktiv trennen.
- Sauberes Herunterfahren bei `SIGTERM` (wichtig für Neustarts/Redeploys der Plattform).

**Wichtiger Hinweis zu `data-store.json`:** Auf den meisten kostenlosen PaaS-Angeboten ist
das Dateisystem des Containers *ephemer* – bei jedem Neustart/Redeploy ist `data-store.json`
wieder leer. Das ist unkritisch: Jedes Gerät behält zusätzlich seine eigene lokale Kopie der
Dozenten-Daten; der Server dient nur als gemeinsamer Abgleichspunkt, nicht als einzige
Quelle. Wer das vermeiden möchte, braucht ein dauerhaftes Volume (siehe Fly.io unten) oder
eine externe Datenbank – für den Klassenzimmer-Maßstab dieser App i. d. R. nicht nötig.

---

## Option A: Render.com (am einfachsten, kostenloser Einstieg)

1. Auf [render.com](https://render.com) einloggen → **New → Web Service**.
2. Das GitHub-Repo `ThanosXXL/Thanos` verbinden.
3. Einstellungen:
   - **Root Directory:** `server`
   - **Runtime:** Docker (Render erkennt das `Dockerfile` in `server/` automatisch)
   - **Instance Type:** Free (oder Starter für dauerhaft "wach")
4. Deploy starten. Render vergibt automatisch eine HTTPS-Adresse wie
   `https://it-schulung-signaling.onrender.com` – die WebSocket-Adresse ist dieselbe,
   nur mit `wss://` statt `https://`: **`wss://it-schulung-signaling.onrender.com`**.
5. Diese Adresse in der App unter „Server-Adresse" beim Video-Chat eintragen.

⚠️ **Free-Tier-Einschränkung:** Der kostenlose Plan schläft nach ca. 15 Minuten Inaktivität
ein und braucht beim nächsten Verbindungsversuch ~30–60s zum Aufwachen – für spontane
Live-Schulungen unpraktisch. Für zuverlässigen Dauerbetrieb den kostenpflichtigen
„Starter"-Plan wählen oder Option B nutzen.

---

## Option B: Fly.io (bleibt dauerhaft an, großzügiges Gratis-Kontingent)

1. [flyctl](https://fly.io/docs/flyctl/install/) installieren und `fly auth login`.
2. Im Ordner `server/` ausführen:
   ```bash
   cd server
   fly launch --no-deploy
   ```
   Bei den Fragen: eigenen App-Namen vergeben, Region wählen, **keine** Postgres/Redis-
   Datenbank hinzufügen.
3. In der erzeugten `fly.toml` sicherstellen, dass der interne Port `8787` auf 80/443
   gemappt ist (Fly übernimmt TLS automatisch):
   ```toml
   [http_service]
     internal_port = 8787
     force_https = true
   ```
4. Deployen:
   ```bash
   fly deploy
   ```
5. Adresse in der App eintragen: **`wss://<app-name>.fly.dev`**.

Für dauerhaften Speicher (`data-store.json` übersteht Neustarts) optional ein Volume
anhängen (`fly volumes create data --size 1` und im `fly.toml` mounten) – für den
normalen Betrieb aber nicht erforderlich (siehe Hinweis oben).

---

## Option C: Eigener VPS (volle Kontrolle, z. B. Hetzner/DigitalOcean)

1. Node 20 installieren, Repo klonen, `cd server && npm install --omit=dev`.
2. Dauerhaft laufen lassen, z. B. mit `pm2`:
   ```bash
   npx pm2 start signaling-server.js --name signaling
   npx pm2 save && npx pm2 startup
   ```
3. **TLS nicht vergessen:** Ohne Reverse-Proxy läuft der Server nur mit unverschlüsseltem
   `ws://`, was von `https://`-Seiten aus vom Browser blockiert wird. Einen Reverse-Proxy
   (z. B. `nginx` oder `caddy`) mit Let's-Encrypt-Zertifikat davorschalten, der
   `wss://schulung.example.com` auf `http://localhost:8787` weiterleitet.
4. Adresse in der App eintragen: **`wss://schulung.example.com`**.

---

## Danach: Adresse in der App verwenden

In allen drei Fällen ändert sich am Client-Code nichts – im Video-Chat-Fenster einfach die
`wss://…`-Adresse anstelle von `ws://localhost:8787` eintragen. Die Adresse wird lokal
gemerkt (`localStorage`), muss also nur einmal pro Gerät eingetragen werden.
