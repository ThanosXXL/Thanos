// Sprachumschalter Griechisch/Deutsch. Der erste Teil läuft sofort (kein Aufblitzen), der zweite verdrahtet die Flaggen.
(() => {
  const KEY = 'thraki-lang', root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* ohne Speicher weiter */ }
  const pref = (navigator.language || 'de').toLowerCase().startsWith('el') ? 'el' : 'de';
  const apply = (l, animate) => {
    root.lang = l;
    const t = root.dataset['title' + l[0].toUpperCase() + l.slice(1)];
    if (t) document.title = t;
    document.querySelectorAll('.flag').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    if (animate) {
      const m = document.querySelector('.stage');
      if (m) { m.classList.remove('swap'); void m.offsetWidth; m.classList.add('swap'); }
    }
  };
  apply(saved === 'el' || saved === 'de' ? saved : pref, false);
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.lang, false);
    document.querySelectorAll('.flag').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.lang === root.lang) return;
      apply(b.dataset.lang, true);
      try { localStorage.setItem(KEY, b.dataset.lang); } catch (e) { /* nur nicht merken */ }
    }));
  });
})();
