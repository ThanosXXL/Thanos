// Music Heaven audio engine: shared AudioContext, synthesized instrument
// voices (no external samples needed) and buffer loading for uploaded tracks.
const AudioEngine = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  async function loadBuffer(url) {
    const context = getCtx();
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return context.decodeAudioData(arrayBuffer);
  }

  function noiseBuffer(context, duration) {
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function playKick(destination, time) {
    const context = getCtx();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.15);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  function playSnare(destination, time) {
    const context = getCtx();
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer(context, 0.2);
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1500;
    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.9, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    noise.connect(noiseFilter).connect(noiseGain).connect(destination);

    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    const oscGain = context.createGain();
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(oscGain).connect(destination);

    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  function playHiHat(destination, time, open) {
    const context = getCtx();
    const dur = open ? 0.3 : 0.08;
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer(context, dur);
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    noise.connect(filter).connect(gain).connect(destination);
    noise.start(time);
    noise.stop(time + dur);
  }

  function playClap(destination, time) {
    const context = getCtx();
    for (let i = 0; i < 3; i++) {
      const t = time + i * 0.02;
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer(context, 0.15);
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      noise.connect(filter).connect(gain).connect(destination);
      noise.start(t);
      noise.stop(t + 0.15);
    }
  }

  function playPiano(destination, time, freq) {
    const context = getCtx();
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.95);
  }

  function playSax(destination, time, freq) {
    const context = getCtx();
    const osc1 = context.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    const osc2 = context.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.005, time);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.linearRampToValueAtTime(1800, time + 0.15);
    filter.Q.value = 4;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.35, time + 0.06);
    gain.gain.setValueAtTime(0.35, time + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.75);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(destination);
    osc1.start(time); osc1.stop(time + 0.8);
    osc2.start(time); osc2.stop(time + 0.8);
  }

  function playVocal(destination, time, freq) {
    const context = getCtx();
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    const vibrato = context.createOscillator();
    vibrato.frequency.value = 5.5;
    const vibratoGain = context.createGain();
    vibratoGain.gain.value = 6;
    vibrato.connect(vibratoGain).connect(osc.frequency);
    const formant = context.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = freq * 2;
    formant.Q.value = 6;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.4, time + 0.08);
    gain.gain.setValueAtTime(0.4, time + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.7);
    osc.connect(formant).connect(gain).connect(destination);
    vibrato.start(time); vibrato.stop(time + 0.7);
    osc.start(time); osc.stop(time + 0.7);
  }

  function playBass(destination, time, freq) {
    const context = getCtx();
    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq / 2, time);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    osc.connect(filter).connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.55);
  }

  // ---- EFX: einschlaegige DJ-/Produktions-Effekte ----
  function playRiser(destination, time) {
    const context = getCtx();
    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(2200, time + 1.1);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(7000, time + 1.1);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.35, time + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.15);
    osc.connect(filter).connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 1.2);
  }

  function playDownlifter(destination, time) {
    const context = getCtx();
    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, time);
    osc.frequency.exponentialRampToValueAtTime(70, time + 0.9);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.95);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 1);
  }

  function playImpact(destination, time) {
    const context = getCtx();
    const sub = context.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, time);
    sub.frequency.exponentialRampToValueAtTime(35, time + 0.5);
    const subGain = context.createGain();
    subGain.gain.setValueAtTime(0.8, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
    sub.connect(subGain).connect(destination);

    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer(context, 0.6);
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 3000;
    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
    noise.connect(noiseFilter).connect(noiseGain).connect(destination);

    sub.start(time); sub.stop(time + 0.85);
    noise.start(time); noise.stop(time + 0.6);
  }

  function playNoiseSweep(destination, time) {
    const context = getCtx();
    const dur = 1.0;
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer(context, dur);
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(200, time);
    filter.frequency.exponentialRampToValueAtTime(8000, time + 0.9);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.4, time + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    noise.connect(filter).connect(gain).connect(destination);
    noise.start(time);
    noise.stop(time + dur);
  }

  function playReverseCymbal(destination, time) {
    const context = getCtx();
    const dur = 1.4;
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer(context, dur);
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4000;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + dur - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    noise.connect(filter).connect(gain).connect(destination);
    noise.start(time);
    noise.stop(time + dur);
  }

  // ---- Loops: kurze, live synthetisierte Phrasen als ein Trigger ----
  function playDrumLoop(destination, time) {
    const step = 0.15;
    playKick(destination, time);
    playHiHat(destination, time + step, false);
    playSnare(destination, time + step * 2);
    playHiHat(destination, time + step * 3, false);
  }

  function playBassLoop(destination, time) {
    const step = 0.2;
    [110, 110, 146.83, 130.81].forEach((freq, i) => playBass(destination, time + i * step, freq));
  }

  function playPercLoop(destination, time) {
    const step = 0.125;
    [false, true, false, false, true, false, false, false].forEach((open, i) => playHiHat(destination, time + i * step, open));
  }

  function playArpLoop(destination, time) {
    const step = 0.14;
    [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => playPiano(destination, time + i * step, freq));
  }

  const VOICES = {
    kick: (dest, t) => playKick(dest, t),
    snare: (dest, t) => playSnare(dest, t),
    hihat: (dest, t) => playHiHat(dest, t, false),
    openhat: (dest, t) => playHiHat(dest, t, true),
    clap: (dest, t) => playClap(dest, t),
    piano: (dest, t, note) => playPiano(dest, t, note),
    sax: (dest, t, note) => playSax(dest, t, note),
    vocal: (dest, t, note) => playVocal(dest, t, note),
    bass: (dest, t, note) => playBass(dest, t, note),
    riser: (dest, t) => playRiser(dest, t),
    downlifter: (dest, t) => playDownlifter(dest, t),
    impact: (dest, t) => playImpact(dest, t),
    noisesweep: (dest, t) => playNoiseSweep(dest, t),
    reversecymbal: (dest, t) => playReverseCymbal(dest, t),
    drumloop: (dest, t) => playDrumLoop(dest, t),
    bassloop: (dest, t) => playBassLoop(dest, t),
    percloop: (dest, t) => playPercLoop(dest, t),
    arploop: (dest, t) => playArpLoop(dest, t)
  };

  function triggerVoice(voiceId, destination, time, note) {
    const fn = VOICES[voiceId];
    if (fn) fn(destination, time, note);
  }

  // Recorder: taps a source node into a MediaStreamDestination so a live
  // preview can be captured as the exact take the user just listened to.
  function createRecorder(context, sourceNode) {
    const streamDest = context.createMediaStreamDestination();
    sourceNode.connect(streamDest);
    const recorder = new MediaRecorder(streamDest.stream, { mimeType: 'audio/webm' });
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    return {
      start: () => recorder.start(),
      stop: () => new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
        recorder.stop();
      })
    };
  }

  return { getCtx, loadBuffer, triggerVoice, createRecorder, VOICES };
})();
