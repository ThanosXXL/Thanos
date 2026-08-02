// Gemeinsames Modal für Kalender und E-Mail (vermeidet doppelten Code),
// inkl. Schließen per Klick außerhalb und Escape-Taste.
(function (global) {
  "use strict";

  function root() {
    return document.getElementById("modal-root");
  }

  function show(bodyEl) {
    const r = root();
    r.innerHTML = "";
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    const box = document.createElement("div");
    box.className = "modal-box";
    box.appendChild(bodyEl);
    overlay.appendChild(box);
    r.appendChild(overlay);
  }

  function close() {
    root().innerHTML = "";
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root().firstChild) close();
  });

  global.Modal = { show, close };
})(window);
