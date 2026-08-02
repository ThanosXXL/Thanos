// E-Mail(s): echtes Postfach via IMAP/SMTP-Vermittlungsserver (server/).
(function (global) {
  "use strict";

  const view = {
    messages: [],
    loading: false,
    loaded: false,
    error: "",
    sessionExpiredMessage: "",
    openMessage: null,
  };

  function api(path) {
    const { state } = global.AppState;
    return state.serverUrl.replace(/\/$/, "") + path;
  }

  async function render(container) {
    container.innerHTML = "";
    const { state } = global.AppState;
    const panel = document.createElement("div");
    panel.className = "panel";

    if (!state.mailToken) {
      panel.appendChild(renderConnectForm());
      container.appendChild(panel);
      return;
    }

    const topRow = document.createElement("div");
    topRow.className = "btn-row";
    topRow.style.marginBottom = "10px";

    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.className = "btn";
    refreshBtn.textContent = "🔄 Aktualisieren";
    refreshBtn.addEventListener("click", () => loadMessages(container));
    topRow.appendChild(refreshBtn);

    const composeBtn = document.createElement("button");
    composeBtn.type = "button";
    composeBtn.className = "btn";
    composeBtn.textContent = "✏️ Neue E-Mail";
    composeBtn.addEventListener("click", () => openComposeModal());
    topRow.appendChild(composeBtn);

    const disconnectBtn = document.createElement("button");
    disconnectBtn.type = "button";
    disconnectBtn.className = "btn secondary";
    disconnectBtn.textContent = "Postfach trennen";
    disconnectBtn.addEventListener("click", async () => {
      state.mailToken = null;
      state.mailAccount = null;
      view.messages = [];
      view.loaded = false;
      view.error = "";
      await global.AppState.persist();
      global.KalenderWeltApp.rerender();
    });
    topRow.appendChild(disconnectBtn);

    panel.appendChild(topRow);

    const accountLine = document.createElement("div");
    accountLine.className = "hint";
    accountLine.textContent = "Verbunden als " + (state.mailAccount ? state.mailAccount.user : "");
    panel.appendChild(accountLine);

    if (view.error) {
      const err = document.createElement("div");
      err.className = "hint";
      err.style.color = "#8b1f1f";
      err.textContent = view.error;
      panel.appendChild(err);
    }

    const list = document.createElement("ul");
    list.className = "list";
    list.style.marginTop = "12px";

    if (view.loading) {
      const l = document.createElement("div");
      l.className = "hint";
      l.textContent = "Lade Postfach …";
      list.appendChild(l);
    } else if (view.messages.length === 0) {
      const l = document.createElement("div");
      l.className = "hint";
      l.textContent = view.loaded ? "Keine Nachrichten im Posteingang." : "Noch nicht geladen.";
      list.appendChild(l);
    } else {
      view.messages.forEach((m) => {
        const li = document.createElement("li");
        li.className = "list-item";
        li.style.cursor = "pointer";
        const left = document.createElement("div");
        const subj = document.createElement("div");
        subj.style.fontWeight = "700";
        subj.textContent = m.subject || "(kein Betreff)";
        left.appendChild(subj);
        const from = document.createElement("div");
        from.className = "hint";
        from.textContent = `${m.from || "?"} · ${m.date ? new Date(m.date).toLocaleString("de-DE") : ""}`;
        left.appendChild(from);
        li.appendChild(left);
        li.addEventListener("click", () => openMessage(m));
        list.appendChild(li);
      });
    }
    panel.appendChild(list);
    container.appendChild(panel);

    if (!view.loading && !view.loaded && !view.error) {
      loadMessages(container);
    }
  }

  function renderConnectForm() {
    const { state } = global.AppState;
    const body = document.createElement("div");
    const heading = document.createElement("h2");
    heading.textContent = "Postfach verbinden";
    body.appendChild(heading);
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Zugangsdaten werden an den KalenderWelt-Vermittlungsserver gesendet (server/) und dort für IMAP/SMTP verwendet.";
    body.appendChild(hint);

    if (view.sessionExpiredMessage) {
      const sessionHint = document.createElement("div");
      sessionHint.className = "hint";
      sessionHint.style.color = "#8b1f1f";
      sessionHint.textContent = view.sessionExpiredMessage;
      body.appendChild(sessionHint);
      view.sessionExpiredMessage = "";
    }

    const serverLabel = document.createElement("label");
    serverLabel.textContent = "Server-Adresse (auf Mobilgeräten nicht „localhost“, sondern IP/Domain des Servers)";
    body.appendChild(serverLabel);
    const serverInput = document.createElement("input");
    serverInput.type = "text";
    serverInput.value = state.serverUrl;
    serverInput.addEventListener("change", async () => {
      state.serverUrl = serverInput.value.trim().replace(/\/$/, "") || state.serverUrl;
      await global.AppState.persist();
    });
    body.appendChild(serverInput);

    const fields = [
      ["user", "E-Mail-Adresse", "email", "name@example.com"],
      ["password", "Passwort (App-Passwort empfohlen)", "password", ""],
      ["imapHost", "IMAP-Server", "text", "imap.example.com"],
      ["imapPort", "IMAP-Port", "number", "993"],
      ["smtpHost", "SMTP-Server", "text", "smtp.example.com"],
      ["smtpPort", "SMTP-Port", "number", "465"],
    ];

    const inputs = {};
    fields.forEach(([key, label, type, placeholder]) => {
      const l = document.createElement("label");
      l.textContent = label;
      body.appendChild(l);
      const i = document.createElement("input");
      i.type = type;
      i.placeholder = placeholder;
      if (key === "imapPort") i.value = "993";
      if (key === "smtpPort") i.value = "465";
      inputs[key] = i;
      body.appendChild(i);
    });

    const errorBox = document.createElement("div");
    errorBox.className = "hint";
    errorBox.style.color = "#8b1f1f";
    body.appendChild(errorBox);

    const connectBtn = document.createElement("button");
    connectBtn.type = "button";
    connectBtn.className = "btn";
    connectBtn.style.marginTop = "14px";
    connectBtn.textContent = "Verbinden";
    connectBtn.addEventListener("click", async () => {
      errorBox.textContent = "";
      const payload = {
        user: inputs.user.value.trim(),
        password: inputs.password.value,
        imapHost: inputs.imapHost.value.trim(),
        imapPort: Number(inputs.imapPort.value) || 993,
        imapSecure: true,
        smtpHost: inputs.smtpHost.value.trim(),
        smtpPort: Number(inputs.smtpPort.value) || 465,
        smtpSecure: true,
      };
      if (!payload.user || !payload.password || !payload.imapHost || !payload.smtpHost) {
        errorBox.textContent = "Bitte alle Felder ausfüllen.";
        return;
      }
      connectBtn.disabled = true;
      connectBtn.textContent = "Verbinde …";
      try {
        const res = await fetch(api("/api/mail/connect"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verbindung fehlgeschlagen");
        const { state } = global.AppState;
        state.mailToken = data.token;
        state.mailAccount = { user: payload.user, imapHost: payload.imapHost, smtpHost: payload.smtpHost };
        await global.AppState.persist();
        global.KalenderWeltApp.rerender();
      } catch (err) {
        errorBox.textContent = "Fehler: " + err.message + " (läuft der Server unter " + global.AppState.state.serverUrl + " ?)";
      } finally {
        connectBtn.disabled = false;
        connectBtn.textContent = "Verbinden";
      }
    });
    body.appendChild(connectBtn);
    return body;
  }

  async function loadMessages(container) {
    const { state } = global.AppState;
    view.loading = true;
    view.error = "";
    render(container);
    try {
      const res = await fetch(api("/api/mail/messages?token=" + encodeURIComponent(state.mailToken)));
      const data = await res.json();
      if (res.status === 401) {
        // Sitzung abgelaufen (Server neu gestartet oder TTL erreicht) – zurück zum Login führen.
        state.mailToken = null;
        state.mailAccount = null;
        await global.AppState.persist();
        view.messages = [];
        view.sessionExpiredMessage = "Sitzung abgelaufen, bitte Postfach erneut verbinden.";
        return;
      }
      if (!res.ok) throw new Error(data.error || "Fehler beim Laden");
      view.messages = data.messages || [];
    } catch (err) {
      view.error = "Postfach konnte nicht geladen werden: " + err.message;
    } finally {
      view.loading = false;
      view.loaded = true;
      render(container);
    }
  }

  function openMessage(m) {
    const body = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = m.subject || "(kein Betreff)";
    body.appendChild(h);
    const meta = document.createElement("div");
    meta.className = "hint";
    meta.textContent = `Von: ${m.from || "?"} · ${m.date ? new Date(m.date).toLocaleString("de-DE") : ""}`;
    body.appendChild(meta);
    const text = document.createElement("div");
    text.style.marginTop = "12px";
    text.style.whiteSpace = "pre-wrap";
    text.textContent = m.text || "(kein Inhalt geladen)";
    body.appendChild(text);
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn secondary";
    closeBtn.style.marginTop = "16px";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", global.Modal.close);
    body.appendChild(closeBtn);
    global.Modal.show(body);
  }

  function openComposeModal(prefill) {
    prefill = prefill || {};
    const body = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = "Neue E-Mail";
    body.appendChild(h);

    const toLabel = document.createElement("label");
    toLabel.textContent = "An";
    body.appendChild(toLabel);
    const toInput = document.createElement("input");
    toInput.type = "email";
    toInput.value = prefill.to || "";
    body.appendChild(toInput);

    const subjLabel = document.createElement("label");
    subjLabel.textContent = "Betreff";
    body.appendChild(subjLabel);
    const subjInput = document.createElement("input");
    subjInput.type = "text";
    subjInput.value = prefill.subject || "";
    body.appendChild(subjInput);

    const textLabel = document.createElement("label");
    textLabel.textContent = "Nachricht";
    body.appendChild(textLabel);
    const textInput = document.createElement("textarea");
    textInput.value = prefill.text || "";
    body.appendChild(textInput);

    if (prefill.attachmentName) {
      const att = document.createElement("div");
      att.className = "hint";
      att.textContent = "📎 Anhang: " + prefill.attachmentName;
      body.appendChild(att);
    }

    const errorBox = document.createElement("div");
    errorBox.className = "hint";
    errorBox.style.color = "#8b1f1f";
    body.appendChild(errorBox);

    const row = document.createElement("div");
    row.className = "btn-row";
    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "btn";
    sendBtn.textContent = "Senden";
    sendBtn.addEventListener("click", async () => {
      errorBox.textContent = "";
      if (!toInput.value.trim()) {
        errorBox.textContent = "Bitte Empfänger angeben.";
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = "Sende …";
      const ok = await sendMail({
        to: toInput.value.trim(),
        subject: subjInput.value.trim(),
        text: textInput.value,
        attachmentBase64: prefill.attachmentBase64,
        attachmentName: prefill.attachmentName,
      });
      sendBtn.disabled = false;
      sendBtn.textContent = "Senden";
      if (ok) {
        global.Modal.close();
      } else {
        errorBox.textContent = "Senden fehlgeschlagen. Ist das Postfach verbunden und der Server erreichbar?";
      }
    });
    row.appendChild(sendBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn secondary";
    cancelBtn.textContent = "Abbrechen";
    cancelBtn.addEventListener("click", global.Modal.close);
    row.appendChild(cancelBtn);

    body.appendChild(row);
    global.Modal.show(body);
  }

  async function sendMail({ to, subject, text, attachmentBase64, attachmentName }) {
    const { state } = global.AppState;
    if (!state.mailToken) return false;
    try {
      const res = await fetch(api("/api/mail/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: state.mailToken,
          to,
          subject,
          text,
          attachmentBase64,
          attachmentName,
        }),
      });
      const data = await res.json();
      return res.ok && data.ok;
    } catch (err) {
      return false;
    }
  }

  global.Mail = { render, openComposeModal, sendMail };
})(window);
