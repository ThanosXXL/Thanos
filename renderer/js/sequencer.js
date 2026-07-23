// Ordner 2: eigene Musikstuecke aus Equipment-Spuren (Drums, Piano, Saxophon,
// Vocals, Bass ...) per Step-Sequencer bauen.
const Sequencer = (() => {
  const STEPS = 16;

  function createTrack(id, voice, note, label) {
    return { id, voice, note, label, steps: new Array(STEPS).fill(false) };
  }

  function play(context, destination, tracks, bpm, loops, onStep) {
    const stepDuration = 60 / bpm / 4; // 16tel Noten
    const startTime = context.currentTime + 0.1;
    let stepCount = 0;
    const totalSteps = STEPS * loops;

    for (let loop = 0; loop < loops; loop++) {
      for (let step = 0; step < STEPS; step++) {
        const time = startTime + (loop * STEPS + step) * stepDuration;
        tracks.forEach((track) => {
          if (track.steps[step]) {
            AudioEngine.triggerVoice(track.voice, destination, time, track.note);
          }
        });
      }
    }

    if (onStep) {
      const totalDuration = totalSteps * stepDuration;
      const raf = () => {
        const elapsed = context.currentTime - startTime;
        const current = Math.floor(elapsed / stepDuration) % STEPS;
        if (elapsed >= 0 && elapsed < totalDuration) {
          onStep(current, false);
          seqAnimationHandle = requestAnimationFrame(raf);
        } else if (elapsed >= totalDuration) {
          onStep(-1, true);
        } else {
          seqAnimationHandle = requestAnimationFrame(raf);
        }
      };
      var seqAnimationHandle = requestAnimationFrame(raf);
      return {
        duration: totalDuration,
        cancel: () => cancelAnimationFrame(seqAnimationHandle)
      };
    }

    return { duration: totalSteps * stepDuration, cancel: () => {} };
  }

  return { STEPS, createTrack, play };
})();
