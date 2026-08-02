// Word-Dateien erstellen und an mehrere Empfänger teilen (E-Mail / WhatsApp / SignalChat).
(function (global) {
  "use strict";

  const view = {
    recipients: [{ channel: "email", value: "" }],
    status: "",
  };

  function render(container) {
    container.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "panel";

    const heading = document.createElement("h2");
    heading.textContent = "Word-Datei erstellen";
    panel.appendChild(heading);

    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Titel des Dokuments";
    panel.appendChild(titleLabel);
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.id = "doc-title";
    titleInput.placeholder = "z. B. Protokoll, Ankündigung …";
    panel.appendChild(titleInput);

    const contentLabel = document.createElement("label");
    contentLabel.textContent = "Inhalt";
    panel.appendChild(contentLabel);
    const contentInput = document.createElement("textarea");
    contentInput.id = "doc-content";
    contentInput.style.minHeight = "200px";
    contentInput.placeholder = "Text des Word-Dokuments – jede Zeile wird ein Absatz.";
    panel.appendChild(contentInput);

    const recHeading = document.createElement("h3");
    recHeading.textContent = "Empfänger";
    panel.appendChild(recHeading);

    const recList = document.createElement("div");
    recList.id = "recipient-list";
    renderRecipients(recList);
    panel.appendChild(recList);

    const addRecBtn = document.createElement("button");
    addRecBtn.type = "button";
    addRecBtn.className = "btn secondary";
    addRecBtn.textContent = "+ Empfänger hinzufügen";
    addRecBtn.addEventListener("click", () => {
      view.recipients.push({ channel: "email", value: "" });
      renderRecipients(recList);
    });
    panel.appendChild(addRecBtn);

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.style.marginTop = "10px";
    hint.textContent =
      "E-Mail wird direkt mit der .docx-Datei als Anhang über das verbundene Postfach versendet. " +
      "Bei WhatsApp/Signal öffnet sich der Chat mit vorbereitetem Text – die Datei muss dort manuell angehängt werden " +
      "(beide Dienste bieten keine offizielle Automatisierung für Desktop-Dateianhänge).";
    panel.appendChild(hint);

    const statusBox = document.createElement("div");
    statusBox.className = "hint";
    statusBox.id = "doc-status";
    statusBox.textContent = view.status;
    panel.appendChild(statusBox);

    const row = document.createElement("div");
    row.className = "btn-row";

    const generateBtn = document.createElement("button");
    generateBtn.type = "button";
    generateBtn.className = "btn";
    generateBtn.textContent = "📄 Datei erzeugen & senden/teilen";
    generateBtn.addEventListener("click", async () => {
      generateBtn.disabled = true;
      const prevLabel = generateBtn.textContent;
      generateBtn.textContent = "Erzeuge Datei …";
      try {
        await createAndDistribute(titleInput.value.trim() || "Dokument", contentInput.value, statusBox);
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = prevLabel;
      }
    });
    row.appendChild(generateBtn);

    const saveOnlyBtn = document.createElement("button");
    saveOnlyBtn.type = "button";
    saveOnlyBtn.className = "btn secondary";
    saveOnlyBtn.textContent = "Nur speichern";
    saveOnlyBtn.addEventListener("click", async () => {
      saveOnlyBtn.disabled = true;
      try {
        const { blob, filename } = await buildDocx(titleInput.value.trim() || "Dokument", contentInput.value);
        await global.Platform.saveAndShareFile(blob, filename);
        statusBox.textContent = "Datei gespeichert: " + filename;
      } finally {
        saveOnlyBtn.disabled = false;
      }
    });
    row.appendChild(saveOnlyBtn);

    panel.appendChild(row);
    container.appendChild(panel);
  }

  function renderRecipients(recList) {
    recList.innerHTML = "";
    view.recipients.forEach((r, idx) => {
      const row = document.createElement("div");
      row.className = "recipient-row";

      const select = document.createElement("select");
      ["email", "whatsapp", "signal"].forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c === "email" ? "E-Mail" : c === "whatsapp" ? "WhatsApp" : "SignalChat";
        if (r.channel === c) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", () => {
        r.channel = select.value;
        renderRecipients(recList);
      });
      row.appendChild(select);

      const input = document.createElement("input");
      input.type = r.channel === "email" ? "email" : "tel";
      input.placeholder = r.channel === "email" ? "empfaenger@example.com" : "+49 151 23456789";
      input.value = r.value;
      input.addEventListener("input", () => (r.value = input.value));
      row.appendChild(input);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn danger";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        view.recipients.splice(idx, 1);
        if (view.recipients.length === 0) view.recipients.push({ channel: "email", value: "" });
        renderRecipients(recList);
      });
      row.appendChild(removeBtn);

      recList.appendChild(row);
    });
  }

  async function buildDocx(title, content) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = global.docx;
    const paragraphs = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(title)],
      }),
    ];
    content.split(/\r?\n/).forEach((line) => {
      paragraphs.push(new Paragraph({ children: [new TextRun(line)] }));
    });
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const safeName = title.replace(/[^a-z0-9äöüß _-]/gi, "").trim() || "Dokument";
    const filename = `${safeName}-${Date.now()}.docx`;
    return { blob, filename };
  }

  async function createAndDistribute(title, content, statusBox) {
    statusBox.textContent = "Erzeuge Word-Datei …";
    const { blob, filename } = await buildDocx(title, content);

    const emailRecipients = view.recipients.filter((r) => r.channel === "email" && r.value.trim());
    const chatRecipients = view.recipients.filter((r) => r.channel !== "email" && r.value.trim());

    const results = [];

    if (emailRecipients.length > 0) {
      statusBox.textContent = "Sende E-Mail(s) …";
      const base64 = await global.Platform.blobToBase64(blob);
      for (const r of emailRecipients) {
        const ok = await global.Mail.sendMail({
          to: r.value.trim(),
          subject: title,
          text: `Anbei die Datei „${title}“.`,
          attachmentBase64: base64,
          attachmentName: filename,
        });
        results.push(`E-Mail an ${r.value}: ${ok ? "gesendet ✓" : "fehlgeschlagen ✗ (Postfach verbunden?)"}`);
      }
    }

    if (chatRecipients.length > 0) {
      statusBox.textContent = "Öffne WhatsApp/Signal & bereite Datei zum Anhängen vor …";
      await global.Platform.saveAndShareFile(blob, filename);
      chatRecipients.forEach((r) => {
        const digits = r.value.replace(/[^\d+]/g, "").replace(/^\+/, "");
        const text = encodeURIComponent(`Hallo, anbei die Datei „${title}“ (${filename}). Bitte im Chat anhängen.`);
        if (r.channel === "whatsapp") {
          global.Platform.openExternal(`https://wa.me/${digits}?text=${text}`);
          results.push(`WhatsApp-Chat mit ${r.value} geöffnet – Datei bitte manuell anhängen.`);
        } else if (r.channel === "signal") {
          global.Platform.openExternal(`https://signal.me/#p/+${digits}`);
          results.push(`Signal-Chat mit ${r.value} geöffnet – Datei bitte manuell anhängen.`);
        }
      });
    }

    if (results.length === 0) {
      statusBox.textContent = "Datei erzeugt: " + filename + ". Keine Empfänger angegeben – nichts versendet.";
      await global.Platform.saveAndShareFile(blob, filename);
    } else {
      statusBox.textContent = results.join(" · ");
    }
  }

  global.Documents = { render };
})(window);
