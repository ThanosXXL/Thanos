'use strict';
// Simulierte Live-Metriken. Deterministisch aus (Service, Zeitpunkt) berechnet,
// damit Verläufe bei jedem Abruf konsistent sind und kein Speicher wächst.
// In einer echten Installation wird dieses Modul durch einen Prometheus-/
// Datadog-Adapter mit derselben Schnittstelle ersetzt.
const crypto = require('node:crypto');

function noise(seed, t) {
  const h = crypto.createHash('sha1').update(`${seed}:${t}`).digest();
  return h.readUInt32BE(0) / 0xffffffff; // 0..1
}

// Glatter Wert: lineare Interpolation zwischen zufälligen Stützpunkten
function smooth(seed, t, periodMs) {
  const k = Math.floor(t / periodMs);
  const f = (t % periodMs) / periodMs;
  const a = noise(seed, k), b = noise(seed, k + 1);
  const e = f * f * (3 - 2 * f);
  return a + (b - a) * e;
}

// Tagesprofil: nachts wenig, mittags viel Traffic
function dayLoad(t) {
  const hour = new Date(t).getUTCHours() + new Date(t).getUTCMinutes() / 60;
  return 0.55 + 0.45 * Math.sin(((hour - 7) / 24) * 2 * Math.PI);
}

const STATUS_FACTOR = {
  operational: { lat: 1, err: 1, cpu: 1 },
  degraded: { lat: 2.6, err: 6, cpu: 1.25 },
  down: { lat: 0, err: 100, cpu: 0.1 },
  maintenance: { lat: 1.3, err: 2, cpu: 0.4 },
};

function sample(service, t) {
  const f = STATUS_FACTOR[service.status] || STATUS_FACTOR.operational;
  const load = dayLoad(t);
  const n1 = smooth(service.id + 'cpu', t, 5 * 60_000);
  const n2 = smooth(service.id + 'lat', t, 3 * 60_000);
  const n3 = smooth(service.id + 'rps', t, 7 * 60_000);
  const n4 = smooth(service.id + 'mem', t, 30 * 60_000);
  const cpu = Math.min(99, service.baseCpu * f.cpu * (0.6 + 0.6 * load) * (0.85 + 0.3 * n1));
  const memory = Math.min(97, 35 + service.baseCpu * 0.5 + 15 * n4);
  const latency = service.status === 'down' ? 0 : service.baseLatency * f.lat * (0.8 + 0.5 * n2) * (0.9 + 0.2 * load);
  const rps = service.status === 'down' ? 0 : (120 + service.baseCpu * 9) * load * (0.85 + 0.3 * n3);
  const errorRate = Math.min(100, 0.08 * f.err * (0.5 + n2));
  return {
    t: new Date(t).toISOString(),
    cpu: +cpu.toFixed(1), memory: +memory.toFixed(1), latency: +latency.toFixed(0),
    rps: +rps.toFixed(0), errorRate: +errorRate.toFixed(2),
  };
}

function history(service, points, stepMs, now = Date.now()) {
  const end = Math.floor(now / stepMs) * stepMs;
  const out = [];
  for (let i = points - 1; i >= 0; i--) out.push(sample(service, end - i * stepMs));
  return out;
}

// Gesamter Traffic pro Stunde über alle Services (letzte 24 h)
function trafficLast24h(services, now = Date.now()) {
  const step = 3600_000;
  const end = Math.floor(now / step) * step;
  const out = [];
  for (let i = 23; i >= 0; i--) {
    const t = end - i * step;
    let req = 0, err = 0;
    for (const s of services) {
      const m = sample(s, t);
      req += m.rps * 3600;
      err += m.rps * 3600 * (m.errorRate / 100);
    }
    out.push({ t: new Date(t).toISOString(), requests: Math.round(req), errors: Math.round(err) });
  }
  return out;
}

module.exports = { sample, history, trafficLast24h };
