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

(() => { // 360°-Ansicht: Bilderfolge img/trachten-360-01.jpg, -02.jpg, … (ziehen, Pfeile, Zoom, Auto-Drehung)
  const box = document.getElementById('rot');
  if (!box) return;
  const img = document.getElementById('rot-img'), view = box.querySelector('.rot-view');
  const [bl, br, bz, ba] = ['rot-l', 'rot-r', 'rot-z', 'rot-a'].map(id => document.getElementById(id));
  const frames = [img.getAttribute('src')], pad = n => String(n).padStart(2, '0');
  let cur = 0, zoom = false, auto = null, dragging = false, lastX = 0, acc = 0;
  const show = i => { cur = (i + frames.length) % frames.length; img.src = frames[cur]; };
  const step = d => show(cur + d);
  const probe = n => { const t = new Image(); t.onload = () => { frames.push(t.src); probe(n + 1); }; t.onerror = ready; t.src = box.dataset.base + pad(n) + '.jpg'; };
  function ready() {
    if (frames.length < 2) { [bl, br, ba].forEach(b => { b.disabled = true; b.title = 'Weitere Ansichten folgen'; }); return; }
    view.addEventListener('pointerdown', e => { dragging = true; stop(); lastX = e.clientX; acc = 0; view.setPointerCapture(e.pointerId); });
    view.addEventListener('pointermove', e => { if (!dragging) return; acc += e.clientX - lastX; lastX = e.clientX; const per = view.clientWidth / frames.length * 1.4; while (Math.abs(acc) >= per) { step(acc > 0 ? -1 : 1); acc -= Math.sign(acc) * per; } });
    view.addEventListener('pointerup', () => { dragging = false; }); view.addEventListener('pointercancel', () => { dragging = false; });
    bl.addEventListener('click', () => { stop(); step(1); }); br.addEventListener('click', () => { stop(); step(-1); });
    ba.addEventListener('click', () => auto ? stop() : start());
    box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { stop(); step(1); } if (e.key === 'ArrowRight') { stop(); step(-1); } });
  }
  function start() { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; auto = setInterval(() => step(1), 110); ba.setAttribute('aria-pressed', 'true'); }
  function stop() { clearInterval(auto); auto = null; ba.setAttribute('aria-pressed', 'false'); }
  bz.addEventListener('click', () => { zoom = !zoom; box.style.setProperty('--z', zoom ? 2 : 1); bz.setAttribute('aria-pressed', String(zoom)); });
  view.addEventListener('mousemove', e => { if (!zoom) return; const r = view.getBoundingClientRect(); box.style.setProperty('--ox', ((e.clientX - r.left) / r.width * 100) + '%'); box.style.setProperty('--oy', ((e.clientY - r.top) / r.height * 100) + '%'); });
  probe(2);
})();

(() => { // Nach-oben-Button
  const b = document.getElementById('totop');
  if (!b) return;
  b.hidden = false;
  const upd = () => b.classList.toggle('show', scrollY > 300);
  addEventListener('scroll', upd, { passive: true }); upd();
  b.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
})();
