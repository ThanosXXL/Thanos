// Ordner 1: automatisiertes Mixen hochgeladener Musik.
// Baut aus mehreren AudioBuffers eine Zeitleiste mit nahtlosem Crossfade
// oder einem simulierten "Scratch"-Uebergang und spielt sie ab.
const Mixer = (() => {
  const SCRATCH_TAIL = 0.55; // Dauer des Scratch-Effekts am Trackende

  function scheduleSeamless(context, destination, buffers, crossfade) {
    const sources = [];
    let cursor = context.currentTime + 0.15;
    let totalDuration = 0;

    buffers.forEach((buffer, index) => {
      const isFirst = index === 0;
      const isLast = index === buffers.length - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      source.connect(gain).connect(destination);

      const startAt = cursor;
      const fadeIn = isFirst ? 0 : crossfade;
      const fadeOut = isLast ? 0 : crossfade;

      gain.gain.setValueAtTime(isFirst ? 1 : 0.0001, startAt);
      if (fadeIn > 0) {
        gain.gain.exponentialRampToValueAtTime(1, startAt + fadeIn);
      }
      const fadeOutStart = startAt + buffer.duration - fadeOut;
      if (fadeOut > 0) {
        gain.gain.setValueAtTime(1, Math.max(startAt, fadeOutStart));
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + buffer.duration);
      }

      source.start(startAt);
      sources.push(source);

      cursor = startAt + buffer.duration - (isLast ? 0 : crossfade);
      totalDuration = startAt + buffer.duration - (context.currentTime + 0.15);
    });

    return { sources, duration: totalDuration };
  }

  function scheduleScratch(context, destination, buffers) {
    const sources = [];
    let cursor = context.currentTime + 0.15;
    let totalDuration = 0;

    buffers.forEach((buffer, index) => {
      const isLast = index === buffers.length - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      source.connect(gain).connect(destination);

      const startAt = cursor;
      gain.gain.setValueAtTime(1, startAt);

      if (!isLast) {
        // Scratch-Wobble kurz vor Trackende: Tonhoehe/Tempo zittert, dann Cut.
        const scratchStart = startAt + Math.max(0.3, buffer.duration - SCRATCH_TAIL);
        source.playbackRate.setValueAtTime(1, scratchStart);
        source.playbackRate.linearRampToValueAtTime(0.15, scratchStart + 0.12);
        source.playbackRate.linearRampToValueAtTime(1.4, scratchStart + 0.24);
        source.playbackRate.linearRampToValueAtTime(0.1, scratchStart + 0.36);
        source.playbackRate.linearRampToValueAtTime(1, scratchStart + 0.48);

        gain.gain.setValueAtTime(1, scratchStart);
        gain.gain.linearRampToValueAtTime(0.5, scratchStart + 0.12);
        gain.gain.linearRampToValueAtTime(0.9, scratchStart + 0.24);
        gain.gain.linearRampToValueAtTime(0.3, scratchStart + 0.36);
        gain.gain.exponentialRampToValueAtTime(0.0001, scratchStart + 0.5);

        source.start(startAt);
        source.stop(scratchStart + 0.52);
        cursor = scratchStart + 0.5;
      } else {
        source.start(startAt);
      }

      sources.push(source);
      totalDuration = (isLast ? startAt + buffer.duration : cursor) - (context.currentTime + 0.15);
    });

    return { sources, duration: totalDuration };
  }

  function schedule(context, destination, buffers, style, crossfadeSeconds) {
    if (!buffers.length) return { sources: [], duration: 0 };
    if (buffers.length === 1) {
      const source = context.createBufferSource();
      source.buffer = buffers[0];
      source.connect(destination);
      source.start(context.currentTime + 0.15);
      return { sources: [source], duration: buffers[0].duration };
    }
    return style === 'scratch'
      ? scheduleScratch(context, destination, buffers)
      : scheduleSeamless(context, destination, buffers, crossfadeSeconds);
  }

  function stopAll(sources) {
    sources.forEach((source) => {
      try { source.stop(); } catch (err) { /* already stopped */ }
    });
  }

  return { schedule, stopAll };
})();
