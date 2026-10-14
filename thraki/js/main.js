(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) btn.addEventListener('click', () => btn.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));

  // Slider (Startseite)
  const slides = [...document.querySelectorAll('.slide')];
  if (slides.length) {
    const cnt = document.getElementById('cnt'), pp = document.getElementById('pp');
    let i = 0, timer = null;
    const show = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
      cnt.textContent = `${i + 1} / ${slides.length}`;
    };
    const play = () => { stop(); timer = setInterval(() => show(i + 1), 6500); pp.textContent = '❚❚'; pp.setAttribute('aria-label', 'Pause'); };
    const stop = () => { clearInterval(timer); timer = null; pp.textContent = '▶'; pp.setAttribute('aria-label', 'Abspielen'); };
    document.getElementById('prev').addEventListener('click', () => show(i - 1));
    document.getElementById('next').addEventListener('click', () => show(i + 1));
    pp.addEventListener('click', () => timer ? stop() : play());
    show(0); calm ? stop() : play();
  }
  if (calm) return;
  document.querySelectorAll('.tile').forEach((t, k) => {
    t.style.animationDelay = k * 80 + 'ms';
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 16 + 'deg');
      t.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 16 + 'deg');
    });
    t.addEventListener('pointerleave', () => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); });
  });
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();
