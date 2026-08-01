// Browser-Demo-Shim: ersetzt window.dashboardAPI (normalerweise von preload.js über
// Electron IPC bereitgestellt) durch eine Version, die im localStorage des Browsers
// speichert. So läuft renderer.js unverändert auch außerhalb von Electron.
// KEINE echte Datenspeicherung – alles bleibt lokal im Browser dieses Tabs/Geräts.
(function () {
  window.__DASHBOARD_DEMO__ = true;

  const STORAGE_KEY = 'dozentenDashboardDemoState';

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
      dozenten: [
        {
          id: uid(),
          name: 'Frau Bergmann',
          todos: [
            { id: uid(), text: 'Foliensatz Kapitel 4 überarbeiten', done: false },
            { id: uid(), text: 'Rückmeldungen der Teilnehmer sichten', done: true }
          ],
          openProjects: [{ id: uid(), text: 'Praxisworkshop "Datenanalyse" planen', done: false }],
          doneProjects: [{ id: uid(), text: 'Einführungskurs Q1 abgeschlossen', done: false }],
          chat: [{ id: uid(), text: 'Materialien liegen im gemeinsamen Ordner bereit.', time: now }]
        },
        {
          id: uid(),
          name: 'Herr Keller',
          todos: [{ id: uid(), text: 'Raumbuchung für nächste Woche prüfen', done: false }],
          openProjects: [{ id: uid(), text: 'Zertifikatskurs Netzwerktechnik', done: false }],
          doneProjects: [],
          chat: []
        }
      ],
      inventar: [
        { id: uid(), geraet: 'Laptop', hersteller: 'Dell', zustand: 'OVP', stueckzahl: 8, photo: null, ausgaben: [] },
        {
          id: uid(),
          geraet: 'Beamer',
          hersteller: 'Epson',
          zustand: 'Gebraucht',
          stueckzahl: 2,
          photo: null,
          ausgaben: [{ id: uid(), menge: 2, empfaenger: 'Max Mustermann', datum: now }]
        },
        { id: uid(), geraet: 'Tastatur', hersteller: 'Logitech', zustand: 'OVP', stueckzahl: 15, photo: null, ausgaben: [] },
        { id: uid(), geraet: 'Smartphone', hersteller: 'Samsung', zustand: 'Gebraucht', stueckzahl: 1, photo: null, ausgaben: [] }
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
