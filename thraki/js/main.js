(() => {
  const btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) btn.addEventListener('click', () => {
    btn.setAttribute('aria-expanded', String(nav.classList.toggle('open')));
  });
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm) return;
  document.querySelectorAll('.tile').forEach((t, i) => {
    t.style.animationDelay = i * 80 + 'ms';
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 14 + 'deg');
      t.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 14 + 'deg');
    });
    t.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
  });
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
