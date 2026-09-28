// Anmeldeseite: Formular, Demo-Zugänge, 3D-Globus
(function () {
  'use strict';
  const form = document.getElementById('loginForm');
  const err = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const ROLE_LABEL = { admin: 'Administrator', ops: 'Operations', viewer: 'Nur Lesen' };

  window.ITWGlobe.mount(document.getElementById('globe'), { speed: 8 });

  function showError(msg) { err.textContent = msg; err.classList.remove('hidden'); }

  fetch('/api/config').then(r => r.json()).then(cfg => {
    if (!cfg.demo || !cfg.demoAccounts.length) return;
    const list = document.getElementById('demoList');
    for (const a of cfg.demoAccounts) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'demo-item';
      const left = document.createElement('div');
      const role = document.createElement('div'); role.textContent = ROLE_LABEL[a.role] || a.role; role.style.fontWeight = '600';
      const mail = document.createElement('div'); mail.className = 'mail'; mail.textContent = a.email;
      left.append(role, mail);
      const pill = document.createElement('span'); pill.className = 'pill gold'; pill.textContent = 'Einsetzen';
      b.append(left, pill);
      b.addEventListener('click', () => { form.email.value = a.email; form.password.value = a.password; form.password.focus(); });
      list.append(b);
    }
    document.getElementById('demoBox').classList.remove('hidden');
  }).catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.add('hidden');
    if (!form.email.value || !form.password.value) return showError('Bitte E-Mail und Passwort eingeben.');
    btn.disabled = true; btn.textContent = 'Anmelden …';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'IT-World' },
        body: JSON.stringify({ email: form.email.value, password: form.password.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Anmeldung fehlgeschlagen.');
      location.href = '/';
    } catch (ex) {
      showError(ex.message);
      btn.disabled = false; btn.textContent = 'Anmelden';
    }
  });
})();
