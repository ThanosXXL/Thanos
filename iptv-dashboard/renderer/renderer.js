(function () {
  const COUNTRY_LABELS = { DE: 'Deutschland', GR: 'Griechenland' };
  const COUNTRY_FLAGS = { DE: '🇩🇪', GR: '🇬🇷' };
  const CATEGORY_LABELS = { live: 'Live TV', serien: 'Serien', kino: 'Kino / Filme' };
  const CATEGORY_ICONS = { live: '📺', serien: '🎬', kino: '🍿' };
  const DIRECT_FILE_RE = /\.(mp4|mkv|avi|mov|webm|m4v)(\?|#|$)/i;
  const MAX_HLS_NETWORK_RETRIES = 2;

  const state = {
    m3uUrl: '',
    channels: [],
    favorites: new Set(), // keys: `${country}::${name}`, survives playlist URL/token changes
    screen: 'input', // input | loading | country | category | list | favorites | player
    selectedCountry: null,
    selectedCategory: null,
    selectedChannel: null,
    playerReturnScreen: 'list',
    errorMessage: '',
    isDemo: false,
  };

  const PLAYBACK_STALL_TIMEOUT_MS = 15000;

  let hlsInstance = null;
  let currentVideoEl = null;
  let pendingVideoEl = null;
  let stallTimeoutHandle = null;

  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.className) node.className = opts.className;
    if (opts.text !== undefined) node.textContent = opts.text;
    if (opts.attrs) {
      for (const [key, value] of Object.entries(opts.attrs)) node.setAttribute(key, value);
    }
    if (opts.onClick) node.addEventListener('click', opts.onClick);
    children.forEach((child) => child && node.appendChild(child));
    return node;
  }

  function button(text, className, onClick) {
    return el('button', { className, text, onClick, attrs: { type: 'button' } });
  }

  function channelKey(channel) {
    return `${channel.country}::${channel.name}`;
  }

  function persistSettings() {
    window.iptvAPI.saveSettings({ lastM3uUrl: state.m3uUrl, favorites: [...state.favorites] });
  }

  // ---------- Player ----------

  function destroyPlayer() {
    if (stallTimeoutHandle) {
      clearTimeout(stallTimeoutHandle);
      stallTimeoutHandle = null;
    }
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    if (currentVideoEl) {
      currentVideoEl.pause();
      currentVideoEl.removeAttribute('src');
      currentVideoEl.load();
      currentVideoEl = null;
    }
  }

  // Wires up playback for a channel with graceful degradation: prefer hls.js
  // (most live/IPTV streams are HLS regardless of URL extension), fall back
  // to native <video> playback if hls.js hits an unrecoverable error, and
  // surface a visible, retryable error state instead of a silent black frame.
  // A stall timeout also catches streams that neither succeed nor fail
  // (dead servers, geo-blocking that silently drops packets).
  function setupPlayer(frameEl, videoEl, url) {
    destroyPlayer();
    currentVideoEl = videoEl;
    clearPlayerError(frameEl);

    stallTimeoutHandle = setTimeout(() => {
      destroyPlayer();
      showPlayerError(frameEl, videoEl, url, 'Zeitüberschreitung – der Sender antwortet nicht.');
    }, PLAYBACK_STALL_TIMEOUT_MS);

    const markStarted = () => {
      if (stallTimeoutHandle) {
        clearTimeout(stallTimeoutHandle);
        stallTimeoutHandle = null;
      }
      clearPlayerError(frameEl);
    };

    const preferNative = !(window.Hls && window.Hls.isSupported()) || DIRECT_FILE_RE.test(url);
    if (preferNative) {
      attachNative(frameEl, videoEl, url, markStarted);
    } else {
      attachHls(frameEl, videoEl, url, /* allowNativeFallback */ true, markStarted);
    }
  }

  function attachHls(frameEl, videoEl, url, allowNativeFallback, markStarted) {
    const hls = new window.Hls();
    hlsInstance = hls;
    let networkRetries = 0;

    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      markStarted();
      videoEl.play().catch(() => {});
    });

    hls.on(window.Hls.Events.ERROR, (_evt, data) => {
      if (!data.fatal) return;
      switch (data.type) {
        case window.Hls.ErrorTypes.NETWORK_ERROR:
          if (networkRetries < MAX_HLS_NETWORK_RETRIES) {
            networkRetries += 1;
            hls.startLoad();
            return;
          }
          break;
        case window.Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          return;
        default:
          break;
      }

      destroyPlayer();
      if (allowNativeFallback) {
        attachNative(frameEl, videoEl, url, markStarted);
      } else {
        showPlayerError(frameEl, videoEl, url);
      }
    });

    hls.loadSource(url);
    hls.attachMedia(videoEl);
  }

  function attachNative(frameEl, videoEl, url, markStarted) {
    currentVideoEl = videoEl;
    videoEl.src = url;
    videoEl.addEventListener(
      'error',
      () => showPlayerError(frameEl, videoEl, url),
      { once: true }
    );
    videoEl.addEventListener('playing', markStarted, { once: true });
    videoEl.play().catch(() => {});
  }

  function clearPlayerError(frameEl) {
    const existing = frameEl.querySelector('.player-error-overlay');
    if (existing) existing.remove();
  }

  function showPlayerError(frameEl, videoEl, url, message) {
    clearPlayerError(frameEl);
    const overlay = el('div', { className: 'player-error-overlay' }, [
      el('span', { className: 'player-error-icon', text: '⚠️' }),
      el('p', {
        className: 'player-error-text',
        text: message || 'Wiedergabe fehlgeschlagen. Der Sender ist evtl. offline oder nicht kompatibel.',
      }),
      button('Erneut versuchen', 'btn btn-primary', () => setupPlayer(frameEl, videoEl, url)),
    ]);
    frameEl.appendChild(overlay);
  }

  // ---------- Data helpers ----------

  function channelsFor(country, category) {
    return state.channels.filter((c) => c.country === country && c.category === category);
  }

  function countFor(country) {
    return state.channels.filter((c) => c.country === country).length;
  }

  function countForCategory(country, category) {
    return channelsFor(country, category).length;
  }

  function favoriteChannels() {
    return state.channels.filter((c) => state.favorites.has(channelKey(c)));
  }

  // ---------- Navigation actions ----------

  function submitM3U(url) {
    const value = (url || '').trim();
    if (!value) {
      state.errorMessage = 'Bitte gib einen gültigen M3U-Link ein.';
      render();
      return;
    }
    loadM3U(value);
  }

  async function loadM3U(url) {
    state.errorMessage = '';
    state.screen = 'loading';
    render();

    const result = await window.iptvAPI.fetchM3U(url);
    if (!result.ok) {
      state.errorMessage = result.error;
      state.screen = 'input';
      render();
      return;
    }

    if (!/#EXTM3U|#EXTINF/i.test(result.text)) {
      state.errorMessage = 'Die Antwort scheint keine gültige M3U-Playlist zu sein.';
      state.screen = 'input';
      render();
      return;
    }

    let channels;
    try {
      channels = window.M3U.parseAndClassify(result.text);
    } catch {
      channels = [];
    }

    if (channels.length === 0) {
      state.errorMessage = 'Keine deutschen oder griechischen Sender in dieser Playlist gefunden.';
      state.screen = 'input';
      render();
      return;
    }

    state.channels = channels;
    state.m3uUrl = url;
    state.isDemo = false;
    persistSettings();
    state.screen = 'country';
    render();
  }

  function startDemo() {
    state.errorMessage = '';
    state.channels = window.M3U.parseAndClassify(window.DEMO_M3U);
    state.m3uUrl = '';
    state.isDemo = true;
    state.screen = 'country';
    render();
  }

  function selectCountry(code) {
    state.selectedCountry = code;
    state.screen = 'category';
    render();
  }

  function selectCategory(category) {
    state.selectedCategory = category;
    state.screen = 'list';
    render();
  }

  function selectChannel(channel) {
    state.selectedChannel = channel;
    state.playerReturnScreen = state.screen;
    state.screen = 'player';
    render();
  }

  function showFavorites() {
    state.screen = 'favorites';
    render();
  }

  function backToCountry() {
    destroyPlayer();
    state.selectedCountry = null;
    state.selectedCategory = null;
    state.selectedChannel = null;
    state.screen = 'country';
    render();
  }

  function backToCategory() {
    destroyPlayer();
    state.selectedChannel = null;
    state.screen = 'category';
    render();
  }

  function backFromPlayer() {
    destroyPlayer();
    state.selectedChannel = null;
    state.screen = state.playerReturnScreen === 'favorites' ? 'favorites' : 'list';
    render();
  }

  function changeM3U() {
    destroyPlayer();
    state.channels = [];
    state.selectedCountry = null;
    state.selectedCategory = null;
    state.selectedChannel = null;
    state.errorMessage = '';
    state.isDemo = false;
    state.screen = 'input';
    render();
  }

  function handleBack() {
    if (state.screen === 'category') backToCountry();
    else if (state.screen === 'list') backToCategory();
    else if (state.screen === 'favorites') backToCountry();
    else if (state.screen === 'player') backFromPlayer();
  }

  function toggleFavorite(channel, starBtn, event) {
    event.stopPropagation();
    const key = channelKey(channel);
    const isFavorite = state.favorites.has(key);
    if (isFavorite) {
      state.favorites.delete(key);
    } else {
      state.favorites.add(key);
    }
    persistSettings();
    starBtn.textContent = isFavorite ? '☆' : '★';
    starBtn.classList.toggle('is-favorite', !isFavorite);
    starBtn.setAttribute('aria-label', isFavorite ? 'Zu Favoriten hinzufügen' : 'Von Favoriten entfernen');
  }

  // ---------- Screens ----------

  function renderInputScreen() {
    const screen = el('div', { className: 'screen' });
    screen.appendChild(el('h1', { className: 'screen-title', text: 'Willkommen' }));
    screen.appendChild(
      el('p', {
        className: 'screen-subtitle',
        text: 'Gib den Link zu deiner M3U-Playlist ein, um deutsche und griechische Sender zu durchsuchen und live wiederzugeben.',
      })
    );

    const card = el('div', { className: 'glass-card' });
    card.appendChild(el('label', { className: 'field-label', text: 'M3U Playlist-Link', attrs: { for: 'm3u-url' } }));

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'm3u-url';
    input.className = 'm3u-input';
    input.placeholder = 'https://beispiel.de/playlist.m3u';
    input.value = state.m3uUrl || '';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitM3U(input.value);
    });
    card.appendChild(input);

    if (state.errorMessage) {
      card.appendChild(el('div', { className: 'error-box', text: state.errorMessage }));
    }

    card.appendChild(button('Sender laden', 'btn btn-primary', () => submitM3U(input.value)));
    card.appendChild(
      el('p', {
        className: 'hint-text',
        text: 'Es wird ausschließlich deine eigene, rechtmäßig bezogene M3U-Playlist verwendet. Sender werden automatisch nach Land (Deutschland/Griechenland) und Kategorie (Live TV, Serien, Kino/Filme) sortiert.',
      })
    );

    screen.appendChild(card);

    const demoCard = el('div', { className: 'glass-card demo-card' }, [
      el('div', { className: 'demo-divider-label', text: 'oder' }),
      el('p', { className: 'field-label', text: 'Ohne eigenen Link testen' }),
      button('▶ Demo-Version starten', 'btn btn-ghost btn-demo', startDemo),
      el('p', {
        className: 'hint-text',
        text: 'Zeigt die Länder-/Kategorie-Navigation sofort mit echten Sendernamen aus Deutschland (Das Erste, ZDF, RTL, …) und Griechenland (ERT1, ANT1, MEGA, …). Da hier kein eigener Zugang hinterlegt ist, läuft im Player ein neutraler Test-Stream statt des echten Live-Signals.',
      }),
    ]);
    screen.appendChild(demoCard);

    input.focus();
    return screen;
  }

  function renderLoadingScreen() {
    const screen = el('div', { className: 'screen' });
    screen.appendChild(el('div', { className: 'loader' }));
    screen.appendChild(el('p', { className: 'screen-subtitle', text: 'Playlist wird geladen …' }));
    return screen;
  }

  function renderCountryScreen() {
    const screen = el('div', { className: 'screen' });
    screen.appendChild(el('h1', { className: 'screen-title', text: 'Land auswählen' }));
    screen.appendChild(el('p', { className: 'screen-subtitle', text: 'Wähle das Land, dessen Sender du durchsuchen möchtest.' }));

    const grid = el('div', { className: 'grid-2' });
    ['DE', 'GR'].forEach((code) => {
      const tile = el(
        'button',
        { className: 'tile', attrs: { type: 'button' }, onClick: () => selectCountry(code) },
        [
          el('span', { className: 'tile-flag', text: COUNTRY_FLAGS[code] }),
          el('span', { className: 'tile-label', text: COUNTRY_LABELS[code] }),
          el('span', { className: 'tile-count', text: `${countFor(code)} Sender` }),
        ]
      );
      grid.appendChild(tile);
    });
    screen.appendChild(grid);

    if (state.favorites.size > 0) {
      const favTile = el(
        'button',
        { className: 'tile tile-favorite', attrs: { type: 'button' }, onClick: showFavorites },
        [
          el('span', { className: 'tile-flag', text: '★' }),
          el('span', { className: 'tile-label', text: 'Favoriten' }),
          el('span', { className: 'tile-count', text: `${favoriteChannels().length} Sender` }),
        ]
      );
      const favWrap = el('div', { className: 'favorites-tile-wrap' }, [favTile]);
      screen.appendChild(favWrap);
    }

    return screen;
  }

  function renderCategoryScreen() {
    const country = state.selectedCountry;
    const screen = el('div', { className: 'screen' });
    screen.appendChild(el('div', { className: 'breadcrumbs', text: `${COUNTRY_FLAGS[country]} ${COUNTRY_LABELS[country]}` }));
    screen.appendChild(el('h1', { className: 'screen-title', text: 'Kategorie auswählen' }));

    const grid = el('div', { className: 'grid-3' });
    ['live', 'serien', 'kino'].forEach((category) => {
      const tile = el(
        'button',
        { className: 'tile', attrs: { type: 'button' }, onClick: () => selectCategory(category) },
        [
          el('span', { className: 'category-icon', text: CATEGORY_ICONS[category] }),
          el('span', { className: 'tile-label', text: CATEGORY_LABELS[category] }),
          el('span', { className: 'tile-count', text: `${countForCategory(country, category)} Sender` }),
        ]
      );
      grid.appendChild(tile);
    });
    screen.appendChild(grid);
    return screen;
  }

  function channelLogo(channel) {
    const wrap = el('div', { className: 'channel-logo-wrap' });
    if (channel.logo) {
      const img = document.createElement('img');
      img.src = channel.logo;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => {
        wrap.textContent = '';
        wrap.appendChild(el('span', { className: 'channel-logo-fallback', text: channel.name.charAt(0).toUpperCase() }));
      };
      wrap.appendChild(img);
    } else {
      wrap.appendChild(el('span', { className: 'channel-logo-fallback', text: channel.name.charAt(0).toUpperCase() }));
    }
    return wrap;
  }

  function favoriteButton(channel) {
    const isFavorite = state.favorites.has(channelKey(channel));
    const btn = el('button', {
      className: `channel-favorite-btn${isFavorite ? ' is-favorite' : ''}`,
      text: isFavorite ? '★' : '☆',
      attrs: {
        type: 'button',
        'aria-label': isFavorite ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen',
      },
    });
    btn.addEventListener('click', (event) => toggleFavorite(channel, btn, event));
    return btn;
  }

  function channelCard(channel, showMeta) {
    const nameEl = el('span', { className: 'channel-name', text: channel.name });
    const children = [channelLogo(channel), nameEl];
    if (showMeta) {
      children.push(
        el('span', {
          className: 'channel-sub',
          text: `${COUNTRY_FLAGS[channel.country]} ${CATEGORY_LABELS[channel.category]}`,
        })
      );
    }
    const card = el(
      'button',
      { className: 'channel-card', attrs: { type: 'button' }, onClick: () => selectChannel(channel) },
      children
    );
    card.appendChild(favoriteButton(channel));
    card.dataset.name = channel.name.toLowerCase();
    return card;
  }

  function renderChannelGridScreen(breadcrumbText, title, list, options = {}) {
    const screen = el('div', { className: 'screen' });
    screen.appendChild(el('div', { className: 'breadcrumbs', text: breadcrumbText }));
    screen.appendChild(el('h1', { className: 'screen-title', text: title }));

    if (list.length === 0) {
      screen.appendChild(el('div', { className: 'empty-state', text: options.emptyText || 'Keine Sender gefunden.' }));
      return screen;
    }

    if (list.length > 8) {
      const search = document.createElement('input');
      search.type = 'text';
      search.className = 'm3u-input search-input';
      search.placeholder = 'Sender suchen …';
      search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase();
        let visibleCount = 0;
        grid.querySelectorAll('.channel-card').forEach((card) => {
          const matches = card.dataset.name.includes(query);
          card.style.display = matches ? '' : 'none';
          if (matches) visibleCount += 1;
        });
        noResults.style.display = visibleCount === 0 ? '' : 'none';
      });
      screen.appendChild(search);
    }

    const grid = el('div', { className: 'channel-grid' });
    list.forEach((channel) => grid.appendChild(channelCard(channel, options.showMeta)));
    screen.appendChild(grid);

    const noResults = el('div', { className: 'empty-state', text: 'Keine Treffer für diese Suche.' });
    noResults.style.display = 'none';
    screen.appendChild(noResults);

    return screen;
  }

  function renderListScreen() {
    const country = state.selectedCountry;
    const category = state.selectedCategory;
    return renderChannelGridScreen(
      `${COUNTRY_FLAGS[country]} ${COUNTRY_LABELS[country]} / ${CATEGORY_LABELS[category]}`,
      CATEGORY_LABELS[category],
      channelsFor(country, category),
      { emptyText: 'Keine Sender in dieser Kategorie gefunden.' }
    );
  }

  function renderFavoritesScreen() {
    return renderChannelGridScreen('★ Favoriten', 'Favoriten', favoriteChannels(), {
      emptyText: 'Noch keine Favoriten gespeichert.',
      showMeta: true,
    });
  }

  function renderPlayerScreen() {
    const channel = state.selectedChannel;
    const breadcrumbText =
      state.playerReturnScreen === 'favorites'
        ? '★ Favoriten'
        : `${COUNTRY_FLAGS[state.selectedCountry]} ${COUNTRY_LABELS[state.selectedCountry]} / ${CATEGORY_LABELS[state.selectedCategory]}`;

    const screen = el('div', { className: 'screen player-wrap' });
    screen.appendChild(el('div', { className: 'breadcrumbs', text: breadcrumbText }));
    screen.appendChild(el('div', { className: 'player-title', text: channel.name }));
    if (state.isDemo) {
      screen.appendChild(
        el('div', {
          className: 'demo-note',
          text: 'Demo-Modus: neutraler Test-Stream statt des echten Live-Signals. Für echtes Live-TV eigenen M3U-Link verwenden.',
        })
      );
    }

    const frame = el('div', { className: 'player-frame' });
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    frame.appendChild(video);
    screen.appendChild(frame);

    pendingVideoEl = video;
    return screen;
  }

  // ---------- Render ----------

  function renderNav() {
    const nav = document.getElementById('app-nav');
    nav.textContent = '';
    if (state.isDemo && state.channels.length > 0) {
      nav.appendChild(el('span', { className: 'demo-badge', text: '🧪 Demo-Modus' }));
    }
    if (state.screen === 'category' || state.screen === 'list' || state.screen === 'favorites' || state.screen === 'player') {
      nav.appendChild(button('← Zurück', 'btn btn-ghost', handleBack));
    }
    if (state.channels.length > 0) {
      nav.appendChild(button(state.isDemo ? 'Eigenen Link nutzen' : 'M3U ändern', 'btn btn-ghost', changeM3U));
    }
  }

  function render() {
    renderNav();
    const app = document.getElementById('app');
    app.textContent = '';

    let node;
    switch (state.screen) {
      case 'loading':
        node = renderLoadingScreen();
        break;
      case 'country':
        node = renderCountryScreen();
        break;
      case 'category':
        node = renderCategoryScreen();
        break;
      case 'list':
        node = renderListScreen();
        break;
      case 'favorites':
        node = renderFavoritesScreen();
        break;
      case 'player':
        node = renderPlayerScreen();
        break;
      case 'input':
      default:
        node = renderInputScreen();
        break;
    }
    app.appendChild(node);

    if (state.screen === 'player' && pendingVideoEl) {
      const frame = app.querySelector('.player-frame');
      setupPlayer(frame, pendingVideoEl, state.selectedChannel.url);
      pendingVideoEl = null;
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (['category', 'list', 'favorites', 'player'].includes(state.screen)) handleBack();
  });

  async function init() {
    const settings = await window.iptvAPI.loadSettings();
    state.m3uUrl = settings.lastM3uUrl || '';
    state.favorites = new Set(settings.favorites || []);
    if (state.m3uUrl) {
      loadM3U(state.m3uUrl);
    } else {
      render();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
