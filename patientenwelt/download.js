(function () {
  'use strict';

  var REPO = 'https://github.com/ThanosXXL/Thanos';
  var LATEST = REPO + '/releases/latest/download/';

  var PLATFORMS = {
    windows: {
      name: 'Windows', icon: '🪟',
      url: LATEST + 'PatientenWelt-Setup.exe',
      meta: '64-Bit, Windows 10/11 · NSIS-Installer (.exe)',
      available: true
    },
    mac: {
      name: 'macOS', icon: '🍎',
      url: LATEST + 'PatientenWelt.dmg',
      meta: 'Intel & Apple Silicon · Disk Image (.dmg)',
      available: true
    },
    linux: {
      name: 'Linux', icon: '🐧',
      url: LATEST + 'PatientenWelt.AppImage',
      meta: '64-Bit · tragbares AppImage, keine Installation nötig',
      available: true
    },
    android: {
      name: 'Android', icon: '🤖',
      url: null,
      meta: 'Keine native App vorhanden — PatientenWelt ist aktuell eine reine Desktop-Anwendung (Electron).',
      available: false
    },
    ios: {
      name: 'iOS / iPadOS', icon: '📱',
      url: null,
      meta: 'Keine native App vorhanden — PatientenWelt ist aktuell eine reine Desktop-Anwendung (Electron).',
      available: false
    }
  };
  var ORDER = ['windows', 'mac', 'linux', 'android', 'ios'];

  function detectOS() {
    var ua = navigator.userAgent || '';
    var platform = navigator.platform || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows';
    if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'mac';
    if (/Linux/i.test(platform) || /Linux/i.test(ua)) return 'linux';
    return null;
  }

  function renderHero() {
    var detected = detectOS();
    var osNameEl = document.getElementById('heroOsName');
    var btn = document.getElementById('heroBtn');
    var btnLabel = document.getElementById('heroBtnLabel');
    var note = document.getElementById('heroNote');

    if (!detected) {
      osNameEl.textContent = 'System nicht automatisch erkannt';
      btn.classList.add('disabled');
      btn.removeAttribute('href');
      btnLabel.textContent = 'Bitte unten wählen';
      note.textContent = 'Wählen Sie Ihre Plattform in der Übersicht unten aus.';
      return;
    }

    var p = PLATFORMS[detected];
    osNameEl.textContent = p.name;
    if (p.available) {
      btn.href = p.url;
      btn.setAttribute('download', '');
      btnLabel.textContent = 'PatientenWelt für ' + p.name + ' herunterladen';
      note.textContent = p.meta;
    } else {
      btn.classList.add('disabled');
      btn.removeAttribute('href');
      btnLabel.textContent = 'Für ' + p.name + ' nicht verfügbar';
      note.textContent = p.meta;
    }
  }

  function renderGrid() {
    var grid = document.getElementById('platformGrid');
    ORDER.forEach(function (key) {
      var p = PLATFORMS[key];
      var card = document.createElement('div');
      card.className = 'platform-card' + (p.available ? '' : ' unavailable');

      var icon = document.createElement('div');
      icon.className = 'platform-icon';
      icon.textContent = p.icon;
      card.appendChild(icon);

      var name = document.createElement('div');
      name.className = 'platform-name';
      name.textContent = p.name;
      card.appendChild(name);

      var pill = document.createElement('span');
      pill.className = 'status-pill ' + (p.available ? 'ok' : 'no');
      pill.textContent = p.available ? 'Verfügbar' : 'Nicht verfügbar';
      card.appendChild(pill);

      var meta = document.createElement('div');
      meta.className = 'platform-meta';
      meta.textContent = p.meta;
      card.appendChild(meta);

      if (p.available) {
        var a = document.createElement('a');
        a.className = 'btn-glossy btn-small';
        a.href = p.url;
        a.setAttribute('download', '');
        a.textContent = 'Herunterladen';
        card.appendChild(a);
      } else {
        var span = document.createElement('span');
        span.className = 'btn-outline';
        span.textContent = 'Keine App vorhanden';
        card.appendChild(span);
      }

      grid.appendChild(card);
    });
  }

  renderHero();
  renderGrid();
})();
