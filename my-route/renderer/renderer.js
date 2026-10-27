(function () {
  'use strict';

  const MAX_ROUTES = 100;
  const MAX_STOPS = 40;
  const MAX_WAYPOINTS_PER_LINK = 9; // Google Maps: höchstens 9 Zwischenstopps pro Link
  const STORAGE_KEY = 'my-route-data-v1';
  const BUILD_VERSION = '__APP_VERSION__'; // beim Web-Build durch die Versionsnummer ersetzt
  const RELEASES_URL = 'https://github.com/thanosxxl/thanos/releases/tag/my-route-updates';
  const UPDATE_API = 'https://api.github.com/repos/thanosxxl/thanos/releases/tags/my-route-updates';
  // Erlaubte Link-Ziele (Host, Pfadanfang) – Gegenstück zur Liste im Hauptprozess.
  const LINK_RULES = [['www.google.com', '/maps/'], ['maps.apple.com', '/'], ['www.openstreetmap.org', '/directions'], ['github.com', '/thanosxxl/thanos/releases']];
  const ICONS = ['📍', '🏠', '🏢', '☕', '🍽️', '🛒', '⛽', '🏖️', '🏔️', '🎭', '🏥', '🎓', '❤️', '⭐'];
  const REGIONS = { alle: 'Alle', inland: 'Inland', ausland: 'Ausland' };
  const LAENDER = ['Österreich', 'Schweiz', 'Italien', 'Frankreich', 'Spanien', 'Portugal', 'Niederlande', 'Belgien', 'Luxemburg', 'Dänemark', 'Polen', 'Tschechien', 'Ungarn', 'Slowenien', 'Kroatien', 'Griechenland', 'Schweden', 'Norwegen', 'Türkei', 'Anderes Land'];
  const MODES = { driving: 'Auto', walking: 'zu Fuß', bicycling: 'Fahrrad', transit: 'Bus & Bahn' };

  const LOOKS = ['gold3d', 'klar', 'hell'];
  const defaultPrivacy = () => ({ accepted: false, autoUpdate: true, consent: { geocode: false, route: false } });
  const defaultState = () => ({ favorites: [], routes: [], look: 'gold3d', touch: 'auto', mapMode: '3d', privacy: defaultPrivacy() });
  let state = defaultState();
  const ui = {
    view: 'start',
    editingFav: null,
    draft: newDraft(),
    mapRouteId: null,
    mapAuto: true,
    regionFilter: 'alle',
    favFilter: 'alle',
    appInfo: null,
    update: { state: 'idle' },
    updateSeen: false,
    updateDismissed: ''
  };

  // ---------- Speicher: Desktop (IPC) oder Browser (localStorage) ----------
  const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent || '');
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const launcher = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppLauncher;
  const isDesktop = typeof window.myRouteAPI === 'object' && window.myRouteAPI !== null;

  // Browser-/Android-Speicher: localStorage, optional mit Passwort verschlüsselt (AES-GCM-256, Schlüssel per PBKDF2-SHA256).
  const KDF_ITER = 600000;
  const cryptoOk = !!(window.crypto && window.crypto.subtle);
  const textEnc = new TextEncoder();
  const textDec = new TextDecoder();
  const b64 = (u8) => {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function deriveKey(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', textEnc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  const webStorage = {
    key: null,
    meta: null,
    queue: Promise.resolve(),
    get protectedOn() { return !!this.meta; },
    async loadData() {
      let raw = null;
      try { raw = localStorage.getItem(STORAGE_KEY); } catch (err) { return { state: null, status: 'new' }; }
      if (!raw) return { state: null, status: 'new' };
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        try { localStorage.setItem(STORAGE_KEY + '-unreadable', raw); } catch (e) { /* voll */ }
        return { state: null, status: 'recovered' };
      }
      if (parsed && parsed.v === 3 && parsed.salt && parsed.iv && parsed.ct) {
        this.meta = { salt: String(parsed.salt), iter: Math.min(Math.max(Number(parsed.iter) || KDF_ITER, 100000), 5000000) };
        return { state: null, status: 'locked' };
      }
      return { state: parsed, status: 'ok' };
    },
    async unlock(pass) {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const key = await deriveKey(pass, unb64(raw.salt), this.meta.iter);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(raw.iv) }, key, unb64(raw.ct)); // wirft bei falschem Passwort
      this.key = key;
      return JSON.parse(textDec.decode(plain));
    },
    async seal(data) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, textEnc.encode(JSON.stringify(data)));
      return JSON.stringify({ v: 3, kdf: 'PBKDF2-SHA256', iter: this.meta.iter, salt: this.meta.salt, iv: b64(iv), ct: b64(new Uint8Array(ct)) });
    },
    // Speichern läuft nacheinander (Warteschlange), damit ein älterer Stand nie einen neueren überschreibt.
    saveData(data) {
      this.queue = this.queue.then(async () => {
        try {
          if (this.meta && !this.key) return true; // gesperrt: vorhandene verschlüsselte Daten nicht antasten
          localStorage.setItem(STORAGE_KEY, this.meta ? await this.seal(data) : JSON.stringify(data));
        } catch (err) {
          toast('Speichern im Browser nicht möglich – bitte „Sichern“ nutzen.');
        }
        return true;
      });
      return this.queue;
    },
    async enableProtection(pass, data) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      this.meta = { salt: b64(salt), iter: KDF_ITER };
      this.key = await deriveKey(pass, salt, KDF_ITER);
      await this.saveData(data);
    },
    async disableProtection(data) {
      this.meta = null;
      this.key = null;
      await this.saveData(data);
    },
    lock() { this.key = null; },
    async wipe() {
      await this.queue;
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_KEY + '-unreadable'); } catch (err) { /* nichts */ }
      this.key = null;
      this.meta = null;
    }
  };
  const api = isDesktop ? window.myRouteAPI : webStorage;

  function persist() {
    return api.saveData(state).catch(() => toast('Speichern hat leider nicht geklappt.'));
  }

  // ---------- Helfer ----------
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function newDraft() {
    return { id: null, name: '', mode: 'driving', region: 'inland', land: '', startFromHere: true, stops: [] };
  }

  function $(id) {
    return document.getElementById(id);
  }

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((kid) => {
      if (kid === null || kid === undefined || kid === false) return;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    });
    return el;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    kids.flat().forEach((kid) => {
      if (kid) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    });
    return el;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  const LISTS = { alle: 'Alle', 1: 'Favoritenliste 1', 2: 'Favoritenliste 2' };

  function listOf(f) {
    return f.liste === 2 ? 2 : 1;
  }

  // Auswahlfelder: Favoriten nach Liste gruppiert (leere Gruppen entfallen)
  function favOptions(withIcons = true) {
    return [1, 2]
      .map((n) => ({ n, items: state.favorites.filter((f) => listOf(f) === n) }))
      .filter((g) => g.items.length)
      .map((g) => h('optgroup', { label: LISTS[g.n] }, ...g.items.map((f) => h('option', { value: f.id }, withIcons ? `${f.icon || '📍'} ${f.name}` : f.name))));
  }

  function regionOf(route) {
    return route.region === 'ausland' ? 'ausland' : 'inland';
  }

  function regionLabel(route) {
    return regionOf(route) === 'ausland' ? 'Ausland' + (route.land ? ' · ' + route.land : '') : 'Inland';
  }

  function visibleRoutes(list) {
    return list.filter((r) => ui.regionFilter === 'alle' || regionOf(r) === ui.regionFilter);
  }

  function renderChips() {
    ['filter-start', 'filter-routes', 'filter-drive'].forEach((id) => {
      $(id).replaceChildren(
        ...Object.keys(REGIONS).map((key) => {
          const n = key === 'alle' ? state.routes.length : state.routes.filter((r) => regionOf(r) === key).length;
          return h('button', { type: 'button', class: 'chip' + (ui.regionFilter === key ? ' active' : ''), 'aria-pressed': ui.regionFilter === key ? 'true' : 'false', onclick: () => { ui.regionFilter = key; render(); } }, `${REGIONS[key]} (${n})`);
        })
      );
    });
  }

  function renderFavChips() {
    $('filter-favs').replaceChildren(
      ...['alle', '1', '2'].map((key) => {
        const n = key === 'alle' ? state.favorites.length : state.favorites.filter((f) => String(listOf(f)) === key).length;
        return h('button', { type: 'button', class: 'chip' + (ui.favFilter === key ? ' active' : ''), 'aria-pressed': ui.favFilter === key ? 'true' : 'false', onclick: () => { ui.favFilter = key; if (!ui.editingFav && key !== 'alle') $('fav-list-sel').value = key; render(); } }, `${LISTS[key]} (${n})`);
      })
    );
  }

  function favById(id) {
    return state.favorites.find((f) => f.id === id);
  }

  function hasCoords(f) {
    return f && Number.isFinite(f.lat) && Number.isFinite(f.lon);
  }

  function routeStops(route) {
    return route.stops.map(favById).filter(Boolean);
  }

  function parseCoords(text) {
    const nums = (text || '').match(/-?\d+(?:[.,]\d+)?/g);
    if (!nums || nums.length < 2) return null;
    const lat = parseFloat(nums[0].replace(',', '.'));
    const lon = parseFloat(nums[1].replace(',', '.'));
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return null;
    return { lat, lon };
  }

  function haversineKm(a, b) {
    const R = 6371;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function pathKm(stops) {
    let km = 0;
    for (let i = 1; i < stops.length; i++) km += haversineKm(stops[i - 1], stops[i]);
    return km;
  }

  function fmtKm(km) {
    return km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km).toString();
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (err) {
      return '';
    }
  }

  // ---------- Navigations-Links ----------
  function placeOf(f) {
    return hasCoords(f) ? `${f.lat},${f.lon}` : f.address || f.name;
  }

  // Liefert 1..n Google-Maps-Links (bei vielen Stopps in Abschnitten).
  function googleLinks(route) {
    const stops = routeStops(route);
    if (!stops.length) return [];
    const startHere = route.startFromHere || stops.length === 1;
    const points = (startHere ? [null] : []).concat(stops.map(placeOf));
    const links = [];
    let i = 0;
    while (i < points.length - 1) {
      const j = Math.min(i + MAX_WAYPOINTS_PER_LINK + 1, points.length - 1);
      const params = new URLSearchParams({ api: '1', destination: points[j], travelmode: route.mode || 'driving' });
      if (points[i]) params.set('origin', points[i]);
      const via = points.slice(i + 1, j);
      if (via.length) params.set('waypoints', via.join('|'));
      links.push('https://www.google.com/maps/dir/?' + params.toString());
      i = j;
    }
    return links;
  }

  function appleLink(route) {
    const stops = routeStops(route);
    if (!stops.length) return null;
    const startHere = route.startFromHere || stops.length === 1;
    const places = stops.map(placeOf);
    const params = [];
    if (!startHere) params.push('saddr=' + encodeURIComponent(places[0]));
    const dest = startHere ? places : places.slice(1);
    params.push('daddr=' + dest.map(encodeURIComponent).join('+to:'));
    const flag = { driving: 'd', walking: 'w', transit: 'r' }[route.mode];
    if (flag) params.push('dirflg=' + flag);
    return 'https://maps.apple.com/?' + params.join('&');
  }

  function osmLink(route) {
    const stops = routeStops(route);
    if (stops.length < 2 || !stops.every(hasCoords)) return null;
    const engine = { walking: 'fossgis_osrm_foot', bicycling: 'fossgis_osrm_bike' }[route.mode] || 'fossgis_osrm_car';
    return 'https://www.openstreetmap.org/directions?engine=' + engine + '&route=' + stops.map((f) => `${f.lat},${f.lon}`).join(';');
  }

  function linkAllowed(url) {
    if (typeof url !== 'string' || url.length > 4000) return false;
    if (url.startsWith('google.navigation:')) return !!launcher;
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
      const p = u.pathname.toLowerCase();
      return LINK_RULES.some(([host, prefix]) => u.hostname === host && p.startsWith(prefix));
    } catch (err) {
      return false;
    }
  }

  function openLink(url) {
    if (!linkAllowed(url)) { toast('Dieser Link ist nicht erlaubt.'); return; }
    if (isDesktop) {
      window.myRouteAPI.openExternal(url).catch(() => toast('Der Link konnte nicht geöffnet werden.'));
    } else if (launcher) {
      // Android-App (Capacitor): Link direkt an die installierte Karten-App übergeben
      launcher.openUrl({ url }).catch(() => toast('Der Link konnte nicht geöffnet werden.'));
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  // Android: direkte Navigation (Google Maps App) zum ersten bzw. einzigen Ziel
  function androidNavLink(route) {
    const stops = routeStops(route);
    if (!stops.length) return null;
    const target = stops[0];
    if (!launcher) return 'https://www.google.com/maps/dir/?' + new URLSearchParams({ api: '1', destination: placeOf(target), travelmode: route.mode || 'driving' }).toString();
    const mode = { walking: 'w', bicycling: 'b', driving: 'd' }[route.mode];
    return 'google.navigation:q=' + encodeURIComponent(placeOf(target)) + (mode ? '&mode=' + mode : '');
  }

  function markDriven(route) {
    route.drives = (route.drives || 0) + 1;
    route.lastDriven = new Date().toISOString();
    persist();
    render();
  }

  function driveRoute(route, url) {
    openLink(url); // synchron im Klick, damit Popup-Blocker nicht eingreifen
    markDriven(route);
    toast('Gute Fahrt! 🚗');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Link kopiert – du kannst ihn überall einfügen.');
    } catch (err) {
      window.prompt('Link zum Kopieren:', text);
    }
  }

  // ---------- Reihenfolge optimieren (Nearest Neighbour + 2-opt) ----------
  function optimizeIds(ids) {
    const pts = ids.map(favById);
    if (pts.length < 3 || !pts.every(hasCoords)) return null;
    let order = [0];
    const left = new Set(pts.map((_, i) => i).slice(1));
    while (left.size) {
      const last = pts[order[order.length - 1]];
      let best = null;
      let bestD = Infinity;
      left.forEach((i) => {
        const d = haversineKm(last, pts[i]);
        if (d < bestD) { bestD = d; best = i; }
      });
      order.push(best);
      left.delete(best);
    }
    const len = (o) => pathKm(o.map((i) => pts[i]));
    let improved = true;
    while (improved) {
      improved = false;
      for (let a = 1; a < order.length - 1; a++) {
        for (let b = a + 1; b < order.length; b++) {
          const cand = order.slice(0, a).concat(order.slice(a, b + 1).reverse(), order.slice(b + 1));
          if (len(cand) + 1e-9 < len(order)) { order = cand; improved = true; }
        }
      }
    }
    return order.map((i) => ids[i]);
  }

  // ---------- Rendering ----------
  function render() {
    applyLook();
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === ui.view));
    document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== 'view-' + ui.view; });
    renderChips();
    renderFavChips();
    renderStart();
    renderFavorites();
    renderRoutes();
    renderMap();
    renderDrive();
    renderPrivacy();
  }

  function applyLook() {
    document.documentElement.dataset.look = LOOKS.includes(state.look) ? state.look : 'gold3d';
    $('look-select').value = document.documentElement.dataset.look;
    $('touch-select').value = ['auto', 'an', 'aus'].includes(state.touch) ? state.touch : 'auto';
    document.documentElement.dataset.touch = touchOn() ? 'on' : 'off';
  }

  function touchOn() {
    return state.touch === 'an' || (state.touch !== 'aus' && window.matchMedia('(pointer: coarse)').matches);
  }

  function greeting() {
    const hr = new Date().getHours();
    const part = hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Hallo' : 'Guten Abend';
    return part + ' – schön, dass du da bist! Wohin soll es heute gehen?';
  }

  function emptyCard(text, buttons) {
    return h('div', { class: 'card empty' }, h('p', { text }), h('div', { class: 'row center' }, buttons));
  }

  function renderStart() {
    $('greeting').textContent = greeting();
    const driven = state.routes.reduce((n, r) => n + (r.drives || 0), 0);
    const stats = $('stats');
    stats.replaceChildren(
      ...[['Favoriten', state.favorites.length], ['Routen', state.routes.length], ['Fahrten', driven]].map(([label, num]) =>
        h('div', { class: 'card stat tilt-soft' }, h('div', { class: 'stat-num', text: String(num) }), h('div', { class: 'stat-label', text: label }))
      )
    );

    const box = $('quick-routes');
    const routes = visibleRoutes(state.routes)
      .slice()
      .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || String(b.lastDriven || '').localeCompare(String(a.lastDriven || '')))
      .slice(0, 6);
    if (!routes.length) {
      box.replaceChildren(
        emptyCard('Noch ist es hier ein bisschen still. Lege deinen ersten Lieblingsort an – oder wirf einen Blick auf eine Beispielroute.', [
          h('button', { class: 'btn', onclick: () => { ui.view = 'favorites'; render(); } }, 'Ersten Ort anlegen'),
          h('button', { class: 'btn ghost', onclick: loadDemo }, 'Beispielroute laden')
        ])
      );
      return;
    }
    box.replaceChildren(...routes.map(routeCard));
  }

  function routeCard(route) {
    const stops = routeStops(route);
    const links = googleLinks(route);
    const osm = osmLink(route);
    const apple = appleLink(route);
    const coordsAll = stops.length > 1 && stops.every(hasCoords);

    const chain = h('div', { class: 'chain' });
    if (route.startFromHere) chain.append('Dein Standort → ');
    stops.forEach((f, i) => {
      if (i) chain.append(' → ');
      chain.append(h('b', { text: f.name }));
    });
    if (!stops.length) chain.textContent = 'Noch keine Stopps – bearbeite die Route, um Orte hinzuzufügen.';

    const meta = [regionLabel(route), MODES[route.mode] || 'Auto', stops.length + (stops.length === 1 ? ' Stopp' : ' Stopps')];
    if (coordsAll) meta.push('ca. ' + fmtKm(pathKm(stops)) + ' km Luftlinie');
    const history = route.drives ? `${route.drives}× gefahren · zuletzt am ${fmtDate(route.lastDriven)}` : 'Noch nicht gefahren';

    const actions = h('div', { class: 'card-actions' });
    actions.append(
      h('button', { class: 'btn go', disabled: !links.length, onclick: () => driveRoute(route, links[0]) }, links.length > 1 ? 'Route fahren (Teil 1)' : 'Route fahren')
    );
    links.slice(1).forEach((url, i) =>
      actions.append(h('button', { class: 'btn small', onclick: () => driveRoute(route, url) }, 'Teil ' + (i + 2)))
    );
    const second = h('div', { class: 'card-actions' },
      isAndroid ? h('button', { class: 'btn small ghost', disabled: !stops.length, title: 'Startet die Navigation zum ersten Stopp in der Google-Maps-App', onclick: () => driveRoute(route, androidNavLink(route)) }, 'Navi-App (1. Stopp)') : isApple ? h('button', { class: 'btn small ghost', disabled: !apple, onclick: () => driveRoute(route, apple) }, 'Apple Karten') : null,
      h('button', { class: 'btn small ghost', disabled: !osm, title: osm ? '' : 'Dafür brauchen alle Stopps Koordinaten', onclick: () => driveRoute(route, osm) }, 'OpenStreetMap'),
      h('button', { class: 'btn small', disabled: !stops.length, title: 'Schnellste, kürzeste und eine alternative Strecke live berechnen', onclick: () => openLive(stops.length ? stops[0].id : null) }, 'Live-Optionen'),
      h('button', { class: 'btn small ghost', disabled: !links.length, onclick: () => copyText(links.join('\n')) }, 'Link kopieren'),
      h('button', { class: 'btn small ghost', onclick: () => { ui.mapRouteId = route.id; ui.view = 'map'; render(); } }, 'Karte'),
      h('button', { class: 'btn small ghost', onclick: () => editRoute(route) }, 'Bearbeiten'),
      h('button', { class: 'btn small ghost danger', onclick: () => deleteRoute(route) }, 'Löschen')
    );

    return h('article', { class: 'card tilt' },
      h('div', { class: 'card-head' },
        h('div', { class: 'card-icon', text: route.starred ? '⭐' : '🧭' }),
        h('div', { class: 'grow' },
          h('div', { class: 'card-title', text: route.name }),
          h('div', { class: 'card-meta', text: meta.join(' · ') })
        ),
        h('button', { class: 'mini', title: route.starred ? 'Aus Lieblingsrouten entfernen' : 'Zu Lieblingsrouten', onclick: () => { route.starred = !route.starred; persist(); render(); } }, route.starred ? '★' : '☆')
      ),
      chain,
      h('div', { class: 'card-meta', text: history }),
      actions,
      second
    );
  }

  // --- Favoriten ---
  function renderFavorites() {
    const sel = $('fav-icon');
    if (!sel.options.length) ICONS.forEach((ic) => sel.append(h('option', { value: ic }, ic)));

    const box = $('fav-list');
    const shownFavs = state.favorites.filter((f) => ui.favFilter === 'alle' || String(listOf(f)) === ui.favFilter);
    if (state.favorites.length && !shownFavs.length) {
      box.replaceChildren(emptyCard('In dieser Liste ist noch nichts. Speichere links einen Ort oder verschiebe einen aus der anderen Liste.', []));
      return;
    }
    if (!state.favorites.length) {
      box.replaceChildren(emptyCard('Hier sammelst du die Orte, die dir wichtig sind. Trage links deinen ersten Lieblingsort ein.', [h('button', { class: 'btn ghost', onclick: loadDemo }, 'Beispiele laden')]));
      return;
    }
    box.replaceChildren(
      ...shownFavs.map((f) => {
        const used = state.routes.filter((r) => r.stops.includes(f.id)).length;
        return h('article', { class: 'card tilt' },
          h('div', { class: 'card-head' },
            h('div', { class: 'card-icon', text: f.icon || '📍' }),
            h('div', { class: 'grow' },
              h('div', { class: 'card-title', text: f.name }),
              h('div', { class: 'card-meta', text: f.address || 'Keine Adresse hinterlegt' })
            )
          ),
          f.note ? h('div', { class: 'card-meta mt10', text: '„' + f.note + '“' }) : null,
          h('div', { class: 'mt10' },
            h('span', { class: 'badge', text: 'Liste ' + listOf(f) }),
            hasCoords(f) ? h('span', { class: 'badge', text: 'Koordinaten' }) : null,
            used ? h('span', { class: 'badge', text: used + (used === 1 ? ' Route' : ' Routen') }) : null
          ),
          h('div', { class: 'card-actions' },
            h('button', { class: 'btn small', onclick: () => openLink('https://www.google.com/maps/dir/?' + new URLSearchParams({ api: '1', destination: placeOf(f) })) }, 'Hierhin navigieren'),
            h('button', { class: 'btn small ghost', title: 'In die andere Favoritenliste verschieben', onclick: () => { f.liste = listOf(f) === 1 ? 2 : 1; persist(); render(); toast('Verschoben in Favoritenliste ' + f.liste + '.'); } }, listOf(f) === 1 ? '→ Liste 2' : '→ Liste 1'),
            h('button', { class: 'btn small ghost', onclick: () => editFav(f) }, 'Bearbeiten'),
            h('button', { class: 'btn small ghost danger', onclick: () => deleteFav(f) }, 'Löschen')
          )
        );
      })
    );
  }

  function editFav(f) {
    ui.editingFav = f.id;
    $('fav-name').value = f.name;
    $('fav-address').value = f.address || '';
    $('fav-coords').value = hasCoords(f) ? `${f.lat}, ${f.lon}` : '';
    $('fav-note').value = f.note || '';
    $('fav-icon').value = f.icon || '📍';
    $('fav-list-sel').value = String(listOf(f));
    $('fav-form-title').textContent = 'Lieblingsort bearbeiten';
    $('fav-cancel').hidden = false;
    $('fav-name').focus();
  }

  function resetFavForm() {
    ui.editingFav = null;
    $('fav-form').reset();
    $('fav-list-sel').value = ui.favFilter === '2' ? '2' : '1';
    $('fav-form-title').textContent = 'Neuen Lieblingsort speichern';
    $('fav-cancel').hidden = true;
  }

  function deleteFav(f) {
    if (!window.confirm(`„${f.name}“ wirklich löschen? Der Ort wird auch aus allen Routen entfernt.`)) return;
    state.favorites = state.favorites.filter((x) => x.id !== f.id);
    state.routes.forEach((r) => { r.stops = r.stops.filter((id) => id !== f.id); });
    ui.draft.stops = ui.draft.stops.filter((id) => id !== f.id);
    if (ui.editingFav === f.id) resetFavForm();
    persist();
    render();
  }

  // --- Routen ---
  function renderRoutes() {
    const d = ui.draft;
    $('rt-form-title').textContent = d.id ? 'Route bearbeiten' : 'Neue Route';
    $('rt-region').value = d.region;
    $('rt-land-wrap').hidden = d.region !== 'ausland';
    const landSel = $('rt-land');
    if (!landSel.options.length) LAENDER.forEach((l) => landSel.append(h('option', { value: l }, l)));
    if (d.region === 'ausland') landSel.value = d.land && LAENDER.includes(d.land) ? d.land : LAENDER[0];
    $('rt-save').textContent = d.id ? 'Änderungen speichern' : 'Route speichern';
    $('rt-cancel').hidden = !d.id;

    const pick = $('rt-pick');
    const prev = pick.value;
    pick.replaceChildren(...favOptions());
    if (prev && favById(prev)) pick.value = prev;
    $('rt-add').disabled = !state.favorites.length || d.stops.length >= MAX_STOPS;
    $('rt-opt').disabled = !optimizeIds(d.stops);
    $('rt-opt').title = 'Braucht mindestens 3 Stopps mit Koordinaten – der erste Stopp bleibt Startpunkt';

    $('draft-stops').replaceChildren(
      ...(d.stops.length
        ? d.stops.map((id, i) => {
            const f = favById(id);
            return h('li', { class: 'stop' },
              h('span', { class: 'stop-num', text: String(i + 1) }),
              h('span', { class: 'stop-name', text: f ? `${f.icon || '📍'} ${f.name}` : '(gelöscht)' }),
              h('button', { type: 'button', class: 'mini', disabled: i === 0, title: 'Nach oben', onclick: () => moveStop(i, -1) }, '↑'),
              h('button', { type: 'button', class: 'mini', disabled: i === d.stops.length - 1, title: 'Nach unten', onclick: () => moveStop(i, 1) }, '↓'),
              h('button', { type: 'button', class: 'mini', title: 'Entfernen', onclick: () => { d.stops.splice(i, 1); render(); } }, '✕')
            );
          })
        : [h('li', { class: 'hint', text: 'Noch keine Stopps – füge oben deine Favoriten hinzu.' })])
    );

    const box = $('route-list');
    if (!state.routes.length) {
      box.replaceChildren(emptyCard('Noch keine Route gespeichert. Sobald du welche anlegst, findest du sie hier – bereit zum Losfahren.', []));
      return;
    }
    const shown = visibleRoutes(state.routes);
    box.replaceChildren(...(shown.length ? shown.map(routeCard) : [emptyCard('In diesem Gebiet gibt es noch keine Route.', [])]));
  }

  function moveStop(i, dir) {
    const arr = ui.draft.stops;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    render();
  }

  function editRoute(route) {
    ui.draft = { id: route.id, name: route.name, mode: route.mode || 'driving', region: regionOf(route), land: route.land || '', startFromHere: !!route.startFromHere, stops: route.stops.filter(favById) };
    $('rt-name').value = ui.draft.name;
    $('rt-mode').value = ui.draft.mode;
    $('rt-start').checked = ui.draft.startFromHere;
    ui.view = 'routes';
    render();
    $('rt-name').focus();
  }

  function resetRouteForm() {
    ui.draft = newDraft();
    $('rt-form').reset();
    $('rt-start').checked = true;
    render();
  }

  function deleteRoute(route) {
    if (!window.confirm(`Route „${route.name}“ wirklich löschen?`)) return;
    state.routes = state.routes.filter((r) => r.id !== route.id);
    if (ui.draft.id === route.id) resetRouteForm();
    persist();
    render();
  }

  // --- Karte (offline, schematisch) ---
  function renderMap() {
    const sel = $('map-route');
    if (!state.routes.some((r) => r.id === ui.mapRouteId)) ui.mapRouteId = state.routes[0] ? state.routes[0].id : null;
    sel.replaceChildren(...state.routes.map((r) => h('option', { value: r.id }, r.name)));
    if (ui.mapRouteId) sel.value = ui.mapRouteId;

    const box = $('map-box');
    const note = $('map-note');
    const route = state.routes.find((r) => r.id === ui.mapRouteId);
    renderMapTools();
    if (!route) {
      stopScene(box);
      box.replaceChildren(h('p', { class: 'hint', text: 'Lege zuerst eine Route an – dann siehst du hier ihre Vorschau.' }));
      note.textContent = '';
      return;
    }
    const stops = routeStops(route);
    const located = stops.filter(hasCoords);
    const missing = stops.length - located.length;
    note.textContent =
      (located.length > 1 ? `Luftlinie insgesamt ca. ${fmtKm(pathKm(located))} km. ` : '') +
      (missing ? `${missing} Stopp(s) ohne Koordinaten werden hier nicht gezeigt – hinterlege sie bei den Favoriten.` : '');
    if (!located.length) {
      stopScene(box);
      box.replaceChildren(h('p', { class: 'hint', text: 'Für die Vorschau brauchen die Stopps Koordinaten (Favoriten → „Koordinaten zur Adresse finden“).' }));
      return;
    }
    if (state.mapMode === '3d') {
      scene3d(box, {
        auto: ui.mapAuto,
        lines: [{ pts: located, color: LINE_COLORS[0], active: true }],
        pins: located.map((f, i) => ({ lat: f.lat, lon: f.lon, label: f.name, tag: String(i + 1) }))
      });
    } else {
      stopScene(box);
      box.classList.remove('flat');
      box.replaceChildren(buildMapSvg(located));
    }
  }

  function renderMapTools() {
    $('map-mode').replaceChildren(
      ...[['2d', '2D-Skizze'], ['3d', '3D-Ansicht']].map(([key, label]) =>
        h('button', { type: 'button', class: 'chip' + (state.mapMode === key ? ' active' : ''), 'aria-pressed': state.mapMode === key ? 'true' : 'false', onclick: () => { state.mapMode = key; persist(); render(); } }, label)
      )
    );
    $('map-auto-wrap').hidden = state.mapMode !== '3d';
    $('map-hint3d').hidden = state.mapMode !== '3d';
    $('map-auto').checked = ui.mapAuto;
  }

  function buildMapSvg(pts) {
    const W = 900, H = 520, PAD = 70;
    const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
    const kx = Math.cos((lat0 * Math.PI) / 180);
    const xs = pts.map((p) => p.lon * kx);
    const ys = pts.map((p) => -p.lat);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = maxX - minX || 1e-6, spanY = maxY - minY || 1e-6;
    const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
    const offX = (W - spanX * scale) / 2, offY = (H - spanY * scale) / 2;
    const P = pts.map((_, i) => ({ x: pts.length === 1 ? W / 2 : offX + (xs[i] - minX) * scale, y: pts.length === 1 ? H / 2 : offY + (ys[i] - minY) * scale }));
    const d = P.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');

    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Schematische Routenvorschau' });
    svg.append(
      s('defs', {},
        s('radialGradient', { id: 'pinG', cx: '30%', cy: '25%', r: '80%' },
          s('stop', { offset: '0', 'stop-color': '#fff2b3' }), s('stop', { offset: '.55', 'stop-color': '#e9b52c' }), s('stop', { offset: '1', 'stop-color': '#8a5d12' })),
        s('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' },
          s('feGaussianBlur', { stdDeviation: '5', result: 'b' }), s('feMerge', {}, s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' }))),
        s('pattern', { id: 'grid', width: '45', height: '45', patternUnits: 'userSpaceOnUse' }, s('path', { d: 'M45 0H0V45', fill: 'none', stroke: 'rgba(233,181,44,.08)', 'stroke-width': '1' }))
      ),
      s('rect', { width: W, height: H, fill: 'url(#grid)' })
    );
    if (P.length > 1) {
      svg.append(
        s('path', { d, fill: 'none', stroke: 'rgba(233,181,44,.25)', 'stroke-width': '12', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#glow)' }),
        s('path', { d, class: 'route-line', fill: 'none', stroke: '#f7d56a', 'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      );
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const dot = s('circle', { r: '7', fill: '#fff8d6', filter: 'url(#glow)' });
        dot.append(s('animateMotion', { dur: Math.max(4, P.length * 2) + 's', repeatCount: 'indefinite', path: d }));
        svg.append(dot);
      }
    }
    P.forEach((p, i) => {
      const g = s('g', { class: 'pin' });
      g.style.animationDelay = i * 90 + 'ms';
      g.append(
        s('ellipse', { cx: p.x, cy: p.y + 20, rx: '15', ry: '5', fill: 'rgba(0,0,0,.55)' }),
        s('circle', { cx: p.x, cy: p.y, r: '17', fill: 'url(#pinG)', stroke: '#4a3207', 'stroke-width': '1.5' }),
        s('ellipse', { cx: p.x - 4, cy: p.y - 7, rx: '8', ry: '4.5', fill: 'rgba(255,255,255,.55)' }),
        s('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle', 'font-size': '14', 'font-weight': '800', fill: '#2a1c03' }, String(i + 1)),
        s('text', { x: p.x, y: p.y - 26, 'text-anchor': 'middle', 'font-size': '14', 'font-weight': '700', class: 'map-label', 'stroke-width': '3', 'paint-order': 'stroke' }, pts[i].name)
      );
      svg.append(g);
    });
    return svg;
  }


  // ---------- Fahrmodus (große Touch-Tasten) ----------
  function renderDrive() {
    const rbox = $('drive-routes');
    const routes = visibleRoutes(state.routes).slice().sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
    rbox.replaceChildren(
      ...(routes.length
        ? routes.map((route) => {
            const links = googleLinks(route);
            const stops = routeStops(route);
            return h('article', { class: 'card drive-tile' },
              h('div', { class: 'card-title', text: (route.starred ? '⭐ ' : '') + route.name }),
              h('div', { class: 'card-meta', text: regionLabel(route) + ' · ' + (MODES[route.mode] || 'Auto') + ' · ' + stops.length + (stops.length === 1 ? ' Stopp' : ' Stopps') }),
              h('button', { class: 'btn mega', disabled: !links.length, onclick: () => driveRoute(route, links[0]) }, 'Losfahren'),
              links.length > 1 ? h('div', { class: 'card-actions' }, ...links.slice(1).map((url, i) => h('button', { class: 'btn', onclick: () => driveRoute(route, url) }, 'Teil ' + (i + 2)))) : null,
              h('button', { class: 'btn ghost mega-sub', disabled: !stops.length, onclick: () => openLive(stops[0].id) }, 'Live-Optionen')
            );
          })
        : [emptyCard('Noch keine Route gespeichert – lege sie unter „Routen“ an, dann erscheint sie hier mit großer Taste.', [])])
    );
    const fbox = $('drive-favs');
    fbox.replaceChildren(
      ...(state.favorites.length
        ? state.favorites.map((f) =>
            h('button', { class: 'card drive-fav', onclick: () => openLive(f.id) },
              h('span', { class: 'card-icon', text: f.icon || '📍' }),
              h('span', { class: 'grow' }, h('span', { class: 'card-title', text: f.name }), h('span', { class: 'card-meta', text: (hasCoords(f) ? 'Live-Optionen' : 'Ohne Koordinaten') + ' · Liste ' + listOf(f) }))
            )
          )
        : [emptyCard('Sobald du Favoriten gespeichert hast, kannst du sie hier mit einem Tipp ansteuern.', [])])
    );
  }

  // ---------- Live-Routen: bis zu 3 Optionen zum Ziel (schnellste, kürzeste, Alternative) ----------
  const live = { timer: null, busy: false, last: null, sel: 0, consented: false };

  function openLive(toId) {
    const dlg = $('live-dialog');
    const fill = (sel, withHere, keep) => {
      const prev = keep || sel.value;
      sel.replaceChildren(
        ...(withHere ? [h('option', { value: 'here' }, '📡 Mein Standort')] : []),
        ...favOptions()
      );
      if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
    };
    const canLocate = !isDesktop && !!navigator.geolocation;
    fill($('live-from'), canLocate, canLocate ? 'here' : '');
    fill($('live-to'), false, toId);
    $('live-options').replaceChildren();
    live.last = null; live.sel = 0;
    $('live-3d').checked = state.mapMode === '3d';
    renderLiveMap();
    $('live-status').textContent = state.favorites.length ? 'Wähle Start und Ziel und tippe auf „Optionen laden“.' : 'Lege zuerst Favoriten mit Koordinaten an.';
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    if (state.favorites.length && toId && hasCoords(favById(toId)) && ($('live-from').value === 'here' || hasCoords(favById($('live-from').value)))) loadLive();
  }

  function renderLiveMap() {
    const box = $('live-map');
    const on = $('live-3d').checked && live.last;
    box.hidden = !on;
    if (!on) { stopScene(box); box.replaceChildren(); return; }
    const { from, to, options } = live.last;
    scene3d(box, {
      auto: ui.mapAuto,
      lines: options.map((o, i) => ({ pts: o.r.points, color: LINE_COLORS[i], active: i === live.sel })),
      pins: [{ lat: from.lat, lon: from.lon, label: from.here ? 'Dein Standort' : 'Start', tag: 'S' }, { lat: to.lat, lon: to.lon, label: to.name || 'Ziel', tag: 'Z' }]
    });
  }

  function selectLiveOption(i) {
    live.sel = i;
    document.querySelectorAll('#live-options .live-opt').forEach((c, k) => c.classList.toggle('selected', k === i));
    renderLiveMap();
  }

  function closeLive() {
    stopScene($('live-map'));
    live.last = null;
    live.consented = false;
    clearInterval(live.timer);
    live.timer = null;
    const dlg = $('live-dialog');
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }

  function getHere() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Standort nicht verfügbar')); return; }
      navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }), () => reject(new Error('Standort nicht freigegeben')), { timeout: 10000, maximumAge: 30000 });
    });
  }

  // Anfragen aus dem Browser: Zeitlimit, Größenlimit, keine Cookies, kein Referrer.
  async function fetchText(url, maxBytes) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);
    try {
      const res = await fetch(url, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'follow' });
      if (!res.ok) throw new Error('Dienst antwortet nicht');
      const declared = Number(res.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > maxBytes) throw new Error('Antwort zu groß');
      const text = await res.text();
      if (text.length > maxBytes) throw new Error('Antwort zu groß');
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  async function getRouteOptions(from, to) {
    if (isDesktop) return normalizeOsrm(await window.myRouteAPI.routeOptions({ from, to }));
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?alternatives=3&overview=simplified&geometries=geojson`;
    return normalizeOsrm(JSON.parse(await fetchText(url, 2 * 1024 * 1024)));
  }

  function normalizeOsrm(d) {
    if (!d || d.code !== 'Ok' || !Array.isArray(d.routes)) return [];
    return d.routes.slice(0, 4).filter((r) => Number.isFinite(r.duration) && Number.isFinite(r.distance)).map((r) => ({
      duration: r.duration,
      distance: r.distance,
      points: ((r.geometry && r.geometry.coordinates) || []).filter((c) => Array.isArray(c) && c.length >= 2).map((c) => ({ lat: c[1], lon: c[0] }))
    }));
  }

  // Maximal drei Optionen: schnellste, kürzeste und – falls vorhanden – eine weitere Alternative
  function pickOptions(routes) {
    if (!routes.length) return [];
    let fast = 0, short = 0;
    routes.forEach((r, i) => { if (r.duration < routes[fast].duration) fast = i; if (r.distance < routes[short].distance) short = i; });
    const out = [{ label: fast === short ? 'Schnellste & kürzeste' : 'Schnellste', r: routes[fast], fastest: true }];
    if (short !== fast) out.push({ label: 'Kürzeste', r: routes[short] });
    const alt = routes.findIndex((_, i) => i !== fast && i !== short);
    if (alt >= 0) out.push({ label: 'Alternative', r: routes[alt] });
    return out;
  }

  // Google Maps kennt keine „Strecken-ID“ – damit die gewählte Alternative gefahren wird,
  // wird der Punkt als Zwischenziel gesetzt, der am weitesten von der schnellsten Strecke entfernt liegt.
  function optionLink(opt, fastest, from, to) {
    const params = new URLSearchParams({ api: '1', destination: `${to.lat},${to.lon}`, travelmode: 'driving' });
    if (from.here !== true) params.set('origin', `${from.lat},${from.lon}`);
    if (!opt.fastest && fastest.points.length) {
      let best = null, bestD = 0.3;
      opt.r.points.forEach((p) => {
        const d = Math.min(...fastest.points.map((q) => haversineKm(p, q)));
        if (d > bestD) { bestD = d; best = p; }
      });
      if (best) params.set('waypoints', `${best.lat},${best.lon}`);
    }
    return 'https://www.google.com/maps/dir/?' + params.toString();
  }

  function fmtDuration(sec) {
    const m = Math.max(1, Math.round(sec / 60));
    return m < 60 ? m + ' Min' : Math.floor(m / 60) + ' Std ' + (m % 60) + ' Min';
  }

  async function loadLive() {
    if (live.busy) return;
    const status = $('live-status');
    const to = favById($('live-to').value);
    const fromVal = $('live-from').value;
    if (!to || !hasCoords(to)) { status.textContent = 'Für das Ziel fehlen Koordinaten – trage sie bei den Favoriten ein („Koordinaten zur Adresse finden“).'; return; }
    if (!live.consented) {
      const withLocation = fromVal === 'here' ? ' Bei „Mein Standort“ ist das deine aktuelle Position.' : '';
      if (!(await askConsent('route', 'Für die Live-Optionen werden die Koordinaten von Start und Ziel an den Routing-Dienst OSRM gesendet.' + withLocation + ' Der Dienst sieht dabei auch deine IP-Adresse.'))) {
        status.textContent = 'Ohne deine Zustimmung frage ich keine Strecken ab.';
        return;
      }
      live.consented = true;
    }
    live.busy = true;
    status.textContent = 'Ich frage die Strecken ab …';
    try {
      let from;
      if (fromVal === 'here') from = Object.assign(await getHere(), { here: true });
      else {
        const f = favById(fromVal);
        if (!f || !hasCoords(f)) throw new Error('Dem Start fehlen Koordinaten');
        from = { lat: f.lat, lon: f.lon };
      }
      if (!(haversineKm(from, to) > 0.05)) throw new Error('Start und Ziel sind (fast) identisch');
      const options = pickOptions(await getRouteOptions(from, to));
      if (!options.length) throw new Error('Keine Strecke gefunden');
      const fastest = options[0].r;
      live.last = { from, to: { lat: to.lat, lon: to.lon, name: to.name }, options };
      if (live.sel >= options.length) live.sel = 0;
      $('live-options').replaceChildren(
        ...options.map((o, i) => {
          const extra = i === 0 ? '' : ((o.r.duration - fastest.duration >= 0 ? '+' : '−') + fmtDuration(Math.abs(o.r.duration - fastest.duration)) + ' · ' + ((o.r.distance - fastest.distance) / 1000 >= 0 ? '+' : '−') + fmtKm(Math.abs(o.r.distance - fastest.distance) / 1000) + ' km');
          return h('article', { class: 'card live-opt' + (i === live.sel ? ' selected' : ''), title: 'Anklicken: Strecke auf der 3D-Karte hervorheben', onclick: () => selectLiveOption(i) },
            h('span', { class: 'badge', text: o.label }, h('i', { class: 'dot', ...{} })),
            h('div', { class: 'live-big' }, h('b', { text: fmtDuration(o.r.duration) }), ' · ', fmtKm(o.r.distance / 1000) + ' km'),
            extra ? h('div', { class: 'card-meta', text: 'gegenüber der schnellsten: ' + extra }) : h('div', { class: 'card-meta', text: 'Empfohlen für den schnellsten Weg' }),
            h('button', { class: 'btn', onclick: () => { openLink(optionLink(o, { points: fastest.points }, from, to)); toast('Gute Fahrt! 🚗'); } }, 'Diese Strecke fahren')
          );
        })
      );
      renderLiveMap();
      document.querySelectorAll('#live-options .live-opt .dot').forEach((d, k) => d.setAttribute('data-c', String(k)));
      status.textContent = '🟢 Live · aktualisiert um ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      clearInterval(live.timer);
      live.timer = $('live-auto').checked ? setInterval(loadLive, 60000) : null;
    } catch (err) {
      status.textContent = '🔴 Keine Live-Verbindung: ' + (err && err.message ? err.message : 'bitte Internet prüfen') + '.';
    } finally {
      live.busy = false;
    }
  }


  // ---------- 3D-Karte: Kartenvorschau & Live-Optionen (schematisch, offline) ----------
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = new WeakMap();
  const LINE_COLORS = ['#f7d56a', '#62d0ff', '#ff9d5c'];

  function stopScene(box) {
    const st = scenes.get(box);
    if (st) { cancelAnimationFrame(st.raf); scenes.delete(box); }
  }

  // data: { flat, auto, lines: [{ pts: [{lat,lon}], color, active }], pins: [{ lat, lon, label, tag }] }
  function scene3d(box, data) {
    let st = scenes.get(box);
    if (!st) {
      st = { yaw: -0.55, pitch: 0.95, zoom: 1, drag: null, idle: 0, raf: 0, last: 0, t: 0 };
      scenes.set(box, st);
    }
    st.data = data;
    st.flat = !!data.flat;
    if (st.flat) { st.yaw = 0; st.pitch = Math.PI / 2; st.zoom = 1; }
    box.classList.toggle('flat', st.flat);
    if (!box.dataset.m3) {
      box.dataset.m3 = '1';
      box.addEventListener('pointerdown', (e) => {
        const s = scenes.get(box);
        if (!s || s.flat) return;
        s.drag = { x: e.clientX, y: e.clientY, yaw: s.yaw, pitch: s.pitch };
        box.setPointerCapture(e.pointerId);
      });
      box.addEventListener('pointermove', (e) => {
        const s = scenes.get(box);
        if (!s || !s.drag) return;
        s.yaw = s.drag.yaw + (e.clientX - s.drag.x) * 0.008;
        s.pitch = Math.max(0.3, Math.min(1.45, s.drag.pitch + (e.clientY - s.drag.y) * 0.005));
        draw3d(box, s);
      });
      const end = () => { const s = scenes.get(box); if (s) { s.drag = null; s.idle = performance.now() + 2500; } };
      box.addEventListener('pointerup', end);
      box.addEventListener('pointercancel', end);
      box.addEventListener('wheel', (e) => {
        const s = scenes.get(box);
        if (!s || s.flat) return;
        e.preventDefault();
        s.zoom = Math.max(0.6, Math.min(2.4, s.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
        draw3d(box, s);
      }, { passive: false });
      box.addEventListener('dblclick', () => {
        const s = scenes.get(box);
        if (s && !s.flat) { s.yaw = -0.55; s.pitch = 0.95; s.zoom = 1; draw3d(box, s); }
      });
    }
    draw3d(box, st);
    if (!st.raf) {
      const tick = (ts) => {
        const s = scenes.get(box);
        if (!s) return;
        if (box.offsetParent === null) { s.raf = 0; return; } // verborgen: Schleife ruht, render() startet sie wieder
        const dt = s.last ? Math.min(60, ts - s.last) : 16;
        s.last = ts;
        s.t = (s.t + dt / 4500) % 1;
        if (!s.flat && s.data.auto && !s.drag && ts > s.idle && !reduceMotion()) s.yaw += dt * 0.00035;
        draw3d(box, s);
        s.raf = requestAnimationFrame(tick);
      };
      st.raf = requestAnimationFrame(tick);
    }
  }

  function draw3d(box, st) {
    const { lines, pins, flat } = st.data;
    const all = lines.flatMap((l) => l.pts).concat(pins);
    if (!all.length) { box.replaceChildren(); return; }
    const lat0 = all.reduce((a, p) => a + p.lat, 0) / all.length;
    const lon0 = all.reduce((a, p) => a + p.lon, 0) / all.length;
    const kx = Math.cos((lat0 * Math.PI) / 180);
    const wx = (p) => (p.lon - lon0) * kx;
    const wy = (p) => p.lat - lat0;
    const span = Math.max(1e-6, ...all.map((p) => Math.abs(wx(p))), ...all.map((p) => Math.abs(wy(p)))) ;
    const u = 0.8 / span; // Welt -> Einheitswürfel
    const W = 900, H = 520, D = 3.2, S = (flat ? 270 : 230) * st.zoom;
    const cyw = Math.cos(st.yaw), syw = Math.sin(st.yaw), sp = Math.sin(st.pitch), cp = Math.cos(st.pitch);
    const proj = (x, y, z) => {
      const xr = x * cyw - y * syw, yr = x * syw + y * cyw;
      const depth = yr * cp - z * sp;
      const k = D / (D + depth);
      return { x: W / 2 + xr * k * S, y: H / 2 + 36 - (yr * sp + z * cp) * k * S, k, depth };
    };
    const P = (p, z) => proj(wx(p) * u, wy(p) * u, z);
    const f = (n) => n.toFixed(1);

    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': flat ? 'Streckenübersicht' : '3D-Kartenvorschau' });
    svg.append(
      s('defs', {},
        s('radialGradient', { id: 'm3pin', cx: '30%', cy: '25%', r: '80%' },
          s('stop', { offset: '0', 'stop-color': '#fff6c9' }), s('stop', { offset: '.5', 'stop-color': '#e9b52c' }), s('stop', { offset: '1', 'stop-color': '#7a5410' })),
        s('filter', { id: 'm3glow', x: '-50%', y: '-50%', width: '200%', height: '200%' },
          s('feGaussianBlur', { stdDeviation: '4', result: 'b' }), s('feMerge', {}, s('feMergeNode', { in: 'b' }), s('feMergeNode', { in: 'SourceGraphic' }))))
    );
    // Bodenplatte + Raster
    const G = 1.15;
    const corners = [[-G, -G], [G, -G], [G, G], [-G, G]].map(([x, y]) => proj(x, y, 0));
    svg.append(s('polygon', { class: 'm3-ground', points: corners.map((c) => `${f(c.x)},${f(c.y)}`).join(' ') }));
    for (let i = -5; i <= 5; i++) {
      const g = (i / 5) * G;
      const a = proj(g, -G, 0), b = proj(g, G, 0), c = proj(-G, g, 0), d = proj(G, g, 0);
      svg.append(s('line', { class: 'm3-grid', x1: f(a.x), y1: f(a.y), x2: f(b.x), y2: f(b.y) }), s('line', { class: 'm3-grid', x1: f(c.x), y1: f(c.y), x2: f(d.x), y2: f(d.y) }));
    }
    if (!flat) {
      const n = proj(0, G + 0.12, 0);
      svg.append(s('text', { class: 'm3-label', x: f(n.x), y: f(n.y), 'text-anchor': 'middle', 'font-size': '15' }, 'N'));
    }

    // Strecken: Wand (Extrusion) + leuchtende Linie; aktive zuletzt
    const ordered = lines.slice().sort((a, b) => (a.active ? 1 : 0) - (b.active ? 1 : 0));
    ordered.forEach((l) => {
      if (l.pts.length < 2) return;
      const hz = flat ? 0 : l.active ? 0.17 : 0.07;
      const top = l.pts.map((p) => P(p, hz));
      if (!flat) {
        const base = l.pts.map((p) => P(p, 0));
        let d = '';
        for (let i = 0; i < top.length - 1; i++) d += `M${f(base[i].x)} ${f(base[i].y)}L${f(base[i + 1].x)} ${f(base[i + 1].y)}L${f(top[i + 1].x)} ${f(top[i + 1].y)}L${f(top[i].x)} ${f(top[i].y)}Z`;
        svg.append(s('path', { d, class: 'm3-wall', fill: l.color, 'fill-opacity': l.active ? '.38' : '.16' }));
      }
      const pts = top.map((p) => `${f(p.x)},${f(p.y)}`).join(' ');
      const w = l.active ? 5 : 2.5;
      svg.append(
        s('polyline', { points: pts, fill: 'none', stroke: l.color, 'stroke-width': w + 7, 'stroke-opacity': l.active ? '.28' : '.1', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#m3glow)' }),
        s('polyline', { points: pts, fill: 'none', stroke: l.color, 'stroke-width': w, 'stroke-opacity': l.active ? '1' : '.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      );
      if (l.active) {
        // leuchtender Punkt wandert entlang der Strecke
        const seg = [0];
        for (let i = 1; i < l.pts.length; i++) seg.push(seg[i - 1] + Math.hypot(wx(l.pts[i]) - wx(l.pts[i - 1]), wy(l.pts[i]) - wy(l.pts[i - 1])));
        const total = seg[seg.length - 1] || 1;
        const target = st.t * total;
        let i = 1;
        while (i < seg.length - 1 && seg[i] < target) i++;
        const a = top[i - 1], b = top[i];
        const q = (target - seg[i - 1]) / (seg[i] - seg[i - 1] || 1);
        svg.append(s('circle', { cx: f(a.x + (b.x - a.x) * q), cy: f(a.y + (b.y - a.y) * q), r: '7', fill: '#fff8d6', filter: 'url(#m3glow)' }));
      }
    });

    // Markierungen: Schatten, Stiel, Glanzkugel, Beschriftung – von hinten nach vorn
    pins
      .map((p) => ({ p, base: P(p, 0), top: P(p, flat ? 0.0 : 0.34) }))
      .sort((a, b) => b.base.depth - a.base.depth)
      .forEach(({ p, base, top }) => {
        const r = (flat ? 22 : 20) * top.k;
        const g = s('g', { class: 'm3-pin' });
        if (!flat) g.append(s('ellipse', { cx: f(base.x), cy: f(base.y), rx: f(15 * base.k), ry: f(5 * base.k), fill: 'rgba(0,0,0,.45)' }), s('line', { x1: f(base.x), y1: f(base.y), x2: f(top.x), y2: f(top.y), stroke: '#c8932a', 'stroke-width': f(2.2 * top.k) }));
        g.append(
          s('circle', { cx: f(top.x), cy: f(top.y), r: f(r), fill: 'url(#m3pin)', stroke: '#4a3207', 'stroke-width': '1.4' }),
          s('ellipse', { cx: f(top.x - r * 0.28), cy: f(top.y - r * 0.4), rx: f(r * 0.5), ry: f(r * 0.28), fill: 'rgba(255,255,255,.55)' }),
          s('text', { x: f(top.x), y: f(top.y + r * 0.3), 'text-anchor': 'middle', 'font-size': f(r * 0.85), 'font-weight': '800', fill: '#2a1c03' }, p.tag),
          s('text', { class: 'm3-label', x: f(top.x), y: f(top.y - r - 8), 'text-anchor': 'middle', 'font-size': '14', 'stroke-width': '3' }, p.label)
        );
        svg.append(g);
      });
    box.replaceChildren(svg);
  }

  // ---------- Aktionen ----------
  function loadDemo() {
    const demo = [
      ['Brandenburger Tor', 'Pariser Platz, 10117 Berlin', 52.5163, 13.3777, '🎭', 'Morgens ist es hier am ruhigsten'],
      ['Fernsehturm', 'Panoramastraße 1A, 10178 Berlin', 52.5208, 13.4094, '🏢', ''],
      ['East Side Gallery', 'Mühlenstraße 3-100, 10243 Berlin', 52.505, 13.4397, '❤️', 'Lieblingsfoto-Spot'],
      ['Tempelhofer Feld', 'Tempelhofer Damm, 12101 Berlin', 52.4731, 13.401, '🏖️', 'Perfekt für einen Spaziergang'],
      ['Schloss Charlottenburg', 'Spandauer Damm 10-22, 14059 Berlin', 52.5208, 13.2957, '⭐', ''],
      ['Stephansdom Wien', 'Stephansplatz 3, 1010 Wien', 48.2082, 16.3738, '🎭', 'Ausland-Beispiel'],
      ['Schloss Schönbrunn', 'Schönbrunner Schloßstraße 47, 1130 Wien', 48.1845, 16.3122, '⭐', '']
    ].map(([name, address, lat, lon, icon, note]) => ({ id: uid(), name, address, lat, lon, icon, note }));
    demo[5].liste = 2;
    demo[6].liste = 2;
    state.favorites.push(...demo);
    state.routes.push({
      id: uid(), name: 'Berlin – Sonntagstour', mode: 'driving', region: 'inland', land: '', startFromHere: false, starred: true, drives: 0, lastDriven: null,
      stops: [demo[0], demo[1], demo[2], demo[3], demo[4]].map((f) => f.id)
    });
    state.routes.push({
      id: uid(), name: 'Wien – Kulturtour', mode: 'walking', region: 'ausland', land: 'Österreich', startFromHere: false, starred: false, drives: 0, lastDriven: null,
      stops: [demo[5], demo[6]].map((f) => f.id)
    });
    persist();
    render();
    toast('Beispielroute geladen – probier „Route fahren“ aus!');
  }

  function bind() {
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { ui.view = t.dataset.view; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { ui.view = b.dataset.goto; render(); }));

    $('fav-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('fav-name').value.trim();
      if (!name) return;
      const coordText = $('fav-coords').value.trim();
      const coords = coordText ? parseCoords(coordText) : null;
      if (coordText && !coords) { toast('Die Koordinaten sehen nicht richtig aus – Beispiel: 52.5163, 13.3777'); return; }
      const rec = { name, address: $('fav-address').value.trim(), note: $('fav-note').value.trim(), icon: $('fav-icon').value || '📍', liste: $('fav-list-sel').value === '2' ? 2 : 1 };
      if (coords) { rec.lat = coords.lat; rec.lon = coords.lon; }
      const existing = ui.editingFav && favById(ui.editingFav);
      if (existing) {
        delete existing.lat; delete existing.lon;
        Object.assign(existing, rec);
      } else {
        state.favorites.push({ id: uid(), ...rec });
      }
      persist();
      toast(existing ? 'Änderungen gespeichert.' : 'Gespeichert – dein Lieblingsort ist gut aufgehoben.');
      resetFavForm();
      render();
    });
    $('fav-cancel').addEventListener('click', resetFavForm);

    $('fav-geocode').addEventListener('click', async () => {
      const q = $('fav-address').value.trim();
      if (!q) { toast('Bitte trage zuerst eine Adresse ein.'); return; }
      if (!(await askConsent('geocode', 'Für die Suche wird die eingegebene Adresse an OpenStreetMap (Nominatim) gesendet. Der Dienst sieht dabei auch deine IP-Adresse.'))) return;
      toast('Ich suche …');
      try {
        let res;
        if (isDesktop) res = await window.myRouteAPI.geocode(q);
        else {
          const list = JSON.parse(await fetchText('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=de&q=' + encodeURIComponent(q), 200000));
          res = Array.isArray(list) && list[0] ? { lat: Number(list[0].lat), lon: Number(list[0].lon) } : null;
        }
        if (res && Number.isFinite(res.lat) && Number.isFinite(res.lon) && Math.abs(res.lat) <= 90 && Math.abs(res.lon) <= 180) {
          $('fav-coords').value = `${res.lat.toFixed(5)}, ${res.lon.toFixed(5)}`;
          toast('Gefunden – die Koordinaten sind eingetragen.');
        } else toast('Dazu habe ich leider nichts gefunden. Versuch es mit Straße und Ort.');
      } catch (err) {
        toast('Die Suche ist gerade nicht erreichbar – bist du online?');
      }
    });

    const locateBtn = $('fav-locate');
    if (isDesktop || !navigator.geolocation) locateBtn.hidden = true;
    locateBtn.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { $('fav-coords').value = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`; toast('Dein Standort ist eingetragen.'); },
        () => toast('Den Standort konnte ich nicht abfragen – vielleicht hast du ihn nicht freigegeben.'),
        { timeout: 10000 }
      );
    });

    $('rt-name').addEventListener('input', (e) => { ui.draft.name = e.target.value; });
    $('rt-mode').addEventListener('change', (e) => { ui.draft.mode = e.target.value; });
    $('rt-region').addEventListener('change', (e) => { ui.draft.region = e.target.value; ui.draft.land = e.target.value === 'ausland' ? $('rt-land').value || LAENDER[0] : ''; render(); });
    $('rt-land').addEventListener('change', (e) => { ui.draft.land = e.target.value; });
    $('rt-start').addEventListener('change', (e) => { ui.draft.startFromHere = e.target.checked; });
    $('rt-add').addEventListener('click', () => {
      const id = $('rt-pick').value;
      if (!id || ui.draft.stops.length >= MAX_STOPS) return;
      ui.draft.stops.push(id);
      render();
    });
    $('rt-opt').addEventListener('click', () => {
      const order = optimizeIds(ui.draft.stops);
      if (!order) return;
      const before = pathKm(ui.draft.stops.map(favById));
      ui.draft.stops = order;
      render();
      const after = pathKm(order.map(favById));
      toast(after < before - 0.05 ? `Besser: Luftlinie von ${fmtKm(before)} auf ${fmtKm(after)} km verkürzt.` : 'Deine Reihenfolge ist schon richtig gut!');
    });
    $('rt-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = ui.draft;
      const name = $('rt-name').value.trim();
      if (!name) return;
      if (!d.stops.length) { toast('Füge mindestens einen Stopp hinzu.'); return; }
      if (d.id) {
        const r = state.routes.find((x) => x.id === d.id);
        if (r) Object.assign(r, { name, mode: d.mode, region: d.region, land: d.region === 'ausland' ? d.land : '', startFromHere: d.startFromHere, stops: d.stops.slice() });
      } else {
        if (state.routes.length >= MAX_ROUTES) { toast('Bitte lösche zuerst eine alte Route.'); return; }
        state.routes.push({ id: uid(), name, mode: d.mode, region: d.region, land: d.region === 'ausland' ? d.land : '', startFromHere: d.startFromHere, stops: d.stops.slice(), starred: false, drives: 0, lastDriven: null });
      }
      persist();
      toast('Route gespeichert – bereit, wenn du es bist.');
      resetRouteForm();
    });
    $('rt-cancel').addEventListener('click', resetRouteForm);

    $('look-select').addEventListener('change', (e) => { state.look = e.target.value; persist(); render(); });
    $('touch-select').addEventListener('change', (e) => { state.touch = e.target.value; persist(); render(); });
    $('live-go').addEventListener('click', loadLive);
    $('live-3d').addEventListener('change', renderLiveMap);
    $('map-auto').addEventListener('change', (e) => { ui.mapAuto = e.target.checked; renderMap(); });
    $('live-close').addEventListener('click', closeLive);
    $('live-dialog').addEventListener('close', () => { clearInterval(live.timer); live.timer = null; });
    $('live-auto').addEventListener('change', () => { clearInterval(live.timer); live.timer = $('live-auto').checked ? setInterval(loadLive, 60000) : null; });
    $('live-from').addEventListener('change', () => { $('live-options').replaceChildren(); });
    $('live-to').addEventListener('change', () => { $('live-options').replaceChildren(); });
    $('map-route').addEventListener('change', (e) => { ui.mapRouteId = e.target.value; renderMap(); });

    $('btn-export').addEventListener('click', async () => {
      try {
        if (isDesktop) {
          const res = await window.myRouteAPI.exportData(exportable());
          if (res.exported) toast('Gesichert – gut aufgehoben.');
        } else {
          const url = URL.createObjectURL(new Blob([JSON.stringify(exportable(), null, 2)], { type: 'application/json' }));
          const a = h('a', { href: url, download: 'my-route-sicherung.json' });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          toast('Sicherung heruntergeladen.');
        }
      } catch (err) { toast('Das Sichern hat leider nicht geklappt.'); }
    });
    $('btn-import').addEventListener('click', async () => {
      if (isDesktop) {
        try {
          const res = await window.myRouteAPI.importData();
          if (res.imported) adopt(res.data);
        } catch (err) { toast(err && err.message ? 'Einlesen nicht möglich: ' + err.message.replace(/^.*Error: /, '') : 'Einlesen nicht möglich.'); }
      } else $('file-import').click();
    });
    $('file-import').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file || file.size > 50 * 1024 * 1024) return;
      try { adopt(JSON.parse(await file.text())); } catch (err) { toast('Das ist keine gültige My-Route-Sicherung.'); }
    });

    // 3D-Neigung der Karten folgt dem Mauszeiger
    document.addEventListener('mousemove', (e) => {
      const el = e.target.closest && e.target.closest('.tilt, .tilt-soft');
      document.querySelectorAll('.tilt, .tilt-soft').forEach((n) => { if (n !== el && n.style.getPropertyValue('--rx')) { n.style.removeProperty('--rx'); n.style.removeProperty('--ry'); } });
      if (!el || touchOn() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = el.getBoundingClientRect();
      const max = el.classList.contains('tilt-soft') ? 2.5 : 6;
      el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 2 * max + 'deg');
      el.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 2 * max + 'deg');
    });
  }

  function exportable() {
    const copy = { ...state };
    delete copy.privacy; // Einstellungen zu Zustimmungen gehören nicht in die Sicherungsdatei
    return copy;
  }

  function adopt(data) {
    const ok = data && Array.isArray(data.favorites) && Array.isArray(data.routes);
    if (!ok) { toast('Das ist keine gültige My-Route-Sicherung.'); return; }
    if ((state.favorites.length || state.routes.length) && !window.confirm('Die Sicherung ersetzt alle aktuellen Favoriten und Routen. Fortfahren?')) return;
    const imported = sanitize(data);
    imported.privacy = state.privacy; // Zustimmungen kommen nie aus einer Datei
    state = imported;
    persist();
    ui.draft = newDraft();
    render();
    toast('Sicherung eingelesen – willkommen zurück!');
  }

  // Übernimmt nur bekannte Felder mit geprüften Typen (Schutz vor manipulierten Dateien).
  function sanitize(data) {
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
    const favorites = data.favorites.filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string').map((f) => {
      const out = { id: f.id.slice(0, 40), name: str(f.name, 80), address: str(f.address, 200), note: str(f.note, 160), icon: ICONS.includes(f.icon) ? f.icon : '📍', liste: f.liste === 2 ? 2 : 1 };
      if (Number.isFinite(f.lat) && Number.isFinite(f.lon) && Math.abs(f.lat) <= 90 && Math.abs(f.lon) <= 180) { out.lat = f.lat; out.lon = f.lon; }
      return out;
    });
    const ids = new Set(favorites.map((f) => f.id));
    const routes = data.routes.slice(0, MAX_ROUTES).filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string' && Array.isArray(r.stops)).map((r) => ({
      id: r.id.slice(0, 40), name: str(r.name, 80), mode: MODES[r.mode] ? r.mode : 'driving', region: r.region === 'ausland' ? 'ausland' : 'inland', land: r.region === 'ausland' && LAENDER.includes(r.land) ? r.land : '', startFromHere: !!r.startFromHere, starred: !!r.starred,
      drives: Number.isFinite(r.drives) ? Math.max(0, Math.floor(r.drives)) : 0, lastDriven: typeof r.lastDriven === 'string' ? r.lastDriven.slice(0, 40) : null,
      stops: r.stops.filter((id) => typeof id === 'string' && ids.has(id)).slice(0, MAX_STOPS)
    }));
    const pv = data.privacy && typeof data.privacy === 'object' ? data.privacy : {};
    const consent = pv.consent && typeof pv.consent === 'object' ? pv.consent : {};
    const privacy = { accepted: pv.accepted === true, autoUpdate: pv.autoUpdate !== false, consent: { geocode: consent.geocode === true, route: consent.route === true } };
    return { privacy, favorites, routes, look: LOOKS.includes(data.look) ? data.look : 'gold3d', touch: ['auto', 'an', 'aus'].includes(data.touch) ? data.touch : 'auto', mapMode: data.mapMode === '2d' ? '2d' : '3d' };
  }

  // ---------- Dialoge ----------
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  function openDialog(dlg) {
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  }

  function closeDialog(dlg) {
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }

  // Einwilligung vor jeder Übertragung an einen externen Dienst (auf Wunsch dauerhaft merken, widerrufbar).
  function askConsent(key, text) {
    if (state.privacy.consent[key]) return Promise.resolve(true);
    return new Promise((resolve) => {
      const dlg = $('consent-dialog');
      $('consent-text').textContent = text;
      $('consent-remember').checked = false;
      const finish = (ok) => {
        $('consent-ok').onclick = null;
        $('consent-cancel').onclick = null;
        dlg.oncancel = null;
        closeDialog(dlg);
        if (ok && $('consent-remember').checked) { state.privacy.consent[key] = true; persist(); renderPrivacy(); }
        resolve(ok);
      };
      $('consent-ok').onclick = () => finish(true);
      $('consent-cancel').onclick = () => finish(false);
      dlg.oncancel = (e) => { e.preventDefault(); finish(false); };
      openDialog(dlg);
      $('consent-ok').focus();
    });
  }

  function showWelcome() {
    const dlg = $('welcome-dialog');
    const finish = (auto) => {
      $('welcome-auto').onclick = null;
      $('welcome-manual').onclick = null;
      dlg.oncancel = null;
      state.privacy.accepted = true;
      state.privacy.autoUpdate = auto;
      persist();
      closeDialog(dlg);
      renderPrivacy();
      if (auto) checkUpdatesNow(false);
    };
    $('welcome-auto').onclick = () => finish(true);
    $('welcome-manual').onclick = () => finish(false);
    dlg.oncancel = (e) => e.preventDefault();
    openDialog(dlg);
    $('welcome-auto').focus();
  }

  // Entsperr-Dialog (nur Browser/Android mit Passwortschutz); gibt den entschlüsselten Zustand zurück.
  function runUnlock() {
    return new Promise((resolve) => {
      const dlg = $('unlock-dialog');
      let attempts = 0;
      dlg.oncancel = (e) => e.preventDefault();
      $('unlock-pass').value = '';
      $('unlock-error').textContent = '';
      $('unlock-ok').onclick = async () => {
        const pass = $('unlock-pass').value;
        if (!pass) return;
        $('unlock-ok').disabled = true;
        try {
          const plain = await webStorage.unlock(pass);
          $('unlock-pass').value = '';
          closeDialog(dlg);
          resolve(plain);
        } catch (err) {
          attempts += 1;
          $('unlock-error').textContent = 'Das Passwort stimmt nicht.';
          await sleep(Math.min(4000, 500 * attempts)); // bremst Durchprobieren
        } finally {
          $('unlock-ok').disabled = false;
        }
      };
      $('unlock-pass').onkeydown = (e) => { if (e.key === 'Enter') $('unlock-ok').click(); };
      $('unlock-reset').onclick = async () => {
        if (!window.confirm('Alle gespeicherten Daten werden unwiderruflich gelöscht. Fortfahren?')) return;
        await webStorage.wipe();
        closeDialog(dlg);
        resolve(null);
      };
      openDialog(dlg);
      $('unlock-pass').focus();
    });
  }

  function askNewPassword() {
    return new Promise((resolve) => {
      const dlg = $('pw-dialog');
      $('pw-1').value = '';
      $('pw-2').value = '';
      $('pw-error').textContent = '';
      const finish = (val) => {
        $('pw-ok').onclick = null;
        $('pw-cancel').onclick = null;
        dlg.oncancel = null;
        $('pw-1').value = '';
        $('pw-2').value = '';
        closeDialog(dlg);
        resolve(val);
      };
      $('pw-ok').onclick = () => {
        const a = $('pw-1').value;
        if (a.length < 8) { $('pw-error').textContent = 'Bitte mindestens 8 Zeichen wählen.'; return; }
        if (a !== $('pw-2').value) { $('pw-error').textContent = 'Die beiden Eingaben stimmen nicht überein.'; return; }
        finish(a);
      };
      $('pw-cancel').onclick = () => finish(null);
      dlg.oncancel = (e) => { e.preventDefault(); finish(null); };
      openDialog(dlg);
      $('pw-1').focus();
    });
  }

  async function lockNow() {
    webStorage.lock();
    state = defaultState();
    ui.draft = newDraft();
    render();
    const plain = await runUnlock();
    state = plain ? sanitize(plain) : defaultState();
    render();
  }

  // ---------- Updates ----------
  const versionParts = (v) => (String(v).match(/\d+/g) || []).slice(0, 3).map(Number);
  function isNewer(a, b) {
    const x = versionParts(a), y = versionParts(b);
    for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
    return false;
  }

  async function webUpdateCheck(manual) {
    if (!/^\d/.test(BUILD_VERSION)) { ui.update = { state: manual ? 'unsupported' : 'idle' }; renderUpdateBar(); renderPrivacy(); return; }
    ui.update = { state: 'checking' };
    renderPrivacy();
    try {
      const info = JSON.parse(await fetchText(UPDATE_API, 300000));
      const m = String(info.name || info.tag_name || '').match(/\d+\.\d+\.\d+/);
      if (!m) throw new Error('Keine Versionsangabe gefunden');
      ui.update = isNewer(m[0], BUILD_VERSION) ? { state: 'available', version: m[0], web: true } : { state: 'uptodate' };
    } catch (err) {
      ui.update = { state: manual ? 'error' : 'idle', message: 'Keine Update-Information erreichbar.' };
    }
    renderUpdateBar();
    renderPrivacy();
  }

  function checkUpdatesNow(manual) {
    if (isDesktop) {
      window.myRouteAPI.checkUpdates().catch(() => {});
    } else {
      webUpdateCheck(manual);
    }
  }

  function updateText() {
    const u = ui.update;
    const v = u.version ? ' ' + u.version : '';
    switch (u.state) {
      case 'checking': return 'Suche nach Updates …';
      case 'downloading': return `Update${v} wird geladen … ${u.percent || 0} %`;
      case 'downloaded': return u.installing ? `Update${v} wird jetzt installiert – My Route startet gleich automatisch neu.` : `Update${v} ist bereit – wird beim Beenden installiert.`;
      case 'available': return `Neue Version${v} verfügbar.`;
      case 'uptodate': return 'My Route ist auf dem neuesten Stand.';
      case 'unsupported': return isDesktop ? 'Updates gibt es nur in der installierten App.' : 'Updates werden über die Download-Seite bezogen.';
      case 'error': return u.message ? 'Update-Suche nicht möglich: ' + u.message : 'Update-Suche nicht möglich.';
      default: return '';
    }
  }

  function renderUpdateBar() {
    const bar = $('update-bar');
    const u = ui.update;
    if (u.state === 'downloading' || u.state === 'downloaded') ui.updateSeen = true;
    let text = '';
    let action = null;
    if (u.state === 'downloading' || u.state === 'downloaded' || u.state === 'available') text = updateText();
    if (u.state === 'downloaded' && !u.installing) action = { label: 'Jetzt neu starten', run: () => window.myRouteAPI.installUpdate().catch(() => {}) };
    if (u.state === 'available') action = { label: 'Herunterladen', run: () => openLink(RELEASES_URL) };
    // Wenn das Installieren nicht klappt (z. B. unsignierte macOS-App), bleibt der Weg über die Download-Seite.
    if (u.state === 'error' && ui.updateSeen) { text = 'Das Update konnte nicht automatisch installiert werden.'; action = { label: 'Download-Seite öffnen', run: () => openLink(RELEASES_URL) }; }
    const key = u.state + (u.version || '');
    if (!text || ui.updateDismissed === key) { bar.hidden = true; return; }
    $('update-text').textContent = text;
    const btn = $('update-action');
    btn.hidden = !action;
    if (action) { btn.textContent = action.label; btn.onclick = action.run; }
    $('update-dismiss').onclick = () => { ui.updateDismissed = key; bar.hidden = true; };
    bar.hidden = false;
  }

  async function setupUpdates() {
    if (isDesktop) {
      try {
        ui.appInfo = await window.myRouteAPI.getAppInfo();
        ui.update = (await window.myRouteAPI.getUpdateStatus()) || ui.update;
      } catch (err) { /* ohne Info weiter */ }
      window.myRouteAPI.onUpdateStatus((s) => { ui.update = s; renderUpdateBar(); renderPrivacy(); });
    } else {
      ui.appInfo = { version: /^\d/.test(BUILD_VERSION) ? BUILD_VERSION : 'Entwicklung', platform: 'web', encrypted: false };
      if (state.privacy.accepted && state.privacy.autoUpdate) webUpdateCheck(false);
    }
    renderUpdateBar();
    renderPrivacy();
  }

  // ---------- Datenschutz & Sicherheit (Info) ----------
  function renderPrivacy() {
    const info = ui.appInfo || {};
    const rows = [
      ['Version', info.version || '–'],
      ['Speicherort', isDesktop ? 'Nur auf diesem Gerät (App-Datenordner, nur für dich lesbar)' : 'Nur im Speicher dieses Browsers bzw. dieser App'],
      ['Verschlüsselung', isDesktop ? (info.encrypted ? 'Ja – über den Schlüsselbund deines Betriebssystems' : 'Nein – kein Schlüsselbund gefunden (Schutz nur durch Dateirechte)') : (webStorage.protectedOn ? 'Ja – mit deinem Passwort (AES-256)' : 'Aus – optional per Passwortschutz')],
      ['Telemetrie / Tracking', 'Keine']
    ];
    $('privacy-facts').replaceChildren(...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]));
    $('pv-autoupdate').checked = state.privacy.autoUpdate;
    $('pv-auto-label').textContent = isDesktop ? 'Bei jedem Start automatisch nach Updates suchen und sofort installieren' : 'Beim Start automatisch nach neuen Versionen suchen';
    $('pv-c-geocode').checked = state.privacy.consent.geocode;
    $('pv-c-route').checked = state.privacy.consent.route;
    $('pv-update-status').textContent = updateText();
    const canProtect = !isDesktop && cryptoOk;
    $('pv-protect').hidden = !canProtect;
    if (canProtect) {
      const on = webStorage.protectedOn;
      $('pv-protect-text').textContent = on
        ? 'Dein Passwortschutz ist aktiv: Favoriten und Routen liegen verschlüsselt im Browser-Speicher und werden beim Start entsperrt.'
        : 'Schütze deine Daten zusätzlich mit einem Passwort – sinnvoll, wenn mehrere Personen oder Programme auf dieses Gerät zugreifen.';
      $('pv-protect-on').hidden = on;
      $('pv-protect-change').hidden = !on;
      $('pv-lock').hidden = !on;
      $('pv-protect-off').hidden = !on;
    }
  }

  async function wipeAll() {
    if (!window.confirm('Wirklich ALLE Favoriten, Routen und Einstellungen unwiderruflich löschen?\n\nTipp: Erstelle vorher mit „Daten sichern“ eine Sicherung.')) return;
    try {
      if (isDesktop) await window.myRouteAPI.wipeData(); else await webStorage.wipe();
    } catch (err) {
      toast('Das Löschen hat leider nicht geklappt.');
      return;
    }
    state = defaultState();
    ui.draft = newDraft();
    ui.editingFav = null;
    ui.update = { state: 'idle' };
    render();
    toast('Alle Daten wurden gelöscht.');
    showWelcome();
  }

  function bindPrivacy() {
    $('pv-autoupdate').addEventListener('change', (e) => {
      state.privacy.autoUpdate = e.target.checked;
      persist();
      if (e.target.checked) checkUpdatesNow(false);
      renderPrivacy();
    });
    $('pv-check').addEventListener('click', () => checkUpdatesNow(true));
    $('pv-c-geocode').addEventListener('change', (e) => { state.privacy.consent.geocode = e.target.checked; persist(); });
    $('pv-c-route').addEventListener('change', (e) => { state.privacy.consent.route = e.target.checked; persist(); });
    $('pv-export').addEventListener('click', () => $('btn-export').click());
    $('pv-wipe').addEventListener('click', wipeAll);
    $('pv-protect-on').addEventListener('click', async () => {
      const pass = await askNewPassword();
      if (!pass) return;
      try { await webStorage.enableProtection(pass, state); toast('Passwortschutz ist aktiv.'); } catch (err) { toast('Der Passwortschutz konnte nicht eingerichtet werden.'); }
      renderPrivacy();
    });
    $('pv-protect-change').addEventListener('click', async () => {
      const pass = await askNewPassword();
      if (!pass) return;
      try { await webStorage.enableProtection(pass, state); toast('Passwort geändert.'); } catch (err) { toast('Das Passwort konnte nicht geändert werden.'); }
    });
    $('pv-protect-off').addEventListener('click', async () => {
      if (!window.confirm('Passwortschutz ausschalten? Die Daten werden danach unverschlüsselt im Browser-Speicher abgelegt.')) return;
      await webStorage.disableProtection(state);
      toast('Passwortschutz ist ausgeschaltet.');
      renderPrivacy();
    });
    $('pv-lock').addEventListener('click', lockNow);
  }

  async function init() {
    let res = { state: null, status: 'new' };
    try {
      res = (await api.loadData()) || res;
    } catch (err) {
      res = { state: null, status: 'recovered' };
    }
    if (res.status === 'locked') {
      const plain = await runUnlock();
      res = plain ? { state: plain, status: 'ok' } : { state: null, status: 'new' };
    }
    state = res.state && Array.isArray(res.state.favorites) && Array.isArray(res.state.routes) ? sanitize(res.state) : defaultState();
    bind();
    bindPrivacy();
    render();
    if (res.status === 'recovered') toast('Deine gespeicherten Daten waren nicht lesbar – die alte Datei wurde sicher beiseitegelegt.');
    await setupUpdates();
    if (!state.privacy.accepted) showWelcome();
  }

  init();
})();
