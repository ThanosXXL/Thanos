(function () {
  'use strict';

  const REPO = 'ThanosXXL/Thanos';
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const buttons = Array.from(document.querySelectorAll('[data-app]'));
  const releaseInfoEl = document.getElementById('releaseInfo');

  function disableAll(message) {
    buttons.forEach((btn) => {
      btn.href = '#';
      btn.classList.add('disabled');
      btn.setAttribute('aria-disabled', 'true');
      btn.addEventListener('click', (e) => e.preventDefault());
    });
    if (releaseInfoEl) releaseInfoEl.textContent = message;
  }

  async function init() {
    let release;
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!res.ok) throw new Error('no-release');
      release = await res.json();
    } catch (err) {
      disableAll('Noch kein Release veröffentlicht. Bitte später erneut versuchen.');
      return;
    }

    const assets = release.assets || [];
    let anyFound = false;

    buttons.forEach((btn) => {
      const appPattern = btn.dataset.app === 'dozenten' ? /dozenten/i : /office/i;
      const ext = (btn.dataset.ext || '').toLowerCase();
      const asset = assets.find((a) => appPattern.test(a.name) && a.name.toLowerCase().endsWith(ext));
      if (asset) {
        btn.href = asset.browser_download_url;
        btn.setAttribute('download', asset.name);
        btn.classList.remove('disabled');
        btn.removeAttribute('aria-disabled');
        anyFound = true;
      } else {
        btn.href = '#';
        btn.classList.add('disabled');
        btn.setAttribute('aria-disabled', 'true');
        btn.addEventListener('click', (e) => e.preventDefault());
      }
    });

    if (releaseInfoEl) {
      releaseInfoEl.textContent = '';
      const publishedDate = release.published_at ? new Date(release.published_at).toLocaleDateString('de-DE') : '';
      releaseInfoEl.appendChild(document.createTextNode(
        anyFound
          ? `Aktuelle Version: ${release.tag_name}${publishedDate ? ` · veröffentlicht am ${publishedDate}` : ''} · `
          : 'Release gefunden, aber keine passenden Installer-Dateien. · '
      ));
      const link = document.createElement('a');
      link.href = release.html_url;
      link.textContent = 'Alle Downloads auf GitHub ansehen';
      releaseInfoEl.appendChild(link);
    }
  }

  init();
})();
