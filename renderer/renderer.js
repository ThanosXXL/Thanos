(function () {
  const COMPANY = {
    name: 'MyS!m',
    tagline: 'Tarifvergleich & Tarifangebote'
  };

  const TARIFE = [
    {
      name: 'Standard Tarif',
      preis: '6,89 € / Monat',
      accent: 'green',
      daten: '10 GB Datenvolumen mit 5G-Speed',
      telefonie: 'Flat Telefonieren ins deutsche Netz',
      netz: 'Telekom-Netz – deutschlandweit die beste Netzabdeckung',
      sim: 'SIM-Karte kostenlos inklusive',
      laufzeit: '24 Monate Laufzeit',
      vorteile: [
        'EU-Roaming inklusive',
        '5G ohne Aufpreis',
        'Nach Laufzeitende monatlich kündbar'
      ]
    },
    {
      name: 'Premium Tarif',
      preis: '12,89 € / Monat',
      accent: 'orange',
      daten: '20 GB Datenvolumen mit 5G-Speed',
      telefonie: 'Flat Telefonieren ins deutsche Netz',
      netz: 'Telekom-Netz – deutschlandweit die beste Netzabdeckung',
      sim: 'SIM-Karte kostenlos inklusive',
      laufzeit: '24 Monate Laufzeit',
      vorteile: [
        'EU-Roaming inklusive',
        '5G ohne Aufpreis',
        'Nach Laufzeitende monatlich kündbar'
      ]
    }
  ];

  const content = document.getElementById('content');

  function renderTarifePanel() {
    content.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'tarife-panel';

    const companyHeader = document.createElement('div');
    companyHeader.className = 'company-header';
    const companyName = document.createElement('h2');
    companyName.className = 'company-name';
    companyName.textContent = COMPANY.name;
    const companyTagline = document.createElement('p');
    companyTagline.className = 'company-tagline';
    companyTagline.textContent = COMPANY.tagline;
    companyHeader.appendChild(companyName);
    companyHeader.appendChild(companyTagline);
    panel.appendChild(companyHeader);

    const heading = document.createElement('h2');
    heading.textContent = 'Tarifvorschläge – Handyvertrag mit Surfen & Telefonieren';
    panel.appendChild(heading);

    const intro = document.createElement('p');
    intro.className = 'tarife-intro';
    intro.textContent = 'Zwei Tarifvorschläge inklusive SIM-Karte und stabilem Netz zur Auswahl:';
    panel.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'tarife-grid';

    TARIFE.forEach((tarif) => {
      const card = document.createElement('div');
      card.className = 'tarif-card accent-' + tarif.accent;

      const name = document.createElement('h3');
      name.textContent = tarif.name;
      card.appendChild(name);

      const preis = document.createElement('div');
      preis.className = 'tarif-preis';
      preis.textContent = tarif.preis;
      card.appendChild(preis);

      const details = document.createElement('ul');
      details.className = 'tarif-details';
      [tarif.daten, tarif.telefonie, tarif.netz, tarif.sim, tarif.laufzeit].forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        details.appendChild(li);
      });
      card.appendChild(details);

      const vorteileHeading = document.createElement('h4');
      vorteileHeading.textContent = 'Vorteile';
      card.appendChild(vorteileHeading);

      const vorteile = document.createElement('ul');
      vorteile.className = 'tarif-vorteile';
      tarif.vorteile.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        vorteile.appendChild(li);
      });
      card.appendChild(vorteile);

      grid.appendChild(card);
    });

    panel.appendChild(grid);
    content.appendChild(panel);
  }

  renderTarifePanel();
})();
