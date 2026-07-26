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

  // Kurzer, perkussiv abklingender Ton als "Vinyl-Sample" fuer die Scratch-Pads
  // (playbackRate-automatisierbar, im Gegensatz zu einem Oszillator).
  function stabBuffer(context, freq, duration) {
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / context.sampleRate;
      const env = Math.exp(-t * 5);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env;
    }
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

  // ---- Vocals: gemeinsamer Formant-Synth fuer verschiedene Gesangs-Stile ----
  function playVocalStyle(destination, time, freq, opts) {
    const context = getCtx();
    const {
      wave = 'sine',
      duration = 0.7,
      attack = 0.08,
      sustainUntil = 0.45,
      sustainLevel = 0.4,
      vibratoRate = 5.5,
      vibratoDepth = 6,
      formantMult = 2,
      formantQ = 6,
      pitchBend = 1,
      noiseAmount = 0
    } = opts || {};

    const osc = context.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    if (pitchBend !== 1) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * pitchBend), time + duration);
    }

    let vibrato = null;
    if (vibratoDepth > 0) {
      vibrato = context.createOscillator();
      vibrato.frequency.value = vibratoRate;
      const vibratoGain = context.createGain();
      vibratoGain.gain.value = vibratoDepth;
      vibrato.connect(vibratoGain).connect(osc.frequency);
    }

    const formant = context.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = freq * formantMult;
    formant.Q.value = formantQ;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(sustainLevel, time + attack);
    gain.gain.setValueAtTime(sustainLevel, time + sustainUntil);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(formant);

    if (noiseAmount > 0) {
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer(context, duration);
      const noiseFilter = context.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 2500;
      const noiseGain = context.createGain();
      noiseGain.gain.value = noiseAmount;
      noise.connect(noiseFilter).connect(noiseGain).connect(formant);
      noise.start(time);
      noise.stop(time + duration);
    }

    formant.connect(gain).connect(destination);
    if (vibrato) { vibrato.start(time); vibrato.stop(time + duration); }
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  function playVocalWords(destination, time, freq) {
    playVocalStyle(destination, time, freq, {
      wave: 'triangle', duration: 0.22, attack: 0.01, sustainUntil: 0.08,
      vibratoDepth: 0, formantMult: 2.4, formantQ: 8, noiseAmount: 0.15
    });
  }

  function playVocalChor(destination, time, freq) {
    // Drei leicht verstimmte Stimmen fuer Chor-Charakter
    [0.99, 1, 1.01].forEach((detune) => {
      playVocalStyle(destination, time, freq * detune, {
        wave: 'sine', duration: 1.1, attack: 0.18, sustainUntil: 0.8,
        vibratoDepth: 4, vibratoRate: 4.5, formantMult: 1.8, formantQ: 4, sustainLevel: 0.28
      });
    });
  }

  function playVocalRapSoul(destination, time, freq) {
    playVocalStyle(destination, time, freq, {
      wave: 'sawtooth', duration: 0.3, attack: 0.005, sustainUntil: 0.1,
      vibratoDepth: 2, formantMult: 1.6, formantQ: 5, pitchBend: 0.85, noiseAmount: 0.08
    });
  }

  function playVocalHouse(destination, time, freq) {
    playVocalStyle(destination, time, freq, {
      wave: 'square', duration: 0.4, attack: 0.01, sustainUntil: 0.05,
      vibratoDepth: 0, formantMult: 2, formantQ: 10, sustainLevel: 0.3
    });
  }

  function playVocalJazz(destination, time, freq) {
    playVocalStyle(destination, time, freq, {
      wave: 'sine', duration: 0.9, attack: 0.15, sustainUntil: 0.55,
      vibratoDepth: 8, vibratoRate: 4, formantMult: 2.2, formantQ: 5
    });
  }

  function playVocalPop(destination, time, freq) {
    playVocalStyle(destination, time, freq, {
      wave: 'triangle', duration: 0.5, attack: 0.03, sustainUntil: 0.3,
      vibratoDepth: 5, vibratoRate: 6, formantMult: 2.6, formantQ: 7
    });
  }

  function playVocalHipHop(destination, time, freq) {
    playVocalStyle(destination, time, freq, {
      wave: 'sawtooth', duration: 0.35, attack: 0.005, sustainUntil: 0.08,
      vibratoDepth: 0, formantMult: 1.4, formantQ: 4, pitchBend: 0.75, noiseAmount: 0.1
    });
  }

  // ---- Scratch: klassische DJ-/Turntablism-Techniken ----
  function playScratchBase(destination, time, opts) {
    const context = getCtx();
    const { freq = 220, duration = 0.45, rateKeyframes, gainKeyframes } = opts;
    const source = context.createBufferSource();
    source.buffer = stabBuffer(context, freq, duration + 0.15);
    const gain = context.createGain();
    source.connect(gain).connect(destination);

    source.playbackRate.setValueAtTime(Math.max(0.05, rateKeyframes[0].rate), time);
    rateKeyframes.slice(1).forEach((kf) => {
      source.playbackRate.linearRampToValueAtTime(Math.max(0.05, kf.rate), time + kf.at);
    });

    gain.gain.setValueAtTime(Math.max(0.0001, gainKeyframes[0].gain), time);
    gainKeyframes.slice(1).forEach((kf) => {
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, kf.gain), time + kf.at);
    });

    source.start(time);
    source.stop(time + duration + 0.2);
  }

  function playScratchBaby(destination, time) {
    playScratchBase(destination, time, {
      freq: 220, duration: 0.45,
      rateKeyframes: [{ at: 0, rate: 1 }, { at: 0.12, rate: 0.3 }, { at: 0.24, rate: 1.3 }, { at: 0.4, rate: 0.9 }],
      gainKeyframes: [{ at: 0, gain: 0.6 }, { at: 0.45, gain: 0.0001 }]
    });
  }

  function playScratchChirp(destination, time) {
    playScratchBase(destination, time, {
      freq: 260, duration: 0.35,
      rateKeyframes: [{ at: 0, rate: 1.4 }, { at: 0.08, rate: 0.2 }, { at: 0.16, rate: 1.6 }, { at: 0.3, rate: 0.8 }],
      gainKeyframes: [{ at: 0, gain: 0.6 }, { at: 0.09, gain: 0.0001 }, { at: 0.1, gain: 0.6 }, { at: 0.3, gain: 0.0001 }]
    });
  }

  function playScratchTransformer(destination, time) {
    const total = 0.4;
    const steps = 8;
    const step = total / steps;
    const gainKeyframes = [{ at: 0, gain: 0.0001 }];
    for (let i = 0; i < steps; i++) {
      gainKeyframes.push({ at: i * step + step * 0.15, gain: 0.6 });
      gainKeyframes.push({ at: i * step + step * 0.5, gain: 0.0001 });
    }
    playScratchBase(destination, time, {
      freq: 240, duration: total,
      rateKeyframes: [{ at: 0, rate: 1 }, { at: total, rate: 1 }],
      gainKeyframes
    });
  }

  function playScratchCrab(destination, time) {
    const total = 0.35;
    const clicks = 5;
    const step = total / clicks;
    const gainKeyframes = [{ at: 0, gain: 0.0001 }];
    const rateKeyframes = [{ at: 0, rate: 0.8 }];
    for (let i = 0; i < clicks; i++) {
      gainKeyframes.push({ at: i * step + step * 0.1, gain: 0.55 });
      gainKeyframes.push({ at: i * step + step * 0.35, gain: 0.0001 });
      rateKeyframes.push({ at: i * step + step * 0.5, rate: i % 2 === 0 ? 1.4 : 0.5 });
    }
    playScratchBase(destination, time, { freq: 260, duration: total, rateKeyframes, gainKeyframes });
  }

  function playScratchFlare(destination, time) {
    playScratchBase(destination, time, {
      freq: 230, duration: 0.4,
      rateKeyframes: [{ at: 0, rate: 1 }, { at: 0.18, rate: 0.3 }, { at: 0.35, rate: 1.2 }],
      gainKeyframes: [
        { at: 0, gain: 0.6 }, { at: 0.15, gain: 0.6 }, { at: 0.17, gain: 0.0001 },
        { at: 0.19, gain: 0.6 }, { at: 0.4, gain: 0.0001 }
      ]
    });
  }

  function playScratchTear(destination, time) {
    playScratchBase(destination, time, {
      freq: 210, duration: 0.6,
      rateKeyframes: [
        { at: 0, rate: 0.6 }, { at: 0.15, rate: 1.1 }, { at: 0.3, rate: 0.4 },
        { at: 0.45, rate: 1.3 }, { at: 0.6, rate: 0.7 }
      ],
      gainKeyframes: [{ at: 0, gain: 0.5 }, { at: 0.6, gain: 0.0001 }]
    });
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
    'vocal-gesang': (dest, t, note) => playVocal(dest, t, note),
    'vocal-woerter': (dest, t, note) => playVocalWords(dest, t, note),
    'vocal-chor': (dest, t, note) => playVocalChor(dest, t, note),
    'vocal-rapsoul': (dest, t, note) => playVocalRapSoul(dest, t, note),
    'vocal-house': (dest, t, note) => playVocalHouse(dest, t, note),
    'vocal-jazz': (dest, t, note) => playVocalJazz(dest, t, note),
    'vocal-pop': (dest, t, note) => playVocalPop(dest, t, note),
    'vocal-hiphop': (dest, t, note) => playVocalHipHop(dest, t, note),
    riser: (dest, t) => playRiser(dest, t),
    downlifter: (dest, t) => playDownlifter(dest, t),
    impact: (dest, t) => playImpact(dest, t),
    noisesweep: (dest, t) => playNoiseSweep(dest, t),
    reversecymbal: (dest, t) => playReverseCymbal(dest, t),
    drumloop: (dest, t) => playDrumLoop(dest, t),
    bassloop: (dest, t) => playBassLoop(dest, t),
    percloop: (dest, t) => playPercLoop(dest, t),
    arploop: (dest, t) => playArpLoop(dest, t),
    scratchbaby: (dest, t) => playScratchBaby(dest, t),
    scratchchirp: (dest, t) => playScratchChirp(dest, t),
    scratchtransformer: (dest, t) => playScratchTransformer(dest, t),
    scratchcrab: (dest, t) => playScratchCrab(dest, t),
    scratchflare: (dest, t) => playScratchFlare(dest, t),
    scratchtear: (dest, t) => playScratchTear(dest, t)
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
    // Immer hoechste Aufnahmequalitaet: hohe Opus-Bitrate, spaeter optional
    // verlustfrei als WAV exportierbar (siehe blobToWav).
    const recorder = new MediaRecorder(streamDest.stream, { mimeType: 'audio/webm', audioBitsPerSecond: 320000 });
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

  // ---- WAV-Export: dekodiert eine Aufnahme (webm/opus) und kodiert sie
  // als unkomprimiertes PCM16-WAV fuer maximale Kompatibilitaet mit
  // anderen DAWs/Playern. Ganz ohne externe Bibliothek.
  function encodeWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = numFrames * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) channels.push(audioBuffer.getChannelData(c));

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function blobToWav(blob) {
    const context = getCtx();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    return encodeWav(audioBuffer);
  }

  return { getCtx, loadBuffer, triggerVoice, createRecorder, blobToWav, VOICES };
})();
