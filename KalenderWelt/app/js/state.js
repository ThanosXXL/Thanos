// Zentraler App-State. Muster: State ändern -> persist() -> render().
(function (global) {
  "use strict";

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const DEFAULT_STATE = {
    appointments: [], // { id, date: 'YYYY-MM-DD', time: 'HH:MM', title, notes, done }
    mailAccount: null, // { imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, user, password }
    mailToken: null,
    serverUrl: "http://localhost:4790",
    notifiedLog: {}, // { 'apptId|YYYY-MM-DD|HH': true } verhindert doppelte Reminder in derselben Stunde
  };

  const state = { ...DEFAULT_STATE };

  async function init() {
    const loaded = await global.Platform.loadState();
    if (loaded && typeof loaded === "object") {
      Object.assign(state, DEFAULT_STATE, loaded);
      if (!Array.isArray(state.appointments)) state.appointments = [];
      if (!state.notifiedLog) state.notifiedLog = {};
    }
  }

  async function persist() {
    await global.Platform.saveState(state);
  }

  global.AppState = { state, uid, init, persist };
})(window);
