const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/deactivate', (req, res) => {
  const { licenseKey, hardwareId } = req.body || {};

  if (typeof licenseKey !== 'string' || typeof hardwareId !== 'string' || !licenseKey || !hardwareId) {
    return res.status(400).json({ error: 'licenseKey und hardwareId sind erforderlich.' });
  }

  const license = db.getLicenseByKey(licenseKey.trim().toUpperCase());
  if (!license) {
    return res.status(404).json({ error: 'Unbekannter Lizenzschlüssel.' });
  }

  const activation = db.getActivation(license.id, hardwareId);
  if (!activation || activation.deactivated_at) {
    return res.status(404).json({ error: 'Dieses Gerät ist für diese Lizenz nicht aktiv.' });
  }

  db.deactivate(license.id, hardwareId);
  res.json({ ok: true });
});

module.exports = router;
