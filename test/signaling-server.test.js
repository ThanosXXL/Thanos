// Integrationstest: startet den echten Signaling-Server als eigenen Prozess (genau wie im
// Betrieb) und verbindet echte WebSocket-Clients, statt die Serverlogik zu mocken.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const WebSocket = require('ws');

const PORT = 18787;
const DATA_STORE_PATH = path.join(__dirname, '..', 'server', 'data-store.json');
let serverProcess;

function waitForServerReady(proc) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server-Start-Timeout')), 5000);
    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Signaling-Server läuft')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    proc.on('error', reject);
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function nextMessage(ws) {
  return new Promise((resolve) => {
    ws.once('message', (data) => resolve(JSON.parse(data)));
  });
}

test.before(async () => {
  // Sauber starten: evtl. Datenreste von vorherigen Testläufen entfernen.
  try {
    fs.unlinkSync(DATA_STORE_PATH);
  } catch (err) {
    /* Datei existierte nicht - ok */
  }
  serverProcess = spawn('node', [path.join(__dirname, '..', 'server', 'signaling-server.js')], {
    env: { ...process.env, PORT: String(PORT) }
  });
  await waitForServerReady(serverProcess);
});

test.after(() => {
  if (serverProcess) serverProcess.kill();
  try {
    fs.unlinkSync(DATA_STORE_PATH);
  } catch (err) {
    /* egal */
  }
});

test('zwei Clients treten demselben Raum bei und sehen sich gegenseitig', async () => {
  const a = await connect();
  a.send(JSON.stringify({ type: 'join', room: 'test-raum', name: 'Geraet A' }));
  const joinedA = await nextMessage(a);
  assert.equal(joinedA.type, 'joined');
  assert.equal(joinedA.peers.length, 0);

  const b = await connect();
  const peerJoinedOnA = nextMessage(a); // A soll über B's Beitritt informiert werden
  b.send(JSON.stringify({ type: 'join', room: 'test-raum', name: 'Geraet B' }));
  const joinedB = await nextMessage(b);
  assert.equal(joinedB.peers.length, 1);
  assert.equal(joinedB.peers[0].name, 'Geraet A');

  const notifyA = await peerJoinedOnA;
  assert.equal(notifyA.type, 'peer-joined');
  assert.equal(notifyA.name, 'Geraet B');

  a.close();
  b.close();
});

test('signal-Nachrichten werden an den richtigen Peer weitergereicht', async () => {
  const a = await connect();
  a.send(JSON.stringify({ type: 'join', room: 'signal-raum', name: 'A' }));
  const joinedA = await nextMessage(a);

  const b = await connect();
  const peerJoinedOnA = nextMessage(a);
  b.send(JSON.stringify({ type: 'join', room: 'signal-raum', name: 'B' }));
  const joinedB = await nextMessage(b);
  await peerJoinedOnA;

  const signalOnB = nextMessage(b);
  a.send(JSON.stringify({ type: 'signal', to: joinedB.peerId, data: { kind: 'offer', sdp: 'FAKE_SDP' } }));
  const received = await signalOnB;
  assert.equal(received.type, 'signal');
  assert.equal(received.from, joinedA.peerId);
  assert.equal(received.data.sdp, 'FAKE_SDP');

  a.close();
  b.close();
});

test('broadcast erreicht alle anderen im Raum, aber nicht den Absender', async () => {
  const a = await connect();
  a.send(JSON.stringify({ type: 'join', room: 'broadcast-raum', name: 'A' }));
  await nextMessage(a);

  const b = await connect();
  const peerJoinedOnA = nextMessage(a);
  b.send(JSON.stringify({ type: 'join', room: 'broadcast-raum', name: 'B' }));
  await nextMessage(b);
  await peerJoinedOnA;

  const broadcastOnB = nextMessage(b);
  a.send(JSON.stringify({ type: 'broadcast', payload: { kind: 'lesson-chat', entry: { text: 'Hallo' } } }));
  const received = await broadcastOnB;
  assert.equal(received.type, 'broadcast');
  assert.equal(received.payload.entry.text, 'Hallo');

  a.close();
  b.close();
});

test('Dozenten-Daten: erster Client ohne Serverdaten wird zur Quelle, zweiter Client erhält sie', async () => {
  const a = await connect();
  a.send(JSON.stringify({ type: 'join', room: 'data-raum', name: 'A' }));
  await nextMessage(a);

  a.send(JSON.stringify({ type: 'data-request' }));
  const firstReply = await nextMessage(a);
  assert.equal(firstReply.type, 'data-full');
  assert.equal(firstReply.state, null); // Server kennt noch keine Daten

  const myState = { dozenten: [{ id: 'd1', name: 'Frau Müller' }] };
  a.send(JSON.stringify({ type: 'data-update', state: myState }));

  const b = await connect();
  const peerJoinedOnA = nextMessage(a);
  b.send(JSON.stringify({ type: 'join', room: 'data-raum', name: 'B' }));
  await nextMessage(b);
  await peerJoinedOnA;

  b.send(JSON.stringify({ type: 'data-request' }));
  const bData = await nextMessage(b);
  assert.equal(bData.type, 'data-full');
  assert.deepEqual(bData.state, myState);

  a.close();
  b.close();
});

test('peer-left wird gesendet, wenn ein Gerät den Raum verlässt', async () => {
  const a = await connect();
  a.send(JSON.stringify({ type: 'join', room: 'leave-raum', name: 'A' }));
  const joinedA = await nextMessage(a);

  const b = await connect();
  const peerJoinedOnA = nextMessage(a);
  b.send(JSON.stringify({ type: 'join', room: 'leave-raum', name: 'B' }));
  const joinedB = await nextMessage(b);
  await peerJoinedOnA;

  const peerLeftOnA = nextMessage(a);
  b.close();
  const leftMsg = await peerLeftOnA;
  assert.equal(leftMsg.type, 'peer-left');
  assert.equal(leftMsg.peerId, joinedB.peerId);

  a.close();
});
