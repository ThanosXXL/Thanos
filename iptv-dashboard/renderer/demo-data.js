// Built-in demo dataset so the app is fully explorable without a real M3U
// link: real German/Greek free-to-air channel names for the UI, but backed
// by publicly documented HLS test streams (the same ones hls.js's own docs
// use) rather than actual broadcast feeds, since this app cannot bundle
// unauthorized live streams. Serien/Kino entries are intentionally labeled
// "Demo-..." because no specific real show/film is actually being served.
(function (global) {
  const DEMO_CHANNELS = [
    // Deutschland – Live TV
    { group: 'DE| LIVE', name: 'Das Erste' },
    { group: 'DE| LIVE', name: 'ZDF' },
    { group: 'DE| LIVE', name: 'RTL' },
    { group: 'DE| LIVE', name: 'SAT.1' },
    { group: 'DE| LIVE', name: 'ProSieben' },
    { group: 'DE| LIVE', name: 'VOX' },
    { group: 'DE| LIVE', name: 'kabel eins' },
    { group: 'DE| LIVE', name: 'RTLZWEI' },
    { group: 'DE| LIVE', name: 'ZDFneo' },
    { group: 'DE| LIVE', name: '3sat' },
    { group: 'DE| LIVE', name: 'Phoenix' },
    { group: 'DE| LIVE', name: 'tagesschau24' },
    // Deutschland – Serien
    { group: 'DE| SERIEN', name: 'Demo-Serie 1' },
    { group: 'DE| SERIEN', name: 'Demo-Serie 2' },
    { group: 'DE| SERIEN', name: 'Demo-Serie 3' },
    { group: 'DE| SERIEN', name: 'Demo-Serie 4' },
    // Deutschland – Kino/Filme
    { group: 'DE| VOD', name: 'Demo-Film 1' },
    { group: 'DE| VOD', name: 'Demo-Film 2' },
    { group: 'DE| VOD', name: 'Demo-Film 3' },
    { group: 'DE| VOD', name: 'Demo-Film 4' },
    // Griechenland – Live TV
    { group: 'GR| LIVE', name: 'ERT1' },
    { group: 'GR| LIVE', name: 'ERT2' },
    { group: 'GR| LIVE', name: 'ERT3' },
    { group: 'GR| LIVE', name: 'ERT NEWS' },
    { group: 'GR| LIVE', name: 'ANT1' },
    { group: 'GR| LIVE', name: 'MEGA' },
    { group: 'GR| LIVE', name: 'SKAI' },
    { group: 'GR| LIVE', name: 'STAR Channel' },
    { group: 'GR| LIVE', name: 'ALPHA TV' },
    { group: 'GR| LIVE', name: 'OPEN TV' },
    // Griechenland – Serien
    { group: 'GR| SERIES', name: 'Demo-Serie 1' },
    { group: 'GR| SERIES', name: 'Demo-Serie 2' },
    { group: 'GR| SERIES', name: 'Demo-Serie 3' },
    { group: 'GR| SERIES', name: 'Demo-Serie 4' },
    // Griechenland – Kino/Filme
    { group: 'GR| MOVIES', name: 'Demo-Film 1' },
    { group: 'GR| MOVIES', name: 'Demo-Film 2' },
    { group: 'GR| MOVIES', name: 'Demo-Film 3' },
    { group: 'GR| MOVIES', name: 'Demo-Film 4' },
  ];

  // Two well-known, publicly documented HLS test streams (no real broadcast
  // content), alternated purely so playback doesn't look like one hardcoded file.
  const DEMO_STREAMS = [
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
  ];

  const lines = ['#EXTM3U'];
  DEMO_CHANNELS.forEach((channel, index) => {
    const url = DEMO_STREAMS[index % DEMO_STREAMS.length];
    lines.push(`#EXTINF:-1 group-title="${channel.group}",${channel.name}`);
    lines.push(url);
  });

  global.DEMO_M3U = lines.join('\n');
})(window);
