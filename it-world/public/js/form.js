// Öffentliches Anfrage-/Anmeldeformular (legt Leads im CRM an, löst den Autoresponder aus).
import { h, clear, socialLinks, icon } from './core.js';
import { logo3dStatic } from './logo.js';

const slug = location.pathname.split('/').filter(Boolean)[1] || '';
const form = document.getElementById('pf-form');
const msg = document.getElementById('pf-msg');

document.getElementById('pf-logo').appendChild(logo3dStatic('/img/logo-640.jpg'));

fetch(`/api/public/form/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : Promise.reject(r))).then((info) => {
  document.getElementById('pf-firma').textContent = `Anfrage an ${info.firma}`;
  document.getElementById('pf-zusatz').textContent = info.zusatz || '';
  document.title = `Anfrage · ${info.firma}`;
  const s = socialLinks(info.social, 18);
  if (s) document.getElementById('pf-social').appendChild(s);
}).catch(() => {
  clear(form).appendChild(h('p.error-box', icon('alert', 18), 'Dieses Formular existiert nicht.'));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const el = form.elements;
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  clear(msg);
  try {
    const res = await fetch(`/api/public/form/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-IT-World': '1' },
      body: JSON.stringify({
        name: el.name.value, firma: el.firma.value, email: el.email.value, telefon: el.telefon.value,
        interesse: el.interesse.value, nachricht: el.nachricht.value, website2: el.website2.value, einwilligung: el.einwilligung.checked,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.fehler || 'Senden fehlgeschlagen.');
    clear(form).appendChild(h('div.full.pf-ok', icon('check', 40), h('b', 'Vielen Dank für Ihre Anfrage!'), h('p.muted', 'Wir haben Ihre Nachricht erhalten und melden uns schnellstmöglich bei Ihnen.')));
  } catch (err) {
    btn.disabled = false;
    msg.appendChild(h('div.error-box', icon('alert', 18), err.message));
  }
});
