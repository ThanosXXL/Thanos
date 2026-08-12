const express = require('express');
const db = require('../db');
const { issueCertificate } = require('./activate');

const router = express.Router();

router.post('/validate', (req, res) => {
  const { licenseKey, hardwareId } = req.body || {};

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

  const activation = db.getActivation(license.id, hardwareId);
  if (!activation || activation.deactivated_at) {
    return res.status(404).json({ error: 'Dieses Gerät ist für diese Lizenz nicht aktiviert.' });
  }

  db.touchActivation(license.id, hardwareId);

  const certificate = issueCertificate({
    licenseKey: license.license_key,
    hardwareId,
    customerName: license.customer_name
  });

  res.json({ certificate, customer: license.customer_name });
});

module.exports = router;
