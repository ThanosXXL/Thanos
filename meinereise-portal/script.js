(function () {
  "use strict";

  var CATEGORY_INFO = {
    flug: {
      fromLabel: "Abflugort",
      toLabel: "Landeort",
      fromPlaceholder: "z. B. Frankfurt",
      toPlaceholder: "z. B. Palma de Mallorca",
      heroSub: "Finde die besten Flugangebote im Vergleich – schnell, transparent, günstig."
    },
    hotel: {
      fromLabel: "Startort",
      toLabel: "Zielort / Hotel",
      fromPlaceholder: "z. B. München",
      toPlaceholder: "z. B. Kreta",
      heroSub: "Vergleiche Hotels, Ferienhäuser und Wohnungen für deinen nächsten Urlaub."
    },
    mietwagen: {
      fromLabel: "Abholort",
      toLabel: "Rückgabeort",
      fromPlaceholder: "z. B. Flughafen Berlin",
      toPlaceholder: "z. B. Flughafen Berlin",
      heroSub: "Finde den passenden Mietwagen zum besten Preis."
    },
    hundepension: {
      fromLabel: "Wohnort",
      toLabel: "Hundepension",
      fromPlaceholder: "z. B. München",
      toPlaceholder: "z. B. Hundepension Alpenblick",
      heroSub: "Vergleiche liebevolle Hundepensionen für die Betreuung deines Vierbeiners."
    },
    kreuzfahrt: {
      fromLabel: "Abfahrtshafen",
      toLabel: "Zielregion",
      fromPlaceholder: "z. B. Hamburg",
      toPlaceholder: "z. B. Mittelmeer",
      heroSub: "Entdecke Kreuzfahrten rund um die Welt im direkten Vergleich."
    },
    seefahrt: {
      fromLabel: "Starthafen",
      toLabel: "Zielhafen",
      fromPlaceholder: "z. B. Rostock",
      toPlaceholder: "z. B. Rügen",
      heroSub: "Inländische Seefahrten und Fähr-Angebote entspannt vergleichen."
    },
    kurztrip: {
      fromLabel: "Abflugort",
      toLabel: "Zielort",
      fromPlaceholder: "z. B. Köln",
      toPlaceholder: "z. B. Prag",
      heroSub: "Kurztrips für 2 bis 5 Tage – ideal für ein spontanes Wochenende."
    }
  };

  var DESTINATIONS = [
    "Deutschland", "Österreich", "Schweiz", "Liechtenstein", "Luxemburg", "Belgien", "Niederlande",
    "Frankreich", "Spanien", "Portugal", "Italien", "Vatikanstadt", "San Marino", "Monaco", "Andorra",
    "Vereinigtes Königreich", "Irland", "Island", "Dänemark", "Norwegen", "Schweden", "Finnland",
    "Polen", "Tschechien", "Slowakei", "Ungarn", "Slowenien", "Kroatien", "Bosnien und Herzegowina",
    "Serbien", "Montenegro", "Nordmazedonien", "Albanien", "Kosovo", "Griechenland", "Bulgarien",
    "Rumänien", "Moldau", "Ukraine", "Weißrussland", "Litauen", "Lettland", "Estland", "Russland",
    "Türkei", "Zypern", "Malta", "Georgien", "Armenien", "Aserbaidschan",
    "USA", "Kanada", "Mexiko", "Kuba", "Jamaika", "Bahamas", "Dominikanische Republik", "Haiti",
    "Costa Rica", "Panama", "Guatemala", "Belize", "Honduras", "El Salvador", "Nicaragua",
    "Kolumbien", "Venezuela", "Ecuador", "Peru", "Bolivien", "Brasilien", "Chile", "Argentinien",
    "Uruguay", "Paraguay", "Guyana", "Suriname",
    "Marokko", "Algerien", "Tunesien", "Libyen", "Ägypten", "Sudan", "Äthiopien", "Kenia", "Tansania",
    "Uganda", "Ruanda", "Somalia", "Nigeria", "Ghana", "Senegal", "Elfenbeinküste", "Kamerun",
    "Kongo", "Angola", "Namibia", "Botswana", "Simbabwe", "Sambia", "Mosambik", "Südafrika",
    "Madagaskar", "Mauritius", "Seychellen", "Kap Verde", "Sansibar",
    "China", "Japan", "Südkorea", "Nordkorea", "Mongolei", "Taiwan", "Hongkong", "Vietnam", "Laos",
    "Kambodscha", "Thailand", "Myanmar", "Malaysia", "Singapur", "Indonesien", "Philippinen",
    "Brunei", "Osttimor", "Indien", "Pakistan", "Bangladesch", "Sri Lanka", "Nepal", "Bhutan",
    "Malediven", "Afghanistan", "Iran", "Irak", "Saudi-Arabien", "Vereinigte Arabische Emirate",
    "Dubai", "Abu Dhabi", "Katar", "Kuwait", "Bahrain", "Oman", "Jemen", "Jordanien", "Libanon",
    "Israel", "Syrien", "Kasachstan", "Usbekistan", "Turkmenistan", "Tadschikistan", "Kirgisistan",
    "Australien", "Neuseeland", "Fidschi", "Papua-Neuguinea", "Samoa", "Tonga", "Vanuatu",
    "Palau", "Salomonen",
    "Malediven-Inseln", "Bali", "Lombok", "Phuket", "Koh Samui", "Boracay", "Palawan", "Hawaii",
    "Bora Bora", "Tahiti", "Seychellen-Inseln", "Sansibar-Insel",
    "Mallorca", "Ibiza", "Menorca", "Formentera", "Kanarische Inseln", "Teneriffa", "Gran Canaria",
    "Fuerteventura", "Lanzarote", "La Palma", "Azoren", "Madeira",
    "Sizilien", "Sardinien", "Elba", "Capri", "Kreta", "Rhodos", "Korfu", "Santorin", "Mykonos",
    "Zakynthos", "Kos",
    "Barbados", "Aruba", "Curaçao", "Trinidad und Tobago", "Grenada", "St. Lucia", "Martinique",
    "Guadeloupe", "Puerto Rico"
  ];

  var OFFERS = [
    { cat: "flug", iconKey: "plane", title: "Frankfurt → Palma de Mallorca", meta: "Direktflug · 2h 20min", tags: [], price: 89, rating: 5 },
    { cat: "hotel", iconKey: "hotel", title: "Strandresort Playa Azul", meta: "Kreta · 300 m zum Strand", tags: ["pool", "wohnung", "strand"], price: 74, rating: 5, beachKm: 0.3 },
    { cat: "hotel", iconKey: "house", title: "Ferienhaus Casa Mint", meta: "Algarve · 800 m zum Strand", tags: ["pool", "haus", "strand"], price: 96, rating: 4, beachKm: 0.8 },
    { cat: "mietwagen", iconKey: "car", title: "Kompaktklasse Cabrio", meta: "Flughafen Palma · Automatik", tags: [], price: 32, rating: 4 },
    { cat: "hundepension", iconKey: "dog", title: "Hundepension Alpenblick", meta: "München · Garten & Auslauf", tags: ["haus"], price: 28, rating: 5 },
    { cat: "hundepension", iconKey: "dog", title: "Hundehotel Wedelwald", meta: "Schwarzwald · Rudelbetreuung", tags: ["haus", "pool"], price: 35, rating: 4 },
    { cat: "kreuzfahrt", iconKey: "ship", title: "7 Tage Mittelmeer-Route", meta: "Ab Barcelona · Vollpension", tags: ["pool"], price: 549, rating: 5 },
    { cat: "seefahrt", iconKey: "ferry", title: "Fähre Rostock – Rügen", meta: "Tagesausflug · Sonnendeck", tags: [], price: 19, rating: 4 },
    { cat: "kurztrip", iconKey: "palm", title: "3 Tage Städtetrip Prag", meta: "Kurztrip · inkl. Frühstück", tags: ["wohnung"], price: 129, rating: 4 },
    { cat: "hotel", iconKey: "apartment", title: "City Apartment Lissabon", meta: "Zentrum · 4,5 km zum Strand", tags: ["wohnung", "strand"], price: 65, rating: 4, beachKm: 4.5 },
    { cat: "kurztrip", iconKey: "palm", title: "2 Tage Wellness Bodensee", meta: "Kurztrip · Spa inklusive", tags: ["pool", "haus"], price: 149, rating: 5 }
  ];

  var ICONS = {
    plane:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<polygon points="4,34 60,10 34,60 28,40" fill="url(#gradBlue)"/>' +
      '<polygon points="4,34 28,40 20,52" fill="url(#gradSky)"/>' +
      '<polygon points="28,40 34,60 40,44" fill="url(#gradDeep)" opacity="0.85"/>' +
      '</g></svg>',
    hotel:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<rect x="26" y="8" width="12" height="14" fill="url(#gradWarm)"/>' +
      '<rect x="10" y="20" width="44" height="36" rx="4" fill="url(#gradSky)"/>' +
      '<rect x="10" y="20" width="44" height="10" rx="4" fill="url(#gradDeep)"/>' +
      '<rect x="18" y="34" width="8" height="8" rx="1" fill="url(#gradWhite)"/>' +
      '<rect x="30" y="34" width="8" height="8" rx="1" fill="url(#gradWhite)"/>' +
      '<rect x="42" y="34" width="6" height="8" rx="1" fill="url(#gradWhite)"/>' +
      '<rect x="18" y="46" width="8" height="8" rx="1" fill="url(#gradWhite)"/>' +
      '<rect x="30" y="46" width="8" height="8" rx="1" fill="url(#gradWhite)"/>' +
      '</g></svg>',
    house:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<polygon points="32,8 56,28 8,28" fill="url(#gradWarm)"/>' +
      '<rect x="14" y="28" width="36" height="28" fill="url(#gradSky)"/>' +
      '<rect x="27" y="40" width="10" height="16" fill="url(#gradDeep)"/>' +
      '<rect x="18" y="34" width="8" height="8" fill="url(#gradWhite)"/>' +
      '<rect x="38" y="34" width="8" height="8" fill="url(#gradWhite)"/>' +
      '</g></svg>',
    apartment:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<rect x="16" y="6" width="32" height="52" rx="3" fill="url(#gradSky)"/>' +
      '<rect x="22" y="12" width="7" height="7" fill="url(#gradWhite)"/>' +
      '<rect x="35" y="12" width="7" height="7" fill="url(#gradWhite)"/>' +
      '<rect x="22" y="23" width="7" height="7" fill="url(#gradWhite)"/>' +
      '<rect x="35" y="23" width="7" height="7" fill="url(#gradWhite)"/>' +
      '<rect x="22" y="34" width="7" height="7" fill="url(#gradWhite)"/>' +
      '<rect x="35" y="34" width="7" height="7" fill="url(#gradWhite)"/>' +
      '<rect x="26" y="47" width="12" height="11" fill="url(#gradDeep)"/>' +
      '</g></svg>',
    car:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<path d="M16 34 Q22 20 30 20 L38 20 Q44 20 48 34 Z" fill="url(#gradRed)"/>' +
      '<rect x="8" y="34" width="48" height="14" rx="6" fill="url(#gradRed)"/>' +
      '<rect x="20" y="24" width="24" height="10" rx="3" fill="url(#gradWhite)" opacity="0.9"/>' +
      '<circle cx="20" cy="50" r="7" fill="url(#gradDeep)"/>' +
      '<circle cx="44" cy="50" r="7" fill="url(#gradDeep)"/>' +
      '</g></svg>',
    dog:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<ellipse cx="32" cy="44" rx="15" ry="11" fill="url(#gradBrown)"/>' +
      '<ellipse cx="15" cy="30" rx="6" ry="8" fill="url(#gradBrown)" transform="rotate(-20 15 30)"/>' +
      '<ellipse cx="27" cy="18" rx="6" ry="8" fill="url(#gradBrown)" transform="rotate(-8 27 18)"/>' +
      '<ellipse cx="40" cy="18" rx="6" ry="8" fill="url(#gradBrown)" transform="rotate(8 40 18)"/>' +
      '<ellipse cx="51" cy="30" rx="6" ry="8" fill="url(#gradBrown)" transform="rotate(20 51 30)"/>' +
      '</g></svg>',
    ship:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<path d="M6 44 L58 44 L49 58 L15 58 Z" fill="url(#gradWhite)"/>' +
      '<rect x="16" y="30" width="32" height="16" rx="2" fill="url(#gradBlue)"/>' +
      '<rect x="22" y="18" width="20" height="13" rx="2" fill="url(#gradWhite)"/>' +
      '<rect x="29" y="6" width="6" height="13" fill="url(#gradRed)"/>' +
      '</g></svg>',
    ferry:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<path d="M10 40 L54 40 L46 54 L18 54 Z" fill="url(#gradSky)"/>' +
      '<rect x="22" y="24" width="20" height="16" fill="url(#gradWhite)"/>' +
      '<rect x="30" y="12" width="4" height="14" fill="url(#gradDeep)"/>' +
      '<polygon points="34,12 46,18 34,20" fill="url(#gradWarm)"/>' +
      '</g></svg>',
    palm:
      '<svg viewBox="0 0 64 64"><g filter="url(#glossyShadow)">' +
      '<path d="M32 58 C30 40 30 28 34 14" stroke="url(#gradBrown)" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="34" cy="12" rx="14" ry="7" fill="url(#gradGreen)" transform="rotate(-25 34 12)"/>' +
      '<ellipse cx="34" cy="12" rx="14" ry="7" fill="url(#gradGreen)" transform="rotate(25 34 12)"/>' +
      '<ellipse cx="34" cy="12" rx="16" ry="6" fill="url(#gradGreen)"/>' +
      '<ellipse cx="34" cy="12" rx="10" ry="6" fill="url(#gradGreen)" transform="rotate(-58 34 12)"/>' +
      '<ellipse cx="34" cy="12" rx="10" ry="6" fill="url(#gradGreen)" transform="rotate(58 34 12)"/>' +
      '</g></svg>'
  };

  var state = {
    category: "flug",
    filters: [],
    beachMax: 10,
    priceMin: 0,
    priceMax: 100000,
    adults: 2,
    children: 0,
    sort: "empfehlung"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function stars(count) {
    return "★★★★★".slice(0, count) + "☆☆☆☆☆".slice(0, 5 - count);
  }

  function populateDestinations() {
    var datalist = $("citySuggestions");
    datalist.textContent = "";
    DESTINATIONS.forEach(function (name) {
      var option = document.createElement("option");
      option.value = name;
      datalist.appendChild(option);
    });
  }

  function renderOffers() {
    var grid = $("offersGrid");
    grid.textContent = "";

    var matches = OFFERS.filter(function (offer) {
      if (offer.cat !== state.category) return false;
      for (var i = 0; i < state.filters.length; i++) {
        var f = state.filters[i];
        if (f === "strand") continue;
        if (offer.tags.indexOf(f) === -1) return false;
      }
      if (state.filters.indexOf("strand") !== -1 && offer.tags.indexOf("strand") === -1) {
        return false;
      }
      if (offer.beachKm !== undefined && offer.beachKm > state.beachMax) {
        return false;
      }
      if (offer.price < state.priceMin || offer.price > state.priceMax) {
        return false;
      }
      return true;
    });

    var count = $("offersCount");
    count.textContent = matches.length + (matches.length === 1 ? " Angebot gefunden" : " Angebote gefunden");

    if (matches.length === 0) {
      var empty = document.createElement("p");
      empty.textContent = "Keine Angebote für diese Auswahl gefunden. Passe Filter oder Reisekategorie an.";
      grid.appendChild(empty);
      return;
    }

    var bestPrice = Math.min.apply(null, matches.map(function (o) { return o.price; }));

    var sorted = matches.slice();
    if (state.sort === "guenstig") {
      sorted.sort(function (a, b) { return a.price - b.price; });
    } else if (state.sort === "teuer") {
      sorted.sort(function (a, b) { return b.price - a.price; });
    }

    sorted.forEach(function (offer) {
      grid.appendChild(buildOfferCard(offer, offer.price === bestPrice));
    });
  }

  function buildOfferCard(offer, isBestPrice) {
    var card = document.createElement("div");
    card.className = "offer-card";

    var image = document.createElement("div");
    image.className = "offer-image";
    image.style.background = "linear-gradient(135deg, #3fe0c0, #0c8f74)";

    var badge = document.createElement("span");
    badge.className = "offer-badge";
    badge.textContent = offer.cat;
    image.appendChild(badge);

    if (isBestPrice) {
      var bestBadge = document.createElement("span");
      bestBadge.className = "offer-badge offer-badge-best";
      bestBadge.textContent = "🏆 Bester Preis";
      image.appendChild(bestBadge);
    }

    var globe = document.createElement("div");
    globe.className = "bg-globe";
    image.appendChild(globe);

    var icon = document.createElement("span");
    icon.className = "icon-3d";
    icon.innerHTML = ICONS[offer.iconKey] || "";
    image.appendChild(icon);

    card.appendChild(image);

    var body = document.createElement("div");
    body.className = "offer-body";

    var title = document.createElement("div");
    title.className = "offer-title";
    title.textContent = offer.title;
    body.appendChild(title);

    var meta = document.createElement("div");
    meta.className = "offer-meta";
    meta.textContent = offer.meta;
    body.appendChild(meta);

    if (offer.tags.length > 0) {
      var tagsRow = document.createElement("div");
      tagsRow.className = "offer-tags";
      offer.tags.forEach(function (tag) {
        var tagLabels = { pool: "Swimmingpool", haus: "Haus", wohnung: "Wohnung", strand: "Strandnähe" };
        var tagEl = document.createElement("span");
        tagEl.className = "offer-tag";
        tagEl.textContent = tagLabels[tag] || tag;
        tagsRow.appendChild(tagEl);
      });
      body.appendChild(tagsRow);
    }

    var rating = document.createElement("div");
    rating.className = "offer-rating";
    rating.textContent = stars(offer.rating);
    body.appendChild(rating);

    card.appendChild(body);

    var side = document.createElement("div");
    side.className = "offer-side";

    var price = document.createElement("div");
    price.className = "offer-price";
    price.textContent = "ab " + offer.price + " € ";
    var perPerson = document.createElement("span");
    perPerson.textContent = "/ Person";
    price.appendChild(perPerson);
    side.appendChild(price);

    var bookBtn = document.createElement("button");
    bookBtn.type = "button";
    bookBtn.className = "action-btn book-btn";
    bookBtn.textContent = "✅ Jetzt buchen";
    bookBtn.addEventListener("click", function () {
      openBookingModal(offer);
    });
    side.appendChild(bookBtn);

    var actions = document.createElement("div");
    actions.className = "offer-actions";

    var chatBtn = document.createElement("button");
    chatBtn.type = "button";
    chatBtn.className = "action-btn chat-btn";
    chatBtn.textContent = "💬 Chat";
    chatBtn.addEventListener("click", function () {
      openChatModal(offer);
    });
    actions.appendChild(chatBtn);

    var feedbackBtn = document.createElement("button");
    feedbackBtn.type = "button";
    feedbackBtn.className = "action-btn feedback-btn";
    feedbackBtn.textContent = "⭐";
    feedbackBtn.addEventListener("click", function () {
      openFeedbackModal(offer);
    });
    actions.appendChild(feedbackBtn);

    side.appendChild(actions);
    card.appendChild(side);

    return card;
  }

  function openModal() {
    $("modalOverlay").classList.add("open");
  }

  function closeModal() {
    $("modalOverlay").classList.remove("open");
  }

  function openChatModal(offer) {
    var content = $("modalContent");
    content.textContent = "";

    var heading = document.createElement("h3");
    heading.textContent = "Chat mit Anbieter · " + offer.title;
    content.appendChild(heading);

    var log = document.createElement("div");
    log.className = "chat-log";
    var welcomeMsg = document.createElement("p");
    welcomeMsg.textContent = "Anbieter: Hallo! Wie kann ich dir zu diesem Angebot helfen?";
    log.appendChild(welcomeMsg);
    content.appendChild(log);

    var row = document.createElement("div");
    row.className = "chat-input-row";

    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Nachricht eingeben …";
    row.appendChild(input);

    var sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.textContent = "Senden";
    row.appendChild(sendBtn);

    function sendMessage() {
      var text = input.value.trim();
      if (!text) return;
      var msg = document.createElement("p");
      msg.textContent = "Du: " + text;
      log.appendChild(msg);
      input.value = "";
      log.scrollTop = log.scrollHeight;

      window.setTimeout(function () {
        var reply = document.createElement("p");
        reply.textContent = "Anbieter: Danke für deine Nachricht, wir melden uns in Kürze!";
        log.appendChild(reply);
        log.scrollTop = log.scrollHeight;
      }, 500);
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendMessage();
    });

    content.appendChild(row);
    openModal();
  }

  function openFeedbackModal(offer) {
    var content = $("modalContent");
    content.textContent = "";

    var heading = document.createElement("h3");
    heading.textContent = "Feedback geben · " + offer.title;
    content.appendChild(heading);

    var picker = document.createElement("div");
    picker.className = "stars-picker";
    var selected = 0;

    for (var i = 1; i <= 5; i++) {
      (function (value) {
        var star = document.createElement("span");
        star.className = "star-choice";
        star.textContent = "★";
        star.addEventListener("click", function () {
          selected = value;
          Array.prototype.forEach.call(picker.children, function (child, idx) {
            child.classList.toggle("selected", idx < selected);
          });
        });
        picker.appendChild(star);
      })(i);
    }
    content.appendChild(picker);

    var textarea = document.createElement("textarea");
    textarea.className = "feedback-text";
    textarea.placeholder = "Erzähle uns von deiner Erfahrung …";
    content.appendChild(textarea);

    var submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "feedback-submit";
    submitBtn.textContent = "Feedback absenden";
    submitBtn.addEventListener("click", function () {
      submitBtn.textContent = "Danke für dein Feedback!";
      submitBtn.disabled = true;
      window.setTimeout(closeModal, 1200);
    });
    content.appendChild(submitBtn);

    openModal();
  }

  var PAYMENT_METHODS = [
    { id: "ueberweisung", label: "🏦 Überweisung" },
    { id: "lastschrift", label: "🧾 Lastschrift" },
    { id: "kreditkarte", label: "💳 Kreditkarte" },
    { id: "paypal", label: "🅿️ PayPal" },
    { id: "googlepay", label: "📱 Google Pay" },
    { id: "applepay", label: "📲 Apple Pay (iOS)" }
  ];

  function openBookingModal(offer) {
    var content = $("modalContent");
    content.textContent = "";

    var heading = document.createElement("h3");
    heading.textContent = "Jetzt buchen · " + offer.title;
    content.appendChild(heading);

    var summary = document.createElement("p");
    summary.className = "booking-summary";
    summary.textContent = "Bestpreis: ab " + offer.price + " € pro Person · " + (state.adults + state.children) + " Passagiere";
    content.appendChild(summary);

    var paymentLabel = document.createElement("p");
    paymentLabel.className = "payment-choice-label";
    paymentLabel.textContent = "Zahlungsart wählen:";
    content.appendChild(paymentLabel);

    var list = document.createElement("div");
    list.className = "payment-options-list";

    PAYMENT_METHODS.forEach(function (method, idx) {
      var optionLabel = document.createElement("label");
      optionLabel.className = "payment-option";

      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "paymentMethod";
      radio.value = method.id;
      if (idx === 0) radio.checked = true;
      optionLabel.appendChild(radio);

      var text = document.createElement("span");
      text.textContent = method.label;
      optionLabel.appendChild(text);

      list.appendChild(optionLabel);
    });
    content.appendChild(list);

    var confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "feedback-submit";
    confirmBtn.textContent = "Jetzt sicher bezahlen";
    confirmBtn.addEventListener("click", function () {
      confirmBtn.textContent = "Buchung bestätigt – vielen Dank!";
      confirmBtn.disabled = true;
      window.setTimeout(closeModal, 1400);
    });
    content.appendChild(confirmBtn);

    openModal();
  }

  function setCategory(cat) {
    state.category = cat;

    var buttons = document.querySelectorAll(".cat-btn");
    buttons.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.cat === cat);
    });

    var info = CATEGORY_INFO[cat];
    $("fromLabel").textContent = info.fromLabel;
    $("toLabel").textContent = info.toLabel;
    $("fromInput").placeholder = info.fromPlaceholder;
    $("toInput").placeholder = info.toPlaceholder;
    $("heroSub").textContent = info.heroSub;
    $("kurztripNote").classList.toggle("visible", cat === "kurztrip");

    renderOffers();
  }

  function updatePaxSummary() {
    var total = state.adults + state.children;
    var label = total + (total === 1 ? " Passagier" : " Passagiere");
    $("paxSummaryBtn").textContent = label;
  }

  function initCategoryNav() {
    var buttons = document.querySelectorAll(".cat-btn");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setCategory(btn.dataset.cat);
      });
    });
  }

  function initSwap() {
    $("swapBtn").addEventListener("click", function () {
      var fromInput = $("fromInput");
      var toInput = $("toInput");
      var tmp = fromInput.value;
      fromInput.value = toInput.value;
      toInput.value = tmp;
    });
  }

  function initPassengers() {
    var summaryBtn = $("paxSummaryBtn");
    var popover = $("paxPopover");

    summaryBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      popover.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!popover.contains(e.target) && e.target !== summaryBtn) {
        popover.classList.remove("open");
      }
    });

    var stepButtons = popover.querySelectorAll(".step-btn");
    stepButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.dataset.target;
        var delta = parseInt(btn.dataset.delta, 10);
        var min = target === "adults" ? 1 : 0;
        state[target] = Math.max(min, state[target] + delta);
        $(target === "adults" ? "adultsCount" : "childrenCount").textContent = state[target];
      });
    });

    $("paxDoneBtn").addEventListener("click", function () {
      updatePaxSummary();
      popover.classList.remove("open");
    });
  }

  function initFilters() {
    var chips = document.querySelectorAll(".chip");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var filter = chip.dataset.filter;
        chip.classList.toggle("active");
        var idx = state.filters.indexOf(filter);
        if (idx === -1) {
          state.filters.push(filter);
        } else {
          state.filters.splice(idx, 1);
        }
        renderOffers();
      });
    });

    $("beachDistance").addEventListener("input", function (e) {
      state.beachMax = parseFloat(e.target.value);
      $("beachDistanceValue").textContent = state.beachMax;
      renderOffers();
    });

    function applyPriceRange() {
      var min = parseFloat($("priceMin").value);
      var max = parseFloat($("priceMax").value);
      if (isNaN(min)) min = 0;
      if (isNaN(max)) max = 100000;
      min = Math.max(0, Math.min(100000, min));
      max = Math.max(0, Math.min(100000, max));
      if (min > max) {
        var tmp = min;
        min = max;
        max = tmp;
      }
      state.priceMin = min;
      state.priceMax = max;
      renderOffers();
    }

    $("priceMin").addEventListener("change", applyPriceRange);
    $("priceMax").addEventListener("change", applyPriceRange);

    $("filterResetBtn").addEventListener("click", function () {
      state.filters = [];
      chips.forEach(function (chip) {
        chip.classList.remove("active");
      });
      state.beachMax = 10;
      $("beachDistance").value = 10;
      $("beachDistanceValue").textContent = 10;
      state.priceMin = 0;
      state.priceMax = 100000;
      $("priceMin").value = 0;
      $("priceMax").value = 100000;
      renderOffers();
    });
  }

  function initSort() {
    $("sortSelect").addEventListener("change", function (e) {
      state.sort = e.target.value;
      renderOffers();
    });
  }

  function initModal() {
    $("modalClose").addEventListener("click", closeModal);
    $("modalOverlay").addEventListener("click", function (e) {
      if (e.target === $("modalOverlay")) closeModal();
    });
  }

  function initSearchForm() {
    $("searchForm").addEventListener("submit", function (e) {
      e.preventDefault();
      renderOffers();
      $("offersGrid").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function init() {
    populateDestinations();
    initCategoryNav();
    initSwap();
    initPassengers();
    initFilters();
    initSort();
    initModal();
    initSearchForm();
    updatePaxSummary();
    renderOffers();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
