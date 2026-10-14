// Erzeugt Ambient-Hintergrundmusik (WAV, danach per ffmpeg zu mp3, mono 22,05 kHz). Aufruf: node make-music.mjs [Sekunden]
import { writeFileSync } from 'node:fs';
const SR = 22050, SEC = +process.argv[2] || 48, N = SR * SEC, out = new Float32Array(N);
const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]];
const seg = N / chords.length, TAU = 2 * Math.PI;
chords.forEach((ch, c) => {
  for (let i = 0; i < seg; i++) {
    const t = i / SR, env = Math.sin(Math.PI * i / seg) ** 2; // weicher Ein-/Ausklang -> nahtloser Loop
    let s = 0;
    for (const f of ch) s += Math.sin(TAU * f * t) + .3 * Math.sin(TAU * 2 * f * t + 1) + .12 * Math.sin(TAU * f * 1.005 * t);
    out[c * seg + i] += env * s * .09;
  }
});
// sanfte Pentatonik-Töne obendrauf
const pent = [440, 493.88, 554.37, 659.25, 739.99];
for (let k = 0; k < SEC / 3; k++) {
  const f = pent[(k * 3 + (k >> 1)) % 5], st = Math.floor(k * 3 * SR + SR * .5);
  for (let i = 0; i < SR * 2 && st + i < N; i++) out[st + i] += Math.exp(-i / (SR * .5)) * Math.sin(TAU * f * i / SR) * .06;
}
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, out[i])) * 32767, 44 + i * 2);
writeFileSync('img/hintergrund.mp3', buf);
