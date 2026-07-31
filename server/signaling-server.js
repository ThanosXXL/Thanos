/*
 * IT Schulungsmaßnahmen – Signaling-Server für den echten Mehrgeräte-Video-Chat.
 *
 * Ohne diesen Server sind "Teilnehmer" im Video-Chat nur lokale Platzhalter auf einem
 * einzelnen Gerät. Dieser Server verbindet mehrere echte Geräte (Dozent + Teilnehmer)
 * in einem gemeinsamen "Raum": er reicht WebRTC-Signaling (Angebot/Antwort/ICE) zwischen
 * den Teilnehmern durch und verteilt Anwendungs-Ereignisse (Teilnehmerliste, Unterrichts-
 * Chat, Moderation wie Stummschalten/Melden, PowerPoint-Präsentation) an alle im selben
 * Raum. Die eigentlichen Audio/Video-Daten fließen anschließend direkt (Peer-zu-Peer)
 * zwischen den Geräten über WebRTC – nicht über diesen Server.
 *
 * Start:  node server/signaling-server.js   (Port über Umgebungsvariable PORT, Standard 8787)
 */
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 8787;
const wss = new WebSocketServer({ port: PORT });

// room code -> Map<peerId, { ws, name }>
const rooms = new Map();

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

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      return; // ungültige Nachricht ignorieren
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
