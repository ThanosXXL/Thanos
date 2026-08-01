// Browser-Demo-Shim für die reine Inventar-Demo (kein Dozenten-Modus).
// Ersetzt window.dashboardAPI wie demo-shim.js, speichert aber unter einem eigenen
// localStorage-Schlüssel und seedet ausschließlich Inventar-Beispieldaten
// (dozenten bleibt absichtlich leer, die Dozenten-Ansicht wird nie angezeigt).
(function () {
  window.__DASHBOARD_DEMO__ = true;

  const STORAGE_KEY = 'dozentenDashboardDemoInventarState';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function seedState() {
    const now = new Date().toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      dozenten: [],
      inventar: [
        { id: uid(), geraet: 'Laptop', hersteller: 'Dell', zustand: 'OVP', stueckzahl: 8, photo: null, ausgaben: [], nachbestellungen: [] },
        {
          id: uid(),
          geraet: 'Beamer',
          hersteller: 'Epson',
          zustand: 'Gebraucht',
          stueckzahl: 2,
          photo: null,
          ausgaben: [{ id: uid(), menge: 2, empfaenger: 'Max Mustermann', datum: now }],
          nachbestellungen: []
        },
        { id: uid(), geraet: 'Tastatur', hersteller: 'Logitech', zustand: 'OVP', stueckzahl: 15, photo: null, ausgaben: [], nachbestellungen: [] },
        { id: uid(), geraet: 'Smartphone', hersteller: 'Samsung', zustand: 'Gebraucht', stueckzahl: 1, photo: null, ausgaben: [], nachbestellungen: [] }
      ]
    };
  }

  window.dashboardAPI = {
    loadData: () =>
      Promise.resolve().then(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch (err) {
            /* fällt durch auf Beispieldaten */
          }
        }
        const seed = seedState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }),
    saveData: (data) =>
      Promise.resolve().then(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      })
  };
})();
