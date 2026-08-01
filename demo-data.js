// Beispieldaten für den Demo-Modus (electron . --demo).
// Wird nur verwendet, wenn noch keine Demo-Datendatei existiert.

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getDemoSeed() {
  const now = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    inventar: [
      {
        id: uid(),
        geraet: 'Laptop',
        hersteller: 'Dell',
        zustand: 'OVP',
        stueckzahl: 8,
        photo: null,
        ausgaben: []
      },
      {
        id: uid(),
        geraet: 'Beamer',
        hersteller: 'Epson',
        zustand: 'Gebraucht',
        stueckzahl: 2,
        photo: null,
        ausgaben: [{ id: uid(), menge: 2, empfaenger: 'Max Mustermann', datum: now }]
      },
      {
        id: uid(),
        geraet: 'Tastatur',
        hersteller: 'Logitech',
        zustand: 'OVP',
        stueckzahl: 15,
        photo: null,
        ausgaben: []
      },
      {
        id: uid(),
        geraet: 'Smartphone',
        hersteller: 'Samsung',
        zustand: 'Gebraucht',
        stueckzahl: 1,
        photo: null,
        ausgaben: []
      }
    ]
  };
}

module.exports = { getDemoSeed };
