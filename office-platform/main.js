const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const PptxGenJS = require('pptxgenjs');

const dataFilePath = path.join(app.getPath('userData'), 'office-platform-data.json');

function defaultData() {
  return { emailAccounts: [], wordDocuments: [], presentations: [] };
}

function encryptSecret(plainText) {
  if (safeStorage.isEncryptionAvailable()) {
    return { enc: true, data: safeStorage.encryptString(plainText || '').toString('base64') };
  }
  return { enc: false, data: Buffer.from(plainText || '', 'utf-8').toString('base64') };
}

function decryptSecret(secret) {
  if (!secret || !secret.data) return '';
  if (secret.enc && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(secret.data, 'base64'));
  }
  return Buffer.from(secret.data, 'base64').toString('utf-8');
}

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const data = Object.assign(defaultData(), parsed);
    data.emailAccounts = (data.emailAccounts || []).map((account) => {
      const { secret, ...rest } = account;
      return { ...rest, password: decryptSecret(secret) };
    });
    return data;
  } catch (err) {
    return defaultData();
  }
}

function saveData(data) {
  const toWrite = {
    emailAccounts: (data.emailAccounts || []).map((account) => {
      const { password, ...rest } = account;
      return { ...rest, secret: encryptSecret(password) };
    }),
    wordDocuments: data.wordDocuments || [],
    presentations: data.presentations || []
  };
  fs.writeFileSync(dataFilePath, JSON.stringify(toWrite, null, 2), 'utf-8');
}

function buildImapConfig(account) {
  return {
    host: account.imapHost,
    port: Number(account.imapPort) || 993,
    secure: !!account.imapSecure,
    auth: { user: account.username, pass: account.password },
    logger: false
  };
}

function buildSmtpTransport(account) {
  return nodemailer.createTransport({
    host: account.smtpHost,
    port: Number(account.smtpPort) || 587,
    secure: !!account.smtpSecure,
    auth: { user: account.username, pass: account.password }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('email-test-connection', async (event, account) => {
  let client;
  try {
    client = new ImapFlow(buildImapConfig(account));
    await client.connect();
    await client.logout();
    const transporter = buildSmtpTransport(account);
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    try { if (client) await client.logout(); } catch (_) { /* ignore */ }
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('email-list-folders', async (event, account) => {
  const client = new ImapFlow(buildImapConfig(account));
  try {
    await client.connect();
    const list = await client.list();
    return list.map((f) => ({ path: f.path, name: f.name, specialUse: f.specialUse || null }));
  } finally {
    try { await client.logout(); } catch (_) { /* ignore */ }
  }
});

ipcMain.handle('email-fetch-messages', async (event, { account, folder, limit }) => {
  const client = new ImapFlow(buildImapConfig(account));
  const mailbox = folder || 'INBOX';
  const messages = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);
    try {
      const total = client.mailbox.exists;
      const max = limit || 50;
      if (total > 0) {
        const start = Math.max(1, total - max + 1);
        for await (const msg of client.fetch(`${start}:*`, { envelope: true, flags: true, uid: true })) {
          messages.push({
            uid: msg.uid,
            subject: (msg.envelope && msg.envelope.subject) || '(kein Betreff)',
            from: msg.envelope && msg.envelope.from ? msg.envelope.from.map((f) => f.name || f.address).join(', ') : '',
            to: msg.envelope && msg.envelope.to ? msg.envelope.to.map((f) => f.name || f.address).join(', ') : '',
            date: msg.envelope ? msg.envelope.date : null,
            seen: msg.flags ? msg.flags.has('\\Seen') : false
          });
        }
      }
    } finally {
      lock.release();
    }
    messages.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { ok: true, messages };
  } catch (err) {
    return { ok: false, error: err.message, messages: [] };
  } finally {
    try { await client.logout(); } catch (_) { /* ignore */ }
  }
});

ipcMain.handle('email-fetch-message-body', async (event, { account, folder, uid }) => {
  const client = new ImapFlow(buildImapConfig(account));
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder || 'INBOX');
    try {
      const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (!msg || !msg.source) return { ok: false, error: 'Nachricht nicht gefunden' };
      const parsed = await simpleParser(msg.source);
      return {
        ok: true,
        html: parsed.html || null,
        text: parsed.text || '',
        subject: parsed.subject || '',
        from: parsed.from ? parsed.from.text : '',
        to: parsed.to ? parsed.to.text : '',
        date: parsed.date
      };
    } finally {
      lock.release();
    }
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    try { await client.logout(); } catch (_) { /* ignore */ }
  }
});

ipcMain.handle('email-send', async (event, { account, mail }) => {
  try {
    const transporter = buildSmtpTransport(account);
    const info = await transporter.sendMail({
      from: account.email,
      to: mail.to,
      cc: mail.cc || undefined,
      bcc: mail.bcc || undefined,
      subject: mail.subject,
      text: mail.text,
      html: mail.html || undefined
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('word-export-docx', async (event, { suggestedName, paragraphs }) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Word-Dokument speichern',
    defaultPath: `${suggestedName || 'Dokument'}.docx`,
    filters: [{ name: 'Word-Dokument', extensions: ['docx'] }]
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  const docParagraphs = (paragraphs || []).map((p) => {
    const runs = (p.runs || []).map((r) => new TextRun({
      text: r.text,
      bold: !!r.bold,
      italics: !!r.italic,
      underline: r.underline ? {} : undefined
    }));
    const options = { children: runs.length ? runs : [new TextRun('')] };
    if (p.heading === 1) options.heading = HeadingLevel.HEADING_1;
    else if (p.heading === 2) options.heading = HeadingLevel.HEADING_2;
    if (p.bullet) options.bullet = { level: 0 };
    return new Paragraph(options);
  });

  const doc = new Document({
    sections: [{ children: docParagraphs.length ? docParagraphs : [new Paragraph('')] }]
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('pptx-export', async (event, { suggestedName, slides }) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'PowerPoint-Präsentation speichern',
    defaultPath: `${suggestedName || 'Praesentation'}.pptx`,
    filters: [{ name: 'PowerPoint-Präsentation', extensions: ['pptx'] }]
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  try {
    const pres = new PptxGenJS();
    (slides || []).forEach((slide) => {
      const s = pres.addSlide();
      s.addText(slide.title || '', {
        x: 0.5, y: 0.3, w: '90%', h: 1, fontSize: 28, bold: true, color: '0B1F4D'
      });
      const bulletItems = (slide.bullets || [])
        .filter((b) => b && b.trim())
        .map((b) => ({ text: b, options: { bullet: true, breakLine: true } }));
      if (bulletItems.length) {
        s.addText(bulletItems, { x: 0.5, y: 1.5, w: '90%', h: 4.5, fontSize: 18, color: '111111' });
      }
      if (slide.notes) {
        s.addNotes(slide.notes);
      }
    });
    await pres.writeFile({ fileName: filePath });
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
