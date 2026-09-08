/*
 * IT Schulungsmaßnahmen – Signaling-Server für den echten Mehrgeräte-Video-Chat
 * UND für die geräteübergreifende Synchronisation der Dozenten-Daten.
 *
 * Ohne diesen Server sind "Teilnehmer" im Video-Chat nur lokale Platzhalter auf einem
 * einzelnen Gerät, und die Dozenten-Daten (Listen, Hausaufgaben, Kalender, Chat) liegen
 * getrennt auf jedem Gerät. Dieser Server:
 *   1. reicht WebRTC-Signaling (Angebot/Antwort/ICE) zwischen Teilnehmern im selben "Raum"
 *      durch und verteilt Anwendungs-Ereignisse (Teilnehmerliste, Unterrichts-Chat,
 *      Moderation, PowerPoint-Präsentation) an alle im selben Raum. Audio/Video fließen
 *      danach direkt Peer-zu-Peer zwischen den Geräten – nicht über diesen Server.
 *   2. hält eine gemeinsame, serverweite Kopie der Dozenten-Daten (nicht raumgebunden,
 *      da die App insgesamt bis zu 4 Dozenten verwaltet) und verteilt Änderungen an alle
 *      verbundenen Geräte ("letzter Stand gewinnt" – kein Konfliktmanagement für
 *      gleichzeitige Änderungen, ausreichend für den Klassenzimmer-Maßstab dieser App).
 *
 * Start:  node server/signaling-server.js   (Port über Umgebungsvariable PORT, Standard 8787)
 *
 * Für den dauerhaften Betrieb (Online-Live-Schulungen über das Internet statt nur im
 * lokalen Netz) siehe server/DEPLOY.md - der Server ist bewusst so gebaut, dass er ohne
 * Änderungen auf Render/Fly.io/einem eigenen VPS laufen kann: PORT kommt aus der Umgebung,
 * ein einfacher HTTP-Healthcheck beantwortet normale GET-Anfragen (Plattformen prüfen so,
 * ob der Dienst noch lebt), und ein Ping/Pong-Keepalive verhindert, dass Reverse-Proxies
 * scheinbar inaktive WebSocket-Verbindungen während einer laufenden Schulung trennen.
 */
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8787;
// Grosszügiges, aber endliches Limit (Präsentationen können als Data-URL Teil des
// Zustands sein) - schützt vor einzelnen, versehentlich riesigen Nachrichten.
const MAX_PAYLOAD_BYTES = 25 * 1024 * 1024;
// Intervall für das Ping/Pong-Keepalive. Viele Hosting-Plattformen/Reverse-Proxies kappen
// WebSocket-Verbindungen nach ca. 55-60s ohne Datenverkehr - 25s liegt sicher darunter.
const HEARTBEAT_INTERVAL_MS = 25000;

// Eigener HTTP-Server statt WebSocketServer({ port }): so kann auf normale HTTP-Anfragen
// (Healthcheck der Hosting-Plattform, oder jemand öffnet die Adresse versehentlich im
// Browser) mit einer verständlichen Antwort reagiert werden, statt die Verbindung offen
// hängen zu lassen.
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('IT Schulungsmaßnahmen - Signaling-Server läuft. Verbindung nur über WebSocket.');
});
const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_PAYLOAD_BYTES });

// room code -> Map<peerId, { ws, name }>
const rooms = new Map();

// Alle verbundenen Clients (serverweit, unabhängig vom Video-Chat-Raum) für die
// Dozenten-Daten-Synchronisation.
const allClients = new Set();

const DATA_STORE_PATH = path.join(__dirname, 'data-store.json');
let appData = null; // null = noch keine Daten bekannt; erster Client mit echten Daten "gewinnt"

function loadDataStore() {
  try {
    appData = JSON.parse(fs.readFileSync(DATA_STORE_PATH, 'utf-8'));
    console.log('Gespeicherte Dozenten-Daten geladen:', DATA_STORE_PATH);
  } catch (err) {
    appData = null;
  }
}

