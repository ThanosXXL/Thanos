// Parses raw M3U/M3U8 playlist text into a flat list of channel entries,
// then classifies each entry by country (DE/GR) and content category
// (live / serien / kino) based on keywords found in its group-title,
// name and tvg-language attributes. Playlists vary a lot in how they
// label groups, so classification is best-effort keyword matching
// rather than a strict format.
(function (global) {
  function parseM3U(text) {
    const lines = text.split(/\r?\n/);
    const channels = [];
    let current = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF')) {
        const attrs = {};
        const attrRegex = /([a-zA-Z0-9-]+)="([^"]*)"/g;
        let match;
        while ((match = attrRegex.exec(line))) {
          attrs[match[1].toLowerCase()] = match[2];
        }
        const commaIndex = line.lastIndexOf(',');
        const name = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : 'Unbenannter Sender';
        current = {
          name: name || 'Unbenannter Sender',
          logo: attrs['tvg-logo'] || '',
          groupTitle: attrs['group-title'] || '',
          tvgLanguage: attrs['tvg-language'] || attrs['tvg-country'] || '',
        };
      } else if (line.startsWith('#')) {
        continue; // ignore other directives (#EXTGRP, #EXTVLCOPT, #EXT-X-*, ...)
      } else if (current) {
        current.url = line;
        channels.push(current);
        current = null;
      }
    }
    return channels;
  }

  const DE_TOKENS = ['de', 'deu', 'ger', 'germany', 'deutschland'];
  const GR_TOKENS = ['gr', 'grc', 'gre', 'greece', 'griechenland', 'hellas', 'ellas'];

  const KINO_TOKENS = ['vod', 'movie', 'movies', 'film', 'filme', 'kino', 'cinema'];
  const SERIEN_TOKENS = ['serie', 'serien', 'series', 'show', 'shows'];

  // Well-known free-to-air channel brands, used as a last-resort country
  // match for playlists whose group-title/tvg-language carries no country
  // marker at all (common in real-world, inconsistently labeled playlists).
  const KNOWN_DE_CHANNELS = [
    'das erste', 'ard', 'zdfneo', 'zdf', 'rtlzwei', 'rtl2', 'rtl', 'sat.1', 'sat1',
    'prosieben', 'pro7', 'vox', 'kabel eins', 'kabel1', '3sat', 'phoenix',
    'tagesschau24', 'welt', 'n-tv', 'ntv', 'sport1', 'sport 1', 'arte',
    'wdr', 'ndr', 'mdr', 'hr', 'rbb', 'swr', 'br', 'dmax', 'tele 5', 'tele5',
    'sixx', 'nitro', 'eurosport',
  ];
  const KNOWN_GR_CHANNELS = [
    'ert news', 'ertnews', 'ert1', 'ert2', 'ert3', 'ert', 'ant1', 'mega',
    'skai', 'star channel', 'star', 'alpha tv', 'alpha', 'open tv', 'open',
    'epsilon', 'action24', 'action 24', 'kontra channel', 'kontra',
  ];

  function hasToken(haystack, tokens) {
    return tokens.some((token) => new RegExp(`\\b${token}\\b`, 'i').test(haystack));
  }

  function normalizeChannelName(name) {
    return name
      .toLowerCase()
      .replace(/\b(hd|fhd|uhd|4k|sd|backup|geo|multi)\b/g, ' ')
      .replace(/[^a-z0-9äöüß.]+/g, ' ')
      .trim();
  }

  function classifyCountry(channel) {
    const haystack = `${channel.groupTitle} ${channel.tvgLanguage}`;
    if (/🇩🇪/.test(haystack) || hasToken(haystack, DE_TOKENS)) return 'DE';
    if (/🇬🇷/.test(haystack) || hasToken(haystack, GR_TOKENS)) return 'GR';
    // Fall back to checking the channel name itself for a leading country marker.
    const nameHaystack = channel.name;
    if (/🇩🇪/.test(nameHaystack) || hasToken(nameHaystack, DE_TOKENS)) return 'DE';
    if (/🇬🇷/.test(nameHaystack) || hasToken(nameHaystack, GR_TOKENS)) return 'GR';
    // Last resort: recognize well-known channel brands even without any
    // country marker in the playlist (e.g. group-title="LIVE" with no DE/GR tag).
    const normalizedName = normalizeChannelName(channel.name);
    if (KNOWN_DE_CHANNELS.some((brand) => normalizedName.startsWith(brand))) return 'DE';
    if (KNOWN_GR_CHANNELS.some((brand) => normalizedName.startsWith(brand))) return 'GR';
    return null;
  }

  function classifyCategory(channel) {
    const haystack = `${channel.groupTitle} ${channel.name}`;
    if (hasToken(haystack, KINO_TOKENS)) return 'kino';
    if (hasToken(haystack, SERIEN_TOKENS)) return 'serien';
    return 'live';
  }

  function parseAndClassify(text) {
    return parseM3U(text)
      .filter((channel) => channel.url)
      .map((channel) => ({
        ...channel,
        country: classifyCountry(channel),
        category: classifyCategory(channel),
      }))
      .filter((channel) => channel.country === 'DE' || channel.country === 'GR');
  }

  global.M3U = { parseM3U, parseAndClassify };
})(window);
