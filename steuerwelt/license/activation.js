const fs = require('fs');
const path = require('path');
const { getHardwareId } = require('./hardware-id');
const { verifyCertificate } = require('./verify');
const { LICENSE_SERVER_URL } = require('./server-config');

const GRACE_DAYS = 14;
const REQUEST_TIMEOUT_MS = 10000;

function certFilePath(userDataDir) {
  return path.join(userDataDir, 'license-certificate.json');
}

function readStoredCertificate(userDataDir) {
  try {
    const raw = fs.readFileSync(certFilePath(userDataDir), 'utf-8');
    const data = JSON.parse(raw);
    if (data && data.certificate && data.licenseKey) return data;
  } catch (err) {
    // keine oder beschädigte Datei -> wie "nicht aktiviert" behandeln
  }
  return null;
}

function storeCertificate(userDataDir, licenseKey, certificate) {
  fs.writeFileSync(
    certFilePath(userDataDir),
    JSON.stringify({ licenseKey, certificate }, null, 2),
    'utf-8'
  );
}

async function postJson(pathname, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(LICENSE_SERVER_URL.replace(/\/$/, '') + pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `Serverfehler (${res.status})` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: 'Lizenzserver nicht erreichbar.', offline: true };
  } finally {
    clearTimeout(timeout);
  }
}

// Ergebnis: { activated, warning?, reason?, customer? }
async function getStatus(userDataDir) {
  const hardwareId = getHardwareId(userDataDir);
  const stored = readStoredCertificate(userDataDir);

  if (!stored) {
    return { activated: false, hardwareId };
  }

  const verification = verifyCertificate(stored.certificate, hardwareId);
  if (!verification.valid) {
    return { activated: false, hardwareId, reason: verification.reason };
  }

  const now = new Date();
  if (verification.expiresAt > now) {
    return {
      activated: true,
      hardwareId,
      licenseKey: stored.licenseKey,
      customer: verification.payload.customer,
      validUntil: verification.expiresAt.toISOString()
    };
  }

  // Zertifikat abgelaufen -> im Hintergrund versuchen, es zu erneuern.
  const result = await postJson('/api/validate', { licenseKey: stored.licenseKey, hardwareId });
  if (result.ok) {
    const fresh = verifyCertificate(result.data.certificate, hardwareId);
    if (fresh.valid) {
      storeCertificate(userDataDir, stored.licenseKey, result.data.certificate);
      return {
        activated: true,
        hardwareId,
        licenseKey: stored.licenseKey,
        customer: fresh.payload.customer,
        validUntil: fresh.expiresAt.toISOString()
      };
    }
  }

  // Server nicht erreichbar oder Erneuerung fehlgeschlagen -> Gnadenfrist.
  const graceEnd = new Date(verification.expiresAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  if (now < graceEnd) {
    const daysLeft = Math.ceil((graceEnd - now) / (24 * 60 * 60 * 1000));
    return {
      activated: true,
      hardwareId,
      licenseKey: stored.licenseKey,
      customer: verification.payload.customer,
      validUntil: verification.expiresAt.toISOString(),
      warning: `Lizenz konnte nicht erneuert werden (keine Internetverbindung?). Noch ${daysLeft} Tag(e) nutzbar, bitte bald mit Internetverbindung starten.`
    };
  }

  return {
    activated: false,
    hardwareId,
    reason: result.error || 'Lizenz ist abgelaufen und konnte nicht erneuert werden. Bitte mit Internetverbindung erneut starten.'
  };
}

async function activate(userDataDir, licenseKey) {
  const hardwareId = getHardwareId(userDataDir);
  const trimmedKey = String(licenseKey || '').trim().toUpperCase();
  if (!trimmedKey) {
    return { ok: false, error: 'Bitte einen Lizenzschlüssel eingeben.' };
  }

  const result = await postJson('/api/activate', {
    licenseKey: trimmedKey,
    hardwareId,
    appVersion: require('../package.json').version
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const verification = verifyCertificate(result.data.certificate, hardwareId);
  if (!verification.valid) {
    return { ok: false, error: 'Vom Server erhaltenes Zertifikat ist ungültig: ' + verification.reason };
  }

  storeCertificate(userDataDir, trimmedKey, result.data.certificate);
  return {
    ok: true,
    customer: verification.payload.customer,
    validUntil: verification.expiresAt.toISOString()
  };
}

async function deactivateThisDevice(userDataDir) {
  const hardwareId = getHardwareId(userDataDir);
  const stored = readStoredCertificate(userDataDir);
  if (!stored) return { ok: true };

  await postJson('/api/deactivate', { licenseKey: stored.licenseKey, hardwareId });
  try {
    fs.unlinkSync(certFilePath(userDataDir));
  } catch (err) {
    // Datei existierte nicht mehr -> ignorieren
  }
  return { ok: true };
}

module.exports = { getStatus, activate, deactivateThisDevice };
