// Sperrbildschirm, automatische Sperre bei Inaktivität und Schnellsuche (Strg/⌘ + K).
(function () {
  'use strict';
  const App = window.App;
  const { h } = App;

  // ---------- Sperrbildschirm ----------

  App.actions.showLock = function () {
    if (App.ui.locked) return;
    App.ui.locked = true;
    App.closeModal();
    App.state = App.emptyState(); // Daten aus dem Arbeitsspeicher der Oberfläche entfernen
    document.getElementById('app').hidden = true;
    const root = document.getElementById('lock-root');
    root.textContent = '';

    const pw = h('input', { type: 'password', autocomplete: 'current-password', maxlength: '256', 'aria-label': 'Passwort', placeholder: 'Passwort', 'data-autofocus': '' });
    const msg = h('p', { class: 'form-error', role: 'alert' });
    const btn = h('button', { class: 'btn', type: 'button' }, '🔓 Entsperren');
    let timer = null;

    const wait = (ms) => {
      clearInterval(timer);
      const until = Date.now() + ms;
      btn.disabled = true;
      timer = setInterval(() => {
        const left = Math.ceil((until - Date.now()) / 1000);
        if (left <= 0) { clearInterval(timer); btn.disabled = false; msg.textContent = ''; pw.focus(); }
        else msg.textContent = `Zu viele Fehlversuche. Bitte in ${left} Sekunden erneut versuchen.`;
      }, 250);
    };

    const submit = async () => {
      if (btn.disabled || !pw.value) return;
      btn.disabled = true;
      msg.textContent = '';
      try {
        const r = await App.api.unlock(pw.value);
        if (r.ok) {
          pw.value = '';
          clearInterval(timer);
          App.touch();
          await App.afterUnlock(r.data);
          return;
        }
        msg.textContent = r.message || 'Passwort falsch.';
        pw.select();
        if (r.waitMs > 0) wait(r.waitMs); else btn.disabled = false;
      } catch (err) {
        msg.textContent = App.cleanErr(err);
        btn.disabled = false;
      }
    };
    btn.addEventListener('click', submit);
    pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

    root.appendChild(h('div', { class: 'lock-screen' },
      h('div', { class: 'lock-card card' },
        h('img', { class: 'lock-logo', src: 'assets/logo.png', alt: 'IT-WORLD – IT Solutions' }),
        h('div', { class: 'brand-tag', style: 'font-size:16px;margin-bottom:14px' }, 'IT Solutions'),
        h('h2', { class: 'card-title', style: 'text-align:center' }, 'Compliance-Assistent gesperrt'),
        h('p', { class: 'card-sub', style: 'text-align:center' }, 'Geben Sie Ihr Passwort ein, um die verschlüsselten Daten zu öffnen.'),
        pw, msg,
        h('div', { class: 'btn-row', style: 'justify-content:center;margin-top:14px' }, btn))));
    pw.focus();
    App.api.vaultStatus().then((st) => { if (st.waitMs > 0) wait(st.waitMs); }).catch(() => {});
  };

  App.actions.lockLocal = App.actions.showLock;

  App.actions.lock = async function () {
    if (!App.vault.encrypted) {
      App.toast('Aktivieren Sie zuerst die Verschlüsselung unter „Sicherheit & Datenschutz“.', true);
      App.go('sicherheit');
      return;
    }
    try {
      await App.api.lock();
      App.actions.showLock();
    } catch (err) { App.toast(App.cleanErr(err), true); }
  };

  // ---------- Automatische Sperre ----------

  let last = Date.now();
  App.touch = () => { last = Date.now(); };
  App.actions.restartIdle = App.touch;
  ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, App.touch, true));
  setInterval(() => {
    if (App.ui.locked || !App.vault.encrypted) return;
    const m = App.state.einstellungen.autoLockMin;
    if (m > 0 && Date.now() - last > m * 60000) App.actions.lock();
  }, 10000);

  // ---------- Schnellsuche ----------

  function buildIndex() {
    const out = [];
    for (const v of App.views) out.push({ label: v.label, sub: 'Ansicht · ' + v.group, hay: `${v.label} ${v.titel} ${v.sub || ''}`.toLowerCase(), run: () => App.go(v.id) });
    for (const fw of App.C.FRAMEWORKS) {
      for (const it of App.allItems(fw)) {
        out.push({ label: it.text, sub: `${fw.name} · ${it.ref}`, hay: `${it.text} ${it.ref} ${it.hilfe} ${it.nachweise}`.toLowerCase(), run: () => { App.go(fw.id); App.openItemModal(fw, it); } });
      }
    }
    for (const key of ['vvt', 'dienstleister', 'anfragen', 'schulungen']) {
      const reg = App.S.REGISTER[key];
      for (const r of App.state[key]) {
        out.push({ label: App.recTitle(reg, r), sub: reg.titel, hay: reg.fields.map((f) => r[f.k]).filter((x) => typeof x === 'string').join(' ').toLowerCase(), run: () => App.go(key) });
      }
    }
    for (const v of App.state.vorfaelle) out.push({ label: v.titel, sub: 'Vorfall', hay: `${v.titel} ${v.beschreibung}`.toLowerCase(), run: () => App.go('vorfaelle') });
    for (const t of window.VORLAGEN) out.push({ label: t.titel, sub: 'Vorlage · ' + t.gruppe, hay: `${t.titel} ${t.text}`.toLowerCase(), run: () => App.go('vorlagen') });
    return out;
  }

  // Strg/⌘ + K direkt in der Oberfläche (zusätzlich zum Menükürzel; ein zweites Öffnen ersetzt nur den Dialog).
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      App.actions.search();
    }
  });

  App.actions.search = function () {
    if (App.ui.locked) return;
    const index = buildIndex();
    App.openModal((modal, close) => {
      const input = h('input', { type: 'search', placeholder: 'Anforderung, Vorlage, Eintrag oder Ansicht suchen …', autocomplete: 'off', 'aria-label': 'Suche', 'data-autofocus': '' });
      const list = h('div', { class: 'palette-list', role: 'listbox' });
      let results = [];
      let sel = 0;
      const draw = () => {
        list.textContent = '';
        if (!results.length) { list.appendChild(h('div', { class: 'empty' }, input.value ? 'Keine Treffer.' : 'Tippen Sie, um zu suchen.')); return; }
        results.forEach((r, i) => list.appendChild(h('div', {
          class: 'palette-row' + (i === sel ? ' sel' : ''), role: 'option', 'aria-selected': i === sel ? 'true' : 'false',
          onmousemove: () => { if (sel !== i) { sel = i; draw(); } },
          onclick: () => { close(true); r.run(); }
        }, h('div', null, r.label), h('div', { class: 'sub' }, r.sub))));
      };
      const search = () => {
        const tokens = input.value.toLowerCase().split(/\s+/).filter(Boolean);
        sel = 0;
        if (!tokens.length) { results = index.filter((x) => x.sub.startsWith('Ansicht')).slice(0, 14); draw(); return; }
        results = index
          .filter((x) => tokens.every((t) => x.hay.includes(t) || x.label.toLowerCase().includes(t)))
          .map((x) => ({ x, s: x.label.toLowerCase().startsWith(tokens[0]) ? 0 : x.label.toLowerCase().includes(tokens[0]) ? 1 : 2 }))
          .sort((a, b) => a.s - b.s).slice(0, 14).map((o) => o.x);
        draw();
      };
      input.addEventListener('input', search);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); draw(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
        else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); close(true); results[sel].run(); }
      });
      modal.classList.add('palette');
      modal.appendChild(input);
      modal.appendChild(list);
      search();
    });
  };
})();
