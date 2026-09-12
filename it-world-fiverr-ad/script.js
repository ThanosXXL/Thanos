(function () {
  "use strict";

  var EXAMPLES = [
    {
      title: "Anwaltskanzlei",
      tag: "Business",
      blocks: [90, 55, 70],
      text: "Seriöser Auftritt mit klarer Struktur, dezenten Goldakzenten und vertrauensbildendem Layout für Kanzleien und Beratungen."
    },
    {
      title: "Boutique Hotel",
      tag: "Hospitality",
      blocks: [95, 60, 40],
      text: "Hochglanz-Bildwelten, weiche Übergänge und ein Buchungs-Call-to-Action, der Eleganz und Komfort transportiert."
    },
    {
      title: "Immobilien",
      tag: "Real Estate",
      blocks: [80, 65, 50],
      text: "Objektgalerien mit 3D-Kartenoptik, klaren Filtern und einem Navy/Gold-Look, der Exklusivität unterstreicht."
    },
    {
      title: "Fitness Studio",
      tag: "Lifestyle",
      blocks: [70, 90, 45],
      text: "Dynamische, aber ruhige Animationen und starke Kurs-Kacheln, die Energie mit Premium-Optik verbinden."
    },
    {
      title: "Architekturbüro",
      tag: "Portfolio",
      blocks: [85, 50, 75],
      text: "Großformatige Projektvorschauen mit sanften Hover-Effekten und einem minimalistischen, hochwertigen Rahmen."
    },
    {
      title: "Boutique Shop",
      tag: "E-Commerce",
      blocks: [60, 95, 55],
      text: "Produktkarten mit Glanzlicht-Effekt, klarer Preislogik und einem goldakzentuierten Warenkorb-Button."
    }
  ];

  function buildGallery() {
    var grid = document.getElementById("galleryGrid");
    if (!grid) return;

    EXAMPLES.forEach(function (example, index) {
      var card = document.createElement("div");
      card.className = "example-card reveal";
      card.style.transitionDelay = (index * 0.06) + "s";

      var chrome = document.createElement("div");
      chrome.className = "example-chrome";
      for (var i = 0; i < 3; i++) {
        chrome.appendChild(document.createElement("span"));
      }
      card.appendChild(chrome);

      var preview = document.createElement("div");
      preview.className = "example-preview";
      preview.style.background = "linear-gradient(160deg, rgba(212,175,55,0.12), rgba(5,11,26,0.4))";
      example.blocks.forEach(function (widthPct, i) {
        var block = document.createElement("div");
        block.className = "example-block";
        block.style.width = widthPct + "%";
        block.style.height = i === 0 ? "18px" : "10px";
        block.style.marginBottom = "10px";
        preview.appendChild(block);
      });
      card.appendChild(preview);

      var label = document.createElement("div");
      label.className = "example-label";

      var title = document.createElement("h4");
      title.textContent = example.title;
      label.appendChild(title);

      var tag = document.createElement("span");
      tag.textContent = example.tag;
      label.appendChild(tag);

      card.appendChild(label);

      card.addEventListener("click", function () {
        openLightbox(example);
      });

      grid.appendChild(card);
    });
  }

  function openLightbox(example) {
    var lightbox = document.getElementById("lightbox");
    var frame = document.getElementById("lightboxFrame");
    var title = document.getElementById("lightboxTitle");
    var text = document.getElementById("lightboxText");
    if (!lightbox || !frame || !title || !text) return;

    frame.innerHTML = "";
    frame.style.background = "linear-gradient(160deg, rgba(212,175,55,0.16), rgba(5,11,26,0.5))";
    frame.style.display = "flex";
    frame.style.flexDirection = "column";
    frame.style.justifyContent = "center";
    frame.style.gap = "10px";
    frame.style.padding = "22px";

    example.blocks.forEach(function (widthPct, i) {
      var block = document.createElement("div");
      block.style.width = widthPct + "%";
      block.style.height = i === 0 ? "20px" : "12px";
      block.style.borderRadius = "6px";
      block.style.background = "rgba(255,255,255,0.18)";
      frame.appendChild(block);
    });

    title.textContent = example.title + " — " + example.tag;
    text.textContent = example.text;

    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    var lightbox = document.getElementById("lightbox");
    if (!lightbox) return;
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
  }

  function initLightboxControls() {
    var closeBtn = document.getElementById("lightboxClose");
    var lightbox = document.getElementById("lightbox");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    if (lightbox) {
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeLightbox();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { observer.observe(el); });
  }

  function initTilt() {
    var card = document.getElementById("tiltCard");
    if (!card || window.matchMedia("(pointer: coarse)").matches) return;

    card.addEventListener("mousemove", function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      var rotateY = x * 14 - 6;
      var rotateX = -y * 10 + 4;
      card.style.transform = "perspective(900px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
    });

    card.addEventListener("mouseleave", function () {
      card.style.transform = "perspective(900px) rotateX(4deg) rotateY(-6deg)";
    });
  }

  function initYear() {
    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildGallery();
    initLightboxControls();
    initReveal();
    initTilt();
    initYear();
  });
})();
