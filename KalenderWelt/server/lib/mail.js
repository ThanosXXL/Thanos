"use strict";

const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");

function makeImapClient(creds) {
  return new ImapFlow({
    host: creds.imapHost,
    port: creds.imapPort,
    secure: creds.imapSecure !== false,
    auth: { user: creds.user, pass: creds.password },
    logger: false,
  });
}

async function verifyCredentials(creds) {
  const client = makeImapClient(creds);
  await client.connect();
  await client.logout();
}

async function fetchMessages(creds, limit) {
  limit = limit || 25;
  const client = makeImapClient(creds);
  await client.connect();
  const messages = [];
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages || 0;
      if (total === 0) return [];
      const start = Math.max(1, total - limit + 1);
      for await (const msg of client.fetch(`${start}:*`, { envelope: true, source: true })) {
        let text = "";
        let fromText = (msg.envelope.from || []).map((f) => f.address).join(", ");
        try {
          const parsed = await simpleParser(msg.source);
          text = parsed.text || "";
          if (parsed.from && parsed.from.text) fromText = parsed.from.text;
        } catch (err) {
          // Parsing fehlgeschlagen – Envelope-Daten reichen als Fallback
        }
        messages.push({
          uid: msg.uid,
          subject: msg.envelope.subject || "",
          from: fromText,
          date: (msg.envelope.date || new Date()).toISOString(),
          text,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  messages.reverse();
  return messages;
}

async function sendMail(creds, { to, subject, text, attachmentBase64, attachmentName }) {
  const transporter = nodemailer.createTransport({
    host: creds.smtpHost,
    port: creds.smtpPort,
    secure: creds.smtpSecure !== false,
    auth: { user: creds.user, pass: creds.password },
  });

  const attachments = [];
  if (attachmentBase64 && attachmentName) {
    attachments.push({ filename: attachmentName, content: Buffer.from(attachmentBase64, "base64") });
  }

  await transporter.sendMail({
    from: creds.user,
    to,
    subject: subject || "(kein Betreff)",
    text: text || "",
    attachments,
  });
}

module.exports = { verifyCredentials, fetchMessages, sendMail };
