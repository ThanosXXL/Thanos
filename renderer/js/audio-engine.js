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

  const VOICES = {
    kick: (dest, t) => playKick(dest, t),
    snare: (dest, t) => playSnare(dest, t),
    hihat: (dest, t) => playHiHat(dest, t, false),
    openhat: (dest, t) => playHiHat(dest, t, true),
    clap: (dest, t) => playClap(dest, t),
    piano: (dest, t, note) => playPiano(dest, t, note),
    sax: (dest, t, note) => playSax(dest, t, note),
    vocal: (dest, t, note) => playVocal(dest, t, note),
    bass: (dest, t, note) => playBass(dest, t, note)
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
