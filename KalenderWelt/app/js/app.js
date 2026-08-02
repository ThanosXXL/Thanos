// Verdrahtung: Top-Navigation, Rendering, Start.
(function (global) {
  "use strict";

  const TABS = {
    "nav-kalender": { render: (el) => global.Calendar.render(el) },
    "nav-mail": { render: (el) => global.Mail.render(el) },
    "nav-docs": { render: (el) => global.Documents.render(el) },
  };

  let activeTab = "nav-kalender";

  function setActiveTab(tabId) {
    activeTab = tabId;
    Object.keys(TABS).forEach((id) => {
      document.getElementById(id).classList.toggle("active", id === tabId);
    });
    rerender();
  }

  function rerender() {
    const content = document.getElementById("content");
    TABS[activeTab].render(content);
  }

  function renderCopyright() {
    const year = new Date().getFullYear();
    document.getElementById("copyright").textContent = `© ${year} KalenderWelt. Alle Rechte vorbehalten.`;
  }

  async function start() {
    await global.AppState.init();
    Object.keys(TABS).forEach((id) => {
      document.getElementById(id).addEventListener("click", () => setActiveTab(id));
    });
    renderCopyright();
    rerender();
    global.Calendar.startReminderLoop();
  }

  global.KalenderWeltApp = { rerender, setActiveTab };
  document.addEventListener("DOMContentLoaded", start);
})(window);
