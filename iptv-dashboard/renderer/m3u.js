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

  function hasToken(haystack, tokens) {
    return tokens.some((token) => new RegExp(`\\b${token}\\b`, 'i').test(haystack));
  }

  function classifyCountry(channel) {
    const haystack = `${channel.groupTitle} ${channel.tvgLanguage}`;
    if (/🇩🇪/.test(haystack) || hasToken(haystack, DE_TOKENS)) return 'DE';
    if (/🇬🇷/.test(haystack) || hasToken(haystack, GR_TOKENS)) return 'GR';
    // Fall back to checking the channel name itself for a leading country marker.
    const nameHaystack = channel.name;
    if (/🇩🇪/.test(nameHaystack) || hasToken(nameHaystack, DE_TOKENS)) return 'DE';
    if (/🇬🇷/.test(nameHaystack) || hasToken(nameHaystack, GR_TOKENS)) return 'GR';
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
