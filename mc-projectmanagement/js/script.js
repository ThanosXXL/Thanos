(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------------- */
  /* Jahr im Footer                                                  */
  /* -------------------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -------------------------------------------------------------- */
  /* Sticky Header: Hintergrund beim Scrollen verstärken             */
  /* -------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 12);
  }
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* -------------------------------------------------------------- */
  /* Mobile Navigation                                                */
  /* -------------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* -------------------------------------------------------------- */
  /* Scroll-Reveal via IntersectionObserver                          */
  /* -------------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* -------------------------------------------------------------- */
  /* 3D Tilt-Effekt für Glas-/Logo-Karten (Maus & Touch)              */
  /* -------------------------------------------------------------- */
  var tiltEls = document.querySelectorAll('.tilt-card, .logo-mark');
  if (!reducedMotion) {
    tiltEls.forEach(function (el) {
      var rect;
      var maxTilt = el.classList.contains('logo-mark') ? 10 : 7;

      function handleMove(clientX, clientY) {
        rect = el.getBoundingClientRect();
        var px = (clientX - rect.left) / rect.width;
        var py = (clientY - rect.top) / rect.height;
        var rotY = (px - 0.5) * maxTilt * 2;
        var rotX = (0.5 - py) * maxTilt * 2;
        el.style.transform = 'perspective(900px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateZ(0)';
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      }

      el.addEventListener('mousemove', function (e) {
        handleMove(e.clientX, e.clientY);
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
      el.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });
      el.addEventListener('touchend', function () {
        el.style.transform = '';
      });
    });
  }

  /* -------------------------------------------------------------- */
  /* Fortschritts-Ring im Hero animieren                              */
  /* -------------------------------------------------------------- */
  var ring = document.querySelector('.progress-ring');
  if (ring) {
    var ringFg = ring.querySelector('.ring-fg');
    var value = parseFloat(ring.getAttribute('data-value')) || 0;
    var circumference = 2 * Math.PI * 34;
    var offset = circumference - (value / 100) * circumference;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        ringFg.style.strokeDashoffset = String(reducedMotion ? offset : circumference);
        if (!reducedMotion) {
          setTimeout(function () { ringFg.style.strokeDashoffset = String(offset); }, 250);
        } else {
          ringFg.style.strokeDashoffset = String(offset);
        }
      });
    });
  }

  /* -------------------------------------------------------------- */
  /* Zähl-Animation für Statistik-Kacheln                             */
  /* -------------------------------------------------------------- */
  var counters = document.querySelectorAll('[data-count]');
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reducedMotion) {
      el.textContent = target + suffix;
      return;
    }
    var start = 0;
    var duration = 1400;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(start + (target - start) * eased);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var counterIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterIo.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) { counterIo.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* -------------------------------------------------------------- */
  /* Cursor-Spotlight: folgt der Maus über die ganze Seite            */
  /* -------------------------------------------------------------- */
  var cursorSpot = document.getElementById('cursorSpot');
  if (cursorSpot && !reducedMotion && window.matchMedia('(hover: hover)').matches) {
    var spotTicking = false;
    window.addEventListener('mousemove', function (e) {
      if (spotTicking) return;
      spotTicking = true;
      requestAnimationFrame(function () {
        cursorSpot.style.setProperty('--cx', e.clientX + 'px');
        cursorSpot.style.setProperty('--cy', e.clientY + 'px');
        cursorSpot.classList.add('active');
        spotTicking = false;
      });
    });
    document.addEventListener('mouseleave', function () {
      cursorSpot.classList.remove('active');
    });
  }

  /* -------------------------------------------------------------- */
  /* Scroll-Parallax für Hintergrund-Orbs                             */
  /* -------------------------------------------------------------- */
  var orbEls = document.querySelectorAll('.orb');
  if (orbEls.length && !reducedMotion) {
    var parallaxTicking = false;
    window.addEventListener('scroll', function () {
      if (parallaxTicking) return;
      parallaxTicking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        orbEls.forEach(function (orb, i) {
          var speed = 0.06 + i * 0.03;
          orb.style.setProperty('--parallax-y', (y * speed).toFixed(1) + 'px');
        });
        parallaxTicking = false;
      });
    }, { passive: true });
  }

  /* -------------------------------------------------------------- */
  /* Magnet-Buttons: Primär-Buttons folgen der Maus leicht (Haptik)   */
  /* -------------------------------------------------------------- */
  var magneticEls = document.querySelectorAll('.btn-primary, .play-btn');
  if (!reducedMotion) {
    magneticEls.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var mx = e.clientX - (rect.left + rect.width / 2);
        var my = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = 'translate(' + (mx * 0.18).toFixed(1) + 'px,' + (my * 0.28).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* -------------------------------------------------------------- */
  /* Klick-Ripple auf Glossy-Buttons: haptisches Feedback             */
  /* -------------------------------------------------------------- */
  document.querySelectorAll('.btn-glossy').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var rect = btn.getBoundingClientRect();
      var ripple = document.createElement('span');
      var size = Math.max(rect.width, rect.height) * 1.6;
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });
  });

  /* -------------------------------------------------------------- */
  /* Sanftes Scrollen für Anker-Links (Fallback zu CSS scroll-behavior) */
  /* -------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var headerHeight = header ? header.offsetHeight : 0;
      var top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 10;
      window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  });
})();
