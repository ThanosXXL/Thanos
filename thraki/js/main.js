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

(() => { // 360°-Ring: ziehen, Pfeiltasten, Auto-Drehung
  const scene = document.getElementById('ring');
  if (!scene) return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ang = 0, target = 0, drag = false, lastX = 0, idle = !calm;
  const frame = () => {
    if (idle) target += .12;
    ang += (target - ang) * (drag ? 1 : .12);
    scene.style.setProperty('--ry', ang.toFixed(2) + 'deg');
    requestAnimationFrame(frame);
  };
  scene.addEventListener('pointerdown', e => { drag = true; idle = false; lastX = e.clientX; scene.setPointerCapture(e.pointerId); });
  scene.addEventListener('pointermove', e => { if (!drag) return; target += (e.clientX - lastX) * .45; lastX = e.clientX; });
  const end = () => { drag = false; };
  scene.addEventListener('pointerup', end); scene.addEventListener('pointercancel', end);
  const turn = d => { idle = false; target += d * 60; };
  document.getElementById('ring-l').addEventListener('click', () => turn(1));
  document.getElementById('ring-r').addEventListener('click', () => turn(-1));
  scene.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') turn(1); if (e.key === 'ArrowRight') turn(-1); });
  requestAnimationFrame(frame);
})();
