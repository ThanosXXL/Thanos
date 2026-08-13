(function () {
  'use strict';

  var header = document.getElementById('siteHeader');
  var navLinks = document.getElementById('navLinks');
  var menuBtn = document.getElementById('menuBtn');
  var toTop = document.getElementById('toTop');
  var progressBar = document.getElementById('progressBar');
  var cursorGlow = document.getElementById('cursorGlow');
  var root = document.documentElement;

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---- Scroll: header state, progress bar, back-to-top ---- */
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle('scrolled', y > 30);

    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (y / docHeight) * 100 : 0;
    progressBar.style.width = pct + '%';
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toTopIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      toTop.classList.toggle('visible', !entry.isIntersecting);
    });
  }, { rootMargin: '-400px 0px 0px 0px' });
  var hero = document.querySelector('.hero');
  if (hero) toTopIO.observe(hero);

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- Mobile menu ---- */
  var menuBtnLabel = menuBtn.querySelector('span');
  function setMenuOpen(open) {
    navLinks.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtnLabel.textContent = open ? 'Schließen' : 'Menü';
    document.body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn.addEventListener('click', function () {
    setMenuOpen(!navLinks.classList.contains('open'));
  });
  navLinks.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setMenuOpen(false); });
  });

  /* ---- Active nav link on scroll ---- */
  var sections = ['home', 'info', 'programme', 'kontakt']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navAnchors = navLinks.querySelectorAll('a[data-nav]');
  var sectionIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navAnchors.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  sections.forEach(function (s) { sectionIO.observe(s); });

  /* ---- Scroll reveal ---- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { revealIO.observe(el); });

  /* ---- Animated stat counters ---- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(function (el) { countIO.observe(el); });

  /* ---- Mouse parallax (hero orbs + cursor glow) ---- */
  var rafId = null;
  var pendingEvent = null;
  function applyMouse() {
    if (!pendingEvent) { rafId = null; return; }
    var e = pendingEvent;
    var px = (e.clientX / window.innerWidth - 0.5) * 2;
    var py = (e.clientY / window.innerHeight - 0.5) * 2;
    root.style.setProperty('--px', px.toFixed(3));
    root.style.setProperty('--py', py.toFixed(3));
    root.style.setProperty('--cx', e.clientX + 'px');
    root.style.setProperty('--cy', (e.clientY + window.scrollY) + 'px');
    rafId = null;
  }
  window.addEventListener('mousemove', function (e) {
    pendingEvent = e;
    if (!rafId) rafId = requestAnimationFrame(applyMouse);
    if (!document.body.classList.contains('cursor-active')) {
      document.body.classList.add('cursor-active');
    }
  }, { passive: true });
  window.addEventListener('mouseleave', function () {
    document.body.classList.remove('cursor-active');
  });

  /* ---- 3D tilt cards ---- */
  var tiltCards = document.querySelectorAll('.tilt-card');
  var MAX_TILT = 8;
  tiltCards.forEach(function (card) {
    var raf = null;
    function handleMove(e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2;
      var cy = rect.height / 2;
      var rotateX = ((y - cy) / cy) * -MAX_TILT;
      var rotateY = ((x - cx) / cx) * MAX_TILT;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        card.style.setProperty('--rx', rotateX.toFixed(2) + 'deg');
        card.style.setProperty('--ry', rotateY.toFixed(2) + 'deg');
        card.style.setProperty('--mx', ((x / rect.width) * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((y / rect.height) * 100).toFixed(1) + '%');
      });
    }
    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  /* ---- Hero card subtle tilt toward cursor ---- */
  var heroCard = document.getElementById('heroCard');
  if (heroCard) {
    document.addEventListener('mousemove', function (e) {
      var w = window.innerWidth;
      var h = window.innerHeight;
      var rx = 6 - ((e.clientY / h) - 0.5) * 10;
      var ry = -14 + ((e.clientX / w) - 0.5) * 14;
      heroCard.style.transform = 'translateY(-50%) perspective(1200px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    }, { passive: true });
  }

  /* ---- Contact form (client-side only, no backend) ---- */
  var form = document.getElementById('kontaktForm');
  var note = document.getElementById('formNote');
  var submitLabel = document.getElementById('submitLabel');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var vorname = form.vorname.value.trim();
      var nachname = form.nachname.value.trim();
      var email = form.email.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!vorname || !nachname || !emailOk) {
        note.textContent = 'Bitte füllen Sie Vorname, Nachname und eine gültige E-Mail-Adresse aus.';
        note.classList.remove('success');
        return;
      }

      var subject = encodeURIComponent('Weiterbildungsanfrage über die Website');
      var body = encodeURIComponent(
        'Firma: ' + (form.firma.value.trim() || '-') + '\n' +
        'Name: ' + vorname + ' ' + nachname + '\n' +
        'Email: ' + email + '\n\n' +
        'Nachricht:\n' + (form.nachricht.value.trim() || '-')
      );

      submitLabel.textContent = 'Wird geöffnet...';
      note.textContent = 'Ihr E-Mail-Programm wird geöffnet, damit Sie die Anfrage direkt absenden können.';
      note.classList.add('success');

      window.location.href = 'mailto:Info@mc-akademie.com?subject=' + subject + '&body=' + body;

      setTimeout(function () { submitLabel.textContent = 'Absenden'; }, 1800);
    });
  }
})();
