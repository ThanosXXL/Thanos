(function () {
  'use strict';

  const STUDIO_EMAIL = 'termine@inkarnation-tattoo.de';
  const STUDIO_PHONE = '+49 30 123 456 7';

  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const sections = navLinks
    .map((link) => document.getElementById(link.dataset.section))
    .filter(Boolean);

  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const modalTabs = Array.from(document.querySelectorAll('.modal-tab'));
  const modalPanes = Array.from(document.querySelectorAll('.modal-pane'));
  const modalArtistSelect = document.getElementById('modalArtistSelect');
  const bookingForm = document.getElementById('bookingForm');

  const bookButtons = Array.from(document.querySelectorAll('.book-btn'));

  let toastEl = null;

  /* ---------------- Sidebar (ausklappbares Menü) ---------------- */
  function openSidebar() {
    document.body.classList.add('sidebar-open');
    sidebarToggle.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      document.body.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
    });
  }
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);
  navLinks.forEach((link) => link.addEventListener('click', () => closeSidebar()));

  /* ---------------- Scroll-Spy: aktive Navigation ---------------- */
  function setActiveLink(id) {
    navLinks.forEach((link) => {
      const isActive = link.dataset.section === id;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveLink(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
  }

  /* ---------------- 3D Tilt-Effekt für Karten ---------------- */
  function attachTilt(el) {
    const maxTilt = 8;
    function onMove(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      const px = x / rect.width;
      const py = y / rect.height;
      const rotY = (px - 0.5) * maxTilt * 2;
      const rotX = (0.5 - py) * maxTilt * 2;
      el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    }
    function reset() {
      el.style.transform = '';
    }
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', reset);
  }
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.tilt').forEach(attachTilt);
  }

  /* ---------------- Toast ---------------- */
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 3600);
  }

  /* ---------------- Booking Modal ---------------- */
  const modal = modalBackdrop ? modalBackdrop.querySelector('.modal') : null;
  let lastFocusedEl = null;

  function focusableEls() {
    if (!modal) return [];
    return Array.from(
      modal.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const els = focusableEls();
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(artistName) {
    if (modalArtistSelect && artistName) {
      const match = Array.from(modalArtistSelect.options).find((opt) => opt.value === artistName);
      if (match) modalArtistSelect.value = artistName;
    }
    lastFocusedEl = document.activeElement;
    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    const els = focusableEls();
    if (els.length) els[0].focus();
  }
  function closeModal() {
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
  }

  bookButtons.forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.dataset.artist));
  });
  const heroBookBtn = document.getElementById('heroBookBtn');
  if (heroBookBtn) heroBookBtn.addEventListener('click', () => openModal());
  const sidebarBookBtn = document.getElementById('sidebarBookBtn');
  if (sidebarBookBtn) sidebarBookBtn.addEventListener('click', () => openModal());

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (!modalBackdrop.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    else trapFocus(e);
  });

  /* ---------------- Modal Tabs: E-Mail vs. Telefon ---------------- */
  modalTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      modalTabs.forEach((t) => t.classList.toggle('active', t === tab));
      modalPanes.forEach((pane) => pane.classList.toggle('active', pane.dataset.pane === tab.dataset.tab));
    });
  });

  /* ---------------- Buchungsformular -> mailto ---------------- */
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(bookingForm);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const phone = (data.get('phone') || '').toString().trim();
      const artist = (data.get('artist') || '').toString().trim();
      const date = (data.get('date') || '').toString().trim();
      const message = (data.get('message') || '').toString().trim();

      const subject = `Terminanfrage — ${name || 'Neuer Gast'}`;
      const bodyLines = [
        `Name: ${name}`,
        `E-Mail: ${email}`,
        phone ? `Telefon: ${phone}` : null,
        `Wunsch-Artist: ${artist}`,
        date ? `Wunschtermin: ${date}` : null,
        '',
        'Nachricht / Idee:',
        message || '(keine Angabe)',
      ].filter(Boolean);

      const mailto = `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
      window.location.href = mailto;
      showToast('E-Mail-Programm wird geöffnet …');
      closeModal();
      bookingForm.reset();
    });
  }

  /* ---------------- Header-Schatten beim Scrollen (Sidebar-Akzent) ---------------- */
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    sidebar.style.boxShadow = y > 40
      ? '30px 0 60px -25px rgba(0,0,0,.8)'
      : '30px 0 60px -30px rgba(0,0,0,.6)';
    lastScroll = y;
  }, { passive: true });
})();
