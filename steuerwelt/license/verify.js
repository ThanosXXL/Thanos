const crypto = require('crypto');
const { canonicalize } = require('./canonical');
const { PUBLIC_KEY_PEM } = require('./public-key');

// Prüft rein lokal (offline), ob ein vom Lizenzserver ausgestelltes
// Zertifikat echt ist und zum aktuellen Gerät passt. Gibt niemals einen
// Netzwerkfehler zurück — das ist Aufgabe von activation.js.
function verifyCertificate(certificate, expectedHardwareId) {
  if (!certificate || !certificate.payload || !certificate.signature) {
    return { valid: false, reason: 'Zertifikat unvollständig.' };
  }

  let signatureOk = false;
  try {
    const publicKey = crypto.createPublicKey(PUBLIC_KEY_PEM);
    const message = Buffer.from(canonicalize(certificate.payload), 'utf-8');
    signatureOk = crypto.verify(null, message, publicKey, Buffer.from(certificate.signature, 'base64'));
  } catch (err) {
    return { valid: false, reason: 'Zertifikat konnte nicht geprüft werden.' };
  }
  if (!signatureOk) {
    return { valid: false, reason: 'Signatur ungültig.' };
  }

  if (certificate.payload.hardwareId !== expectedHardwareId) {
    return { valid: false, reason: 'Zertifikat gehört zu einem anderen Gerät.' };
  }

  const expiresAt = new Date(certificate.payload.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return { valid: false, reason: 'Ungültiges Ablaufdatum im Zertifikat.' };
  }

  return { valid: true, expiresAt, payload: certificate.payload };
}

module.exports = { verifyCertificate };
