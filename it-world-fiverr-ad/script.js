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
      var card = document.createElement("button");
      card.type = "button";
      card.className = "example-card reveal";
      card.style.transitionDelay = (index * 0.06) + "s";
      card.setAttribute(
        "aria-label",
        example.title + " (" + example.tag + ") – Beispiel ansehen"
      );

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

      card.addEventListener("click", function (e) {
        openLightbox(example, e.currentTarget);
      });

      grid.appendChild(card);
    });
  }

  var lastFocusedEl = null;

  function openLightbox(example, triggerEl) {
    var lightbox = document.getElementById("lightbox");
    var frame = document.getElementById("lightboxFrame");
    var title = document.getElementById("lightboxTitle");
    var text = document.getElementById("lightboxText");
    var closeBtn = document.getElementById("lightboxClose");
    if (!lightbox || !frame || !title || !text) return;

    frame.innerHTML = "";
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

    lastFocusedEl = triggerEl || document.activeElement;
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    var lightbox = document.getElementById("lightbox");
    if (!lightbox || !lightbox.classList.contains("open")) return;
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus();
    }
    lastFocusedEl = null;
  }

  function trapFocus(e) {
    var lightbox = document.getElementById("lightbox");
    if (!lightbox || !lightbox.classList.contains("open")) return;

    var focusables = lightbox.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;

    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
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
      if (e.key === "Tab") trapFocus(e);
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
    if (!card) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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

  function initMobileNav() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;

    function setOpen(isOpen) {
      nav.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Menü schließen" : "Menü öffnen");
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("open"));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setOpen(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildGallery();
    initLightboxControls();
    initReveal();
    initTilt();
    initYear();
    initMobileNav();
  });
})();