function saveDataStore() {
  // Atomar schreiben (temp-Datei + rename), damit ein Absturz mitten im Schreibvorgang
  // nicht die einzige gemeinsame Datenkopie beschädigt.
  const tmpPath = DATA_STORE_PATH + '.tmp';
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(appData, null, 2), 'utf-8');
    fs.renameSync(tmpPath, DATA_STORE_PATH);
  } catch (err) {
    console.error('Konnte Dozenten-Daten nicht speichern:', err.message);
  }
}

// Grobe Formvalidierung für empfangene Dozenten-Daten: verhindert, dass ein defekter
// oder böswilliger Client mit einer leeren/kaputten Nachricht den gemeinsamen Datenstand
// aller Geräte überschreibt und dauerhaft speichert.
function isValidAppState(state) {
  return !!state && typeof state === 'object' && Array.isArray(state.dozenten);
}

loadDataStore();

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function roomOf(code) {
  if (!rooms.has(code)) rooms.set(code, new Map());
  return rooms.get(code);
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let peerId = null;
  allClients.add(ws);

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      return; // ungültige Nachricht ignorieren
    }

    if (msg.type === 'data-request') {
      send(ws, { type: 'data-full', state: appData });
      return;
    }

    if (msg.type === 'data-update') {
      if (!isValidAppState(msg.state)) return; // unbrauchbare Nachricht ignorieren, nichts überschreiben
      appData = msg.state;
      saveDataStore();
      allClients.forEach((client) => {
        if (client !== ws) send(client, { type: 'data-full', state: appData });
      });
      return;
    }

    if (msg.type === 'join') {
      const code = String(msg.room || 'default').trim() || 'default';
      const name = String(msg.name || 'Teilnehmer').slice(0, 60);
      peerId = uid();
      currentRoom = roomOf(code);

      const existingPeers = Array.from(currentRoom.entries()).map(([id, p]) => ({
        peerId: id,
        name: p.name
      }));

      currentRoom.set(peerId, { ws, name });

      send(ws, { type: 'joined', peerId, peers: existingPeers });

      // Bestehende Teilnehmer über den Neuzugang informieren
      currentRoom.forEach((p, id) => {
        if (id !== peerId) send(p.ws, { type: 'peer-joined', peerId, name });
      });
      return;
    }

    if (!currentRoom || !peerId) return; // erst "join" nötig

    if (msg.type === 'signal' && msg.to) {
      const target = currentRoom.get(msg.to);
      if (target) send(target.ws, { type: 'signal', from: peerId, data: msg.data });
      return;
    }

    if (msg.type === 'broadcast') {
      currentRoom.forEach((p, id) => {
        if (id !== peerId) send(p.ws, { type: 'broadcast', from: peerId, payload: msg.payload });
      });
      return;
    }
  });

  ws.on('close', () => {
    allClients.delete(ws);
    if (currentRoom && peerId) {
      currentRoom.delete(peerId);
      currentRoom.forEach((p) => send(p.ws, { type: 'peer-left', peerId }));
      if (currentRoom.size === 0) {
        for (const [code, r] of rooms.entries()) {
          if (r === currentRoom) rooms.delete(code);
        }
      }
    }
  });
});

// Keepalive: Verbindungen, die auf den letzten Ping nicht mit einem Pong geantwortet haben,
// gelten als tot (z. B. Gerät abgestürzt/Netzwerk weg, ohne dass ein "close" ankam) und
// werden beendet - dadurch bleiben rooms/allClients korrekt und ein Reverse-Proxy sieht
// regelmäßigen Datenverkehr statt einer scheinbar inaktiven Verbindung.
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);
heartbeat.unref();

function shutdown() {
  console.log('Signaling-Server wird beendet …');
  clearInterval(heartbeat);
  wss.clients.forEach((ws) => ws.close(1001, 'Server wird neu gestartet'));
  httpServer.close(() => process.exit(0));
  // Falls offene Verbindungen das Schließen verzögern: nach kurzer Frist hart beenden
  // (z. B. wichtig, damit ein Neustart durch die Hosting-Plattform nicht hängen bleibt).
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

httpServer.listen(PORT, () => {
  console.log(`Signaling-Server läuft auf ws://localhost:${PORT}`);
  console.log('Zum Beenden Strg+C drücken.');
});
