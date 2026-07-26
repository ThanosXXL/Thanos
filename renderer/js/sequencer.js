// Ordner 2: eigene Musikstuecke aus Equipment-Spuren (Drums, Piano, Saxophon,
// Vocals, Bass ...) per Step-Sequencer bauen.
const Sequencer = (() => {
  const DEFAULT_STEPS = 16;

  function createTrack(id, voice, note, label, stepCount) {
    return {
      id, voice, note, label,
      steps: new Array(stepCount || DEFAULT_STEPS).fill(false),
      muted: false,
      solo: false
    };
  }

  // Passt die Step-Anzahl einer bestehenden Spur an (z. B. bei Wechsel
  // 1 Takt <-> 2 Takte). Erhaelt vorhandene Steps im ueberlappenden Bereich.
  function resizeTrack(track, stepCount) {
    const steps = track.steps.slice(0, stepCount);
    while (steps.length < stepCount) steps.push(false);
    track.steps = steps;
    return track;
  }

  function play(context, destination, tracks, bpm, loops, stepsPerBar, onStep) {
    const stepDuration = 60 / bpm / 4; // 16tel Noten
    const startTime = context.currentTime + 0.1;
    const totalSteps = stepsPerBar * loops;
    const hasSolo = tracks.some((t) => t.solo);
    const audible = (t) => (hasSolo ? t.solo && !t.muted : !t.muted);

    for (let loop = 0; loop < loops; loop++) {
      for (let step = 0; step < stepsPerBar; step++) {
        const time = startTime + (loop * stepsPerBar + step) * stepDuration;
        tracks.forEach((track) => {
          if (track.steps[step] && audible(track)) {
            AudioEngine.triggerVoice(track.voice, destination, time, track.note);
          }
        });
      }
    }

    if (onStep) {
      const totalDuration = totalSteps * stepDuration;
      let seqAnimationHandle;
      const raf = () => {
        const elapsed = context.currentTime - startTime;
        const current = Math.floor(elapsed / stepDuration) % stepsPerBar;
        if (elapsed >= 0 && elapsed < totalDuration) {
          onStep(current, false);
          seqAnimationHandle = requestAnimationFrame(raf);
        } else if (elapsed >= totalDuration) {
          onStep(-1, true);
        } else {
          seqAnimationHandle = requestAnimationFrame(raf);
        }
      };
      seqAnimationHandle = requestAnimationFrame(raf);
      return {
        duration: totalDuration,
        cancel: () => cancelAnimationFrame(seqAnimationHandle)
      };
    }

    return { duration: totalSteps * stepDuration, cancel: () => {} };
  }

  return { DEFAULT_STEPS, createTrack, resizeTrack, play };
})();
