/*
 * Browser-Demo-Fallback für "IT Schulungsmaßnahmen".
 *
 * In Electron stellt preload.js window.dashboardAPI bereit – dann tut dieses
 * Skript nichts. Wird die Oberfläche dagegen direkt im Browser geöffnet (ohne
 * Electron), fehlt window.dashboardAPI. Dann liefert dieses Skript ein Ersatz-
 * API: Daten werden im localStorage gespeichert, Screenshots per getDisplayMedia
 * aufgenommen und als Download gespeichert, der Datei-Dialog nutzt <input file>.
 */
(function () {
  if (window.dashboardAPI) return; // Electron: echtes API vorhanden

  // Markierung für andere Skripte (z. B. pwa-register.js), dass dies der
  // Browser-Fallback ist und kein echtes Electron-preload-API vorliegt.
  window.__isBrowserFallback = true;

  // Demo-Modus nur bei ?demo=1; sonst Vollversion (leerer Start, eigener Speicher).
  const isDemo = /(?:[?&])demo=1(?:&|$)/.test(location.search);
  const DATA_KEY = isDemo ? 'itschulung-demo-data' : 'itschulung-full-data';
  const SETTINGS_KEY = isDemo ? 'itschulung-demo-settings' : 'itschulung-full-settings';

  function relDate(offsetDays) {
    const dt = new Date();
    dt.setDate(dt.getDate() + offsetDays);
    return dt.toISOString().slice(0, 10);
  }

  function demoSeed() {
    return {
      dozenten: [
        {
          id: 'demo-mueller',
          name: 'Frau Müller (Java)',
          todos: [
            { id: 't1', text: 'Folien für Vererbung vorbereiten', done: false },
            { id: 't2', text: 'Quiz Woche 3 einsammeln', done: true }
          ],
          openProjects: [{ id: 'p1', text: 'Abschlussprojekt: To-Do-App', done: false }],
          doneProjects: [{ id: 'p2', text: 'Grundlagen-Modul', done: false }],
          chat: [{ id: 'c1', text: 'Willkommen im Java-Kurs!', time: '01.07. 09:00' }],
          homework: [
            {
              id: 'h1',
              author: 'Max Mustermann',
              text: 'Aufgabe 2: Klassen und Objekte',
              attachments: ['Aufgabe2.zip'],
              submittedAt: '05.07.2026, 18:20',
              feedback: 'Sehr gut gelöst, Getter/Setter noch ergänzen.',
              corrected: true,
              returnedAt: '06.07.2026, 08:15'
            },
            {
              id: 'h2',
              author: 'Erika Beispiel',
              text: 'Aufgabe 3: Vererbung',
              attachments: [],
              submittedAt: '10.07.2026, 20:05',
              feedback: '',
              corrected: false,
              returnedAt: null
            }
          ],
          exams: [
            { id: 'e1', title: 'Java-Zwischentest', date: relDate(3), time: '10:00' },
            { id: 'e2', title: 'Abschlussprüfung Java', date: relDate(21), time: '09:30' }
          ]
        },
        {
          id: 'demo-schmidt',
          name: 'Herr Schmidt (Netzwerke)',
          todos: [{ id: 't3', text: 'Lab: Subnetting vorbereiten', done: false }],
          openProjects: [{ id: 'p3', text: 'Projekt: Heimnetz planen', done: false }],
          doneProjects: [],
          chat: [],
          homework: [],
          exams: [{ id: 'e3', title: 'Test: OSI-Modell', date: relDate(7), time: '14:00' }]
        }
      ]
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignorieren */
    }
    // Vollversion startet leer; nur die Demo wird mit Beispieldaten befüllt.
    if (!isDemo) return { dozenten: [] };
    const seed = demoSeed();
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(seed));
    } catch (e) {
      /* ignorieren */
    }
    return seed;
  }

  async function captureScreen() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return null;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await new Promise((r) => requestAnimationFrame(r));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach((t) => t.stop());
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  function saveScreenshot(payload) {
    const dataUrl = payload && payload.dataUrl;
    if (!dataUrl) return Promise.resolve({ ok: false, reason: 'no-data' });
    const filename = `screenshot-${Date.now()}.png`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Google-Drive-Upload ist in der reinen Browser-Demo nicht verfügbar.
    return Promise.resolve({
      ok: true,
      filePath: '(Download) ' + filename,
      filename,
      drive: { ok: false, reason: 'browser' }
    });
  }

  function openFileDialog() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const files = input.files && input.files.length
          ? Array.from(input.files).map((f) => ({ path: f.name, name: f.name, size: f.size }))
          : [];
        input.remove();
        resolve({ canceled: files.length === 0, files });
      });
      input.click();
    });
  }

  window.dashboardAPI = {
    loadData: () => Promise.resolve(loadData()),
    saveData: (data) => {
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
      } catch (e) {
        /* ignorieren */
      }
      return Promise.resolve(true);
    },
    getSettings: () => {
      try {
        return Promise.resolve(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
      } catch (e) {
        return Promise.resolve({});
      }
    },
    saveSettings: (s) => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
      } catch (e) {
        /* ignorieren */
      }
      return Promise.resolve(true);
    },
    captureScreen,
    saveScreenshot,
    openFileDialog
  };

  // Kleiner Hinweisbanner (Demo oder Vollversion im Browser)
  window.addEventListener('DOMContentLoaded', () => {
    document.title = isDemo
      ? 'IT Schulungsmaßnahmen — Browser-Demo'
      : 'IT Schulungsmaßnahmen — Browser (Vollversion)';
    const banner = document.createElement('div');
    banner.textContent = isDemo
      ? 'Browser-Demo — Beispieldaten, lokal im Browser (localStorage) gespeichert. ' +
        'Screenshot nutzt die Bildschirmfreigabe; Google Drive ist hier nicht verfügbar.'
      : 'Browser-Version — Daten werden lokal im Browser (localStorage) gespeichert. ' +
        'Screenshot nutzt die Bildschirmfreigabe; Google Drive ist hier nicht verfügbar.';
    banner.style.cssText =
      'flex-shrink:0;background:#8c3b3b;color:#fff;font:13px "Segoe UI",Arial;' +
      'padding:6px 16px;text-align:center;';
    document.body.insertBefore(banner, document.body.firstChild);
  });
})();
