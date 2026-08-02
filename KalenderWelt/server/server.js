"use strict";

// KalenderWelt Vermittlungsserver: nimmt IMAP/SMTP-Zugangsdaten entgegen,
// hält sie ausschließlich im Arbeitsspeicher (nicht auf Platte) und stellt
// dafür ein Token bereit, mit dem Desktop-, Android- und iOS-Clients
// Postfach-Operationen ausführen können, ohne selbst IMAP/SMTP-Sockets
// öffnen zu müssen (auf Mobilgeräten aus Sandbox-Gründen ohnehin nicht
// zuverlässig möglich).

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const mail = require("./lib/mail");

const PORT = process.env.PORT || 4790;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 Stunden

const sessions = new Map(); // token -> { creds, createdAt }

function createSession(creds) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { creds, createdAt: Date.now() });
  return token;
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return session;
}

setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(token);
  }
}, 30 * 60 * 1000);

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/mail/connect", async (req, res) => {
  const { user, password, imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure } = req.body || {};
  if (!user || !password || !imapHost || !smtpHost) {
    return res.status(400).json({ error: "Bitte alle Pflichtfelder ausfüllen." });
  }
  const creds = {
    user,
    password,
    imapHost,
    imapPort: Number(imapPort) || 993,
    imapSecure: imapSecure !== false,
    smtpHost,
    smtpPort: Number(smtpPort) || 465,
    smtpSecure: smtpSecure !== false,
  };
  try {
    await mail.verifyCredentials(creds);
  } catch (err) {
    return res.status(401).json({ error: "Anmeldung fehlgeschlagen: " + err.message });
  }
  const token = createSession(creds);
  res.json({ token });
});

app.get("/api/mail/messages", async (req, res) => {
  const session = getSession(String(req.query.token || ""));
  if (!session) return res.status(401).json({ error: "Ungültige oder abgelaufene Sitzung." });
  try {
    const messages = await mail.fetchMessages(session.creds, 25);
    res.json({ messages });
  } catch (err) {
    res.status(502).json({ error: "Postfach konnte nicht gelesen werden: " + err.message });
  }
});

app.post("/api/mail/send", async (req, res) => {
  const { token, to, subject, text, attachmentBase64, attachmentName } = req.body || {};
  const session = getSession(String(token || ""));
  if (!session) return res.status(401).json({ error: "Ungültige oder abgelaufene Sitzung." });
  if (!to) return res.status(400).json({ error: "Empfänger fehlt." });
  try {
    await mail.sendMail(session.creds, { to, subject, text, attachmentBase64, attachmentName });
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: "Senden fehlgeschlagen: " + err.message });
  }
});

app.post("/api/mail/disconnect", (req, res) => {
  const { token } = req.body || {};
  sessions.delete(String(token || ""));
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`KalenderWelt-Server läuft auf http://localhost:${PORT}`);
});
