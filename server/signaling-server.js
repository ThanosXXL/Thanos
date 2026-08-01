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
 */
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8787;
const wss = new WebSocketServer({ port: PORT });

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
  try {
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(appData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Konnte Dozenten-Daten nicht speichern:', err.message);
  }
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

console.log(`Signaling-Server läuft auf ws://localhost:${PORT}`);
console.log('Zum Beenden Strg+C drücken.');
