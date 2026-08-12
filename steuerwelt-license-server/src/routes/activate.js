const express = require('express');
const db = require('../db');
const { signPayload } = require('../crypto');

const router = express.Router();

function certificateValidityDays() {
  return Number(process.env.CERTIFICATE_VALIDITY_DAYS || 30);
}

function issueCertificate({ licenseKey, hardwareId, customerName }) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + certificateValidityDays() * 24 * 60 * 60 * 1000);
  return signPayload({
    licenseKey,
    hardwareId,
    customer: customerName,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });
}

router.post('/activate', (req, res) => {
  const { licenseKey, hardwareId, appVersion } = req.body || {};

  if (typeof licenseKey !== 'string' || typeof hardwareId !== 'string' || !licenseKey || !hardwareId) {
    return res.status(400).json({ error: 'licenseKey und hardwareId sind erforderlich.' });
  }

  const license = db.getLicenseByKey(licenseKey.trim().toUpperCase());
  if (!license) {
    return res.status(404).json({ error: 'Unbekannter Lizenzschlüssel.' });
  }
  if (license.revoked) {
    return res.status(403).json({ error: 'Dieser Lizenzschlüssel wurde gesperrt.' });
  }

  let activation = db.getActivation(license.id, hardwareId);

  if (activation && !activation.deactivated_at) {
    // Bereits aktiviertes Gerät -> nur Zertifikat erneuern.
    db.touchActivation(license.id, hardwareId);
  } else {
    const activeCount = db.countActiveActivations(license.id);
    if (activeCount >= license.seats) {
      return res.status(409).json({
        error: `Alle ${license.seats} Geräteplätze dieser Lizenz sind belegt. Ein anderes Gerät muss zuerst deaktiviert werden.`
      });
    }
    if (activation) {
      db.touchActivation(license.id, hardwareId);
    } else {
      db.createActivation(license.id, hardwareId);
    }
  }

  const certificate = issueCertificate({
    licenseKey: license.license_key,
    hardwareId,
    customerName: license.customer_name
  });

  res.json({ certificate, customer: license.customer_name, appVersion: appVersion || null });
});

module.exports = router;
module.exports.issueCertificate = issueCertificate;
