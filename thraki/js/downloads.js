(() => {
  const s = document.getElementById('s'), btn = document.getElementById('all');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const files = [...document.querySelectorAll('#list a')].map(a => a.getAttribute('href'));
    let i = 0;
    (function next() {
      if (i >= files.length) { s.textContent = `✔ ${files.length} Dateien gestartet.`; return; }
      const a = document.createElement('a');
      a.href = files[i]; a.download = files[i].split('/').pop();
      document.body.appendChild(a); a.click(); a.remove();
      s.textContent = `${++i} / ${files.length}`;
      setTimeout(next, 700);
    })();
  });
})();
