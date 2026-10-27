(function () {
  'use strict';

  const MAX_FAVORITES = 200;
  const MAX_ROUTES = 100;
  const MAX_STOPS = 40;
  const MAX_WAYPOINTS_PER_LINK = 9; // Google Maps: höchstens 9 Zwischenstopps pro Link
  const STORAGE_KEY = 'my-route-data-v1';
  const ICONS = ['📍', '🏠', '🏢', '☕', '🍽️', '🛒', '⛽', '🏖️', '🏔️', '🎭', '🏥', '🎓', '❤️', '⭐'];
  const REGIONS = { alle: 'Alle', inland: 'Inland', ausland: 'Ausland' };
  const LAENDER = ['Österreich', 'Schweiz', 'Italien', 'Frankreich', 'Spanien', 'Portugal', 'Niederlande', 'Belgien', 'Luxemburg', 'Dänemark', 'Polen', 'Tschechien', 'Ungarn', 'Slowenien', 'Kroatien', 'Griechenland', 'Schweden', 'Norwegen', 'Türkei', 'Anderes Land'];
  const MODES = { driving: 'Auto', walking: 'zu Fuß', bicycling: 'Fahrrad', transit: 'Bus & Bahn' };

  const LOOKS = ['gold3d', 'klar', 'hell'];
  let state = { favorites: [], routes: [], look: 'gold3d', touch: 'auto' };
  const ui = {
    view: 'start',
    editingFav: null,
    draft: newDraft(),
    mapRouteId: null,
    regionFilter: 'alle'
  };

  // ---------- Speicher: Desktop (IPC) oder Browser (localStorage) ----------
  const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent || '');
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const launcher = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppLauncher;
  const isDesktop = typeof window.myRouteAPI === 'object' && window.myRouteAPI !== null;

  const webStorage = {
    async loadData() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        return null;
      }
    },
    async saveData(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        toast('Speichern im Browser nicht möglich – bitte „Sichern“ nutzen.');
      }
      return true;
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

  function openLink(url) {
    if (isDesktop) {
      window.myRouteAPI.openExternal(url).catch(() => toast('Der Link konnte nicht geöffnet werden.'));
    } else if (launcher) {
      // Android-App (Capacitor): Link direkt an die installierte Karten-App übergeben
      launcher.openUrl({ url }).catch(() => toast('Der Link konnte nicht geöffnet werden.'));
    } else {
      window.open(url, '_blank', 'noopener');
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
    renderStart();
    renderFavorites();
    renderRoutes();
    renderMap();
    renderDrive();
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
    if (!state.favorites.length) {
      box.replaceChildren(emptyCard('Hier sammelst du die Orte, die dir wichtig sind. Trage links deinen ersten Lieblingsort ein.', [h('button', { class: 'btn ghost', onclick: loadDemo }, 'Beispiele laden')]));
      return;
    }
    box.replaceChildren(
      ...state.favorites.map((f) => {
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
            hasCoords(f) ? h('span', { class: 'badge', text: 'Koordinaten' }) : null,
            used ? h('span', { class: 'badge', text: used + (used === 1 ? ' Route' : ' Routen') }) : null
          ),
          h('div', { class: 'card-actions' },
            h('button', { class: 'btn small', onclick: () => openLink('https://www.google.com/maps/dir/?' + new URLSearchParams({ api: '1', destination: placeOf(f) })) }, 'Hierhin navigieren'),
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
    $('fav-form-title').textContent = 'Lieblingsort bearbeiten';
    $('fav-cancel').hidden = false;
    $('fav-name').focus();
  }

  function resetFavForm() {
    ui.editingFav = null;
    $('fav-form').reset();
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
    pick.replaceChildren(...state.favorites.map((f) => h('option', { value: f.id }, `${f.icon || '📍'} ${f.name}`)));
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
    if (!route) {
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
      box.replaceChildren(h('p', { class: 'hint', text: 'Für die Vorschau brauchen die Stopps Koordinaten (Favoriten → „Koordinaten zur Adresse finden“).' }));
      return;
    }
    box.replaceChildren(buildMapSvg(located));
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
              h('span', { class: 'grow' }, h('span', { class: 'card-title', text: f.name }), h('span', { class: 'card-meta', text: hasCoords(f) ? 'Live-Optionen' : 'Ohne Koordinaten' }))
            )
          )
        : [emptyCard('Sobald du Favoriten gespeichert hast, kannst du sie hier mit einem Tipp ansteuern.', [])])
    );
  }

  // ---------- Live-Routen: bis zu 3 Optionen zum Ziel (schnellste, kürzeste, Alternative) ----------
  const live = { timer: null, busy: false };

  function openLive(toId) {
    const dlg = $('live-dialog');
    const fill = (sel, withHere, keep) => {
      const prev = keep || sel.value;
      sel.replaceChildren(
        ...(withHere ? [h('option', { value: 'here' }, '📡 Mein Standort')] : []),
        ...state.favorites.map((f) => h('option', { value: f.id }, `${f.icon || '📍'} ${f.name}`))
      );
      if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
    };
    const canLocate = !isDesktop && !!navigator.geolocation;
    fill($('live-from'), canLocate, canLocate ? 'here' : '');
    fill($('live-to'), false, toId);
    $('live-options').replaceChildren();
    $('live-status').textContent = state.favorites.length ? 'Wähle Start und Ziel und tippe auf „Optionen laden“.' : 'Lege zuerst Favoriten mit Koordinaten an.';
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    if (state.favorites.length && toId && hasCoords(favById(toId)) && ($('live-from').value === 'here' || hasCoords(favById($('live-from').value)))) loadLive();
  }

  function closeLive() {
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

  async function getRouteOptions(from, to) {
    if (isDesktop) return normalizeOsrm(await window.myRouteAPI.routeOptions({ from, to }));
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?alternatives=3&overview=simplified&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Dienst antwortet nicht');
    return normalizeOsrm(await res.json());
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
      $('live-options').replaceChildren(
        ...options.map((o, i) => {
          const extra = i === 0 ? '' : ((o.r.duration - fastest.duration >= 0 ? '+' : '−') + fmtDuration(Math.abs(o.r.duration - fastest.duration)) + ' · ' + ((o.r.distance - fastest.distance) / 1000 >= 0 ? '+' : '−') + fmtKm(Math.abs(o.r.distance - fastest.distance) / 1000) + ' km');
          return h('article', { class: 'card live-opt' },
            h('span', { class: 'badge', text: o.label }),
            h('div', { class: 'live-big' }, h('b', { text: fmtDuration(o.r.duration) }), ' · ', fmtKm(o.r.distance / 1000) + ' km'),
            extra ? h('div', { class: 'card-meta', text: 'gegenüber der schnellsten: ' + extra }) : h('div', { class: 'card-meta', text: 'Empfohlen für den schnellsten Weg' }),
            h('button', { class: 'btn', onclick: () => { openLink(optionLink(o, { points: fastest.points }, from, to)); toast('Gute Fahrt! 🚗'); } }, 'Diese Strecke fahren')
          );
        })
      );
      status.textContent = '🟢 Live · aktualisiert um ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      clearInterval(live.timer);
      live.timer = $('live-auto').checked ? setInterval(loadLive, 60000) : null;
    } catch (err) {
      status.textContent = '🔴 Keine Live-Verbindung: ' + (err && err.message ? err.message : 'bitte Internet prüfen') + '.';
    } finally {
      live.busy = false;
    }
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
    state.favorites.push(...demo.slice(0, Math.max(0, MAX_FAVORITES - state.favorites.length)));
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
      const rec = { name, address: $('fav-address').value.trim(), note: $('fav-note').value.trim(), icon: $('fav-icon').value || '📍' };
      if (coords) { rec.lat = coords.lat; rec.lon = coords.lon; }
      const existing = ui.editingFav && favById(ui.editingFav);
      if (existing) {
        delete existing.lat; delete existing.lon;
        Object.assign(existing, rec);
      } else {
        if (state.favorites.length >= MAX_FAVORITES) { toast('Das sind schon ganz schön viele Favoriten – bitte räume erst etwas auf.'); return; }
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
      toast('Ich suche …');
      try {
        let res;
        if (isDesktop) res = await window.myRouteAPI.geocode(q);
        else {
          const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=de&q=' + encodeURIComponent(q));
          const list = r.ok ? await r.json() : [];
          res = list[0] ? { lat: Number(list[0].lat), lon: Number(list[0].lon) } : null;
        }
        if (res && Number.isFinite(res.lat) && Number.isFinite(res.lon)) {
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
    $('live-close').addEventListener('click', closeLive);
    $('live-dialog').addEventListener('close', () => { clearInterval(live.timer); live.timer = null; });
    $('live-auto').addEventListener('change', () => { clearInterval(live.timer); live.timer = $('live-auto').checked ? setInterval(loadLive, 60000) : null; });
    $('live-from').addEventListener('change', () => { $('live-options').replaceChildren(); });
    $('live-to').addEventListener('change', () => { $('live-options').replaceChildren(); });
    $('map-route').addEventListener('change', (e) => { ui.mapRouteId = e.target.value; renderMap(); });

    $('btn-export').addEventListener('click', async () => {
      try {
        if (isDesktop) {
          const res = await window.myRouteAPI.exportData(state);
          if (res.exported) toast('Gesichert – gut aufgehoben.');
        } else {
          const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
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
      if (!file || file.size > 5 * 1024 * 1024) return;
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

  function adopt(data) {
    const ok = data && Array.isArray(data.favorites) && Array.isArray(data.routes);
    if (!ok) { toast('Das ist keine gültige My-Route-Sicherung.'); return; }
    state = sanitize(data);
    persist();
    ui.draft = newDraft();
    render();
    toast('Sicherung eingelesen – willkommen zurück!');
  }

  // Übernimmt nur bekannte Felder mit geprüften Typen (Schutz vor manipulierten Dateien).
  function sanitize(data) {
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
    const favorites = data.favorites.slice(0, MAX_FAVORITES).filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string').map((f) => {
      const out = { id: f.id.slice(0, 40), name: str(f.name, 80), address: str(f.address, 200), note: str(f.note, 160), icon: ICONS.includes(f.icon) ? f.icon : '📍' };
      if (Number.isFinite(f.lat) && Number.isFinite(f.lon) && Math.abs(f.lat) <= 90 && Math.abs(f.lon) <= 180) { out.lat = f.lat; out.lon = f.lon; }
      return out;
    });
    const ids = new Set(favorites.map((f) => f.id));
    const routes = data.routes.slice(0, MAX_ROUTES).filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string' && Array.isArray(r.stops)).map((r) => ({
      id: r.id.slice(0, 40), name: str(r.name, 80), mode: MODES[r.mode] ? r.mode : 'driving', region: r.region === 'ausland' ? 'ausland' : 'inland', land: r.region === 'ausland' && LAENDER.includes(r.land) ? r.land : '', startFromHere: !!r.startFromHere, starred: !!r.starred,
      drives: Number.isFinite(r.drives) ? Math.max(0, Math.floor(r.drives)) : 0, lastDriven: typeof r.lastDriven === 'string' ? r.lastDriven.slice(0, 40) : null,
      stops: r.stops.filter((id) => typeof id === 'string' && ids.has(id)).slice(0, MAX_STOPS)
    }));
    return { favorites, routes, look: LOOKS.includes(data.look) ? data.look : 'gold3d', touch: ['auto', 'an', 'aus'].includes(data.touch) ? data.touch : 'auto' };
  }

  async function init() {
    try {
      const loaded = await api.loadData();
      if (loaded && Array.isArray(loaded.favorites) && Array.isArray(loaded.routes)) state = sanitize(loaded);
    } catch (err) {
      state = { favorites: [], routes: [], look: 'gold3d', touch: 'auto' };
    }
    bind();
    render();
  }

  init();
})();
