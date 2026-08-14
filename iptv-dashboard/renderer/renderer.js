(function () {
  const COUNTRY_LABELS = { DE: 'Deutschland', GR: 'Griechenland' };
  const COUNTRY_FLAGS = { DE: '🇩🇪', GR: '🇬🇷' };
  const CATEGORY_LABELS = { live: 'Live TV', serien: 'Serien', kino: 'Kino / Filme' };
  const CATEGORY_ICONS = { live: '📺', serien: '🎬', kino: '🍿' };

  const state = {
    m3uUrl: '',
    channels: [],
    screen: 'input', // input | loading | country | category | list | player
    selectedCountry: null,
    selectedCategory: null,
    selectedChannel: null,
    errorMessage: '',
  };

  let hlsInstance = null;
  let currentVideoEl = null;
  let pendingVideoEl = null;

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

  // ---------- Player ----------

  function destroyPlayer() {
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

  function setupPlayer(videoEl, url) {
    destroyPlayer();
    currentVideoEl = videoEl;
    if (window.Hls && window.Hls.isSupported() && /\.m3u8($|\?)/i.test(url)) {
      hlsInstance = new window.Hls();
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(videoEl);
      hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {});
      });
    } else {
      videoEl.src = url;
      videoEl.play().catch(() => {});
    }
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
    await window.iptvAPI.saveSettings({ lastM3uUrl: url });
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
    state.screen = 'player';
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

  function backToList() {
    destroyPlayer();
    state.selectedChannel = null;
    state.screen = 'list';
    render();
  }

  function changeM3U() {
    destroyPlayer();
    state.channels = [];
    state.selectedCountry = null;
    state.selectedCategory = null;
    state.selectedChannel = null;
    state.errorMessage = '';
    state.screen = 'input';
    render();
  }

  function handleBack() {
    if (state.screen === 'category') backToCountry();
    else if (state.screen === 'list') backToCategory();
    else if (state.screen === 'player') backToList();
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

  function renderListScreen() {
    const country = state.selectedCountry;
    const category = state.selectedCategory;
    const list = channelsFor(country, category);

    const screen = el('div', { className: 'screen' });
    screen.appendChild(
      el('div', {
        className: 'breadcrumbs',
        text: `${COUNTRY_FLAGS[country]} ${COUNTRY_LABELS[country]} / ${CATEGORY_LABELS[category]}`,
      })
    );
    screen.appendChild(el('h1', { className: 'screen-title', text: CATEGORY_LABELS[category] }));

    if (list.length === 0) {
      screen.appendChild(el('div', { className: 'empty-state', text: 'Keine Sender in dieser Kategorie gefunden.' }));
      return screen;
    }

    const grid = el('div', { className: 'channel-grid' });
    list.forEach((channel) => {
      const card = el('button', { className: 'channel-card', attrs: { type: 'button' }, onClick: () => selectChannel(channel) }, [
        channelLogo(channel),
        el('span', { className: 'channel-name', text: channel.name }),
      ]);
      grid.appendChild(card);
    });
    screen.appendChild(grid);
    return screen;
  }

  function renderPlayerScreen() {
    const channel = state.selectedChannel;
    const screen = el('div', { className: 'screen player-wrap' });
    screen.appendChild(
      el('div', {
        className: 'breadcrumbs',
        text: `${COUNTRY_FLAGS[state.selectedCountry]} ${COUNTRY_LABELS[state.selectedCountry]} / ${CATEGORY_LABELS[state.selectedCategory]}`,
      })
    );
    screen.appendChild(el('div', { className: 'player-title', text: channel.name }));

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
    if (state.screen === 'category' || state.screen === 'list' || state.screen === 'player') {
      nav.appendChild(button('← Zurück', 'btn btn-ghost', handleBack));
    }
    if (state.channels.length > 0) {
      nav.appendChild(button('M3U ändern', 'btn btn-ghost', changeM3U));
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
      setupPlayer(pendingVideoEl, state.selectedChannel.url);
      pendingVideoEl = null;
    }
  }

  async function init() {
    const settings = await window.iptvAPI.loadSettings();
    state.m3uUrl = settings.lastM3uUrl || '';
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
