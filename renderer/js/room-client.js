// ===== Netzwerk-Client für den echten Mehrgeräte-Video-Chat =====
// Verbindet sich mit server/signaling-server.js (WebSocket) und baut über WebRTC direkte
// Peer-zu-Peer-Verbindungen zu den anderen Teilnehmern im selben Raum auf. Ohne Verbindung
// funktioniert der Video-Chat weiterhin wie bisher rein lokal (keine Regression).
//
// video-chat.js/presentation.js setzen die roomClient.onXxx-Hooks und rufen
// roomClient.connect()/broadcast()/disconnect() auf.

const roomClient = {
  ws: null,
  peerId: null,
  roomCode: null,
  myName: '',
  connected: false,
  peers: new Map(), // peerId -> { name, pc, stream }
  localStream: null,

  onPeerJoined: null, // (peerId, name) => {}
  onPeerLeft: null, // (peerId) => {}
  onRemoteStream: null, // (peerId, stream) => {}
  onBroadcast: null, // (fromPeerId, payload) => {}
  onConnectionChange: null, // (connected) => {}
  onDataFull: null, // (state|null) => {} – Dozenten-Daten-Synchronisation

  requestData() {
    this._send({ type: 'data-request' });
  },

  pushData(state) {
    if (!this.connected) return;
    this._send({ type: 'data-update', state });
  },

  connect(serverUrl, roomCode, myName, localStream) {
    return new Promise((resolve, reject) => {
      this.roomCode = roomCode;
      this.myName = myName;
      this.localStream = localStream;

      let ws;
      try {
        ws = new WebSocket(serverUrl);
      } catch (err) {
        reject(err);
        return;
      }
      this.ws = ws;

      const onOpenError = () => reject(new Error('Verbindung zum Server fehlgeschlagen.'));
      ws.addEventListener('error', onOpenError, { once: true });

      ws.addEventListener('open', () => {
        ws.removeEventListener('error', onOpenError);
        ws.send(JSON.stringify({ type: 'join', room: roomCode, name: myName }));
      });

      ws.addEventListener('message', (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch (err) {
          return;
        }
        this._handleMessage(msg, resolve);
      });

      ws.addEventListener('close', () => {
        const wasConnected = this.connected;
        this.connected = false;
        this.peers.forEach((p) => p.pc && p.pc.close());
        this.peers.clear();
        if (wasConnected && this.onConnectionChange) this.onConnectionChange(false);
      });

      ws.addEventListener('error', () => {
        if (!this.connected) reject(new Error('Verbindung zum Server fehlgeschlagen.'));
      });
    });
  },

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.peers.forEach((p) => p.pc && p.pc.close());
    this.peers.clear();
    this.connected = false;
  },

  broadcast(payload) {
    if (!this.connected || !this.ws) return;
    this.ws.send(JSON.stringify({ type: 'broadcast', payload }));
  },

  _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  },

  _handleMessage(msg, resolveConnect) {
    if (msg.type === 'joined') {
      this.peerId = msg.peerId;
      this.connected = true;
      if (this.onConnectionChange) this.onConnectionChange(true);
      // Ich bin neu im Raum: zu jedem bestehenden Teilnehmer eine Verbindung aufbauen
      // (ich initiiere das Angebot, um doppelte gleichzeitige Angebote zu vermeiden).
      msg.peers.forEach((p) => {
        if (this.onPeerJoined) this.onPeerJoined(p.peerId, p.name);
        this._createPeerConnection(p.peerId, true);
      });
      this.requestData();
      resolveConnect();
      return;
    }

    if (msg.type === 'data-full') {
      if (this.onDataFull) this.onDataFull(msg.state);
      return;
    }

    if (msg.type === 'peer-joined') {
      if (this.onPeerJoined) this.onPeerJoined(msg.peerId, msg.name);
      // Der/die Neue initiiert das Angebot; ich warte nur auf das Signal.
      return;
    }

    if (msg.type === 'peer-left') {
      const p = this.peers.get(msg.peerId);
      if (p && p.pc) p.pc.close();
      this.peers.delete(msg.peerId);
      if (this.onPeerLeft) this.onPeerLeft(msg.peerId);
      return;
    }

    if (msg.type === 'signal') {
      this._handleSignal(msg.from, msg.data);
      return;
    }

    if (msg.type === 'broadcast') {
      if (this.onBroadcast) this.onBroadcast(msg.from, msg.payload);
      return;
    }
  },

  _createPeerConnection(peerId, isInitiator) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this._send({ type: 'signal', to: peerId, data: { kind: 'ice', candidate: event.candidate } });
      }
    };

    pc.ontrack = (event) => {
      const entry = this.peers.get(peerId);
      const stream = event.streams[0];
      if (entry) entry.stream = stream;
      if (this.onRemoteStream) this.onRemoteStream(peerId, stream);
    };

    this.peers.set(peerId, { pc, stream: null });

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          this._send({ type: 'signal', to: peerId, data: { kind: 'offer', sdp: pc.localDescription } });
        });
    }

    return pc;
  },

  async _handleSignal(fromPeerId, data) {
    let entry = this.peers.get(fromPeerId);
    let pc = entry && entry.pc;

    if (data.kind === 'offer') {
      if (!pc) pc = this._createPeerConnection(fromPeerId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this._send({ type: 'signal', to: fromPeerId, data: { kind: 'answer', sdp: pc.localDescription } });
      return;
    }

    if (data.kind === 'answer' && pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      return;
    }

    if (data.kind === 'ice' && pc && data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        /* verspätete/ungültige Kandidaten ignorieren */
      }
    }
  }
};
