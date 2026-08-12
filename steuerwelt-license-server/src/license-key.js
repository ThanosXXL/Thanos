const crypto = require('crypto');

// Crockford-ähnliches Alphabet ohne 0/O und 1/I, damit Kunden Schlüssel
// fehlerfrei abtippen können.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomGroup(length) {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

// Erzeugt z. B. "STWL-7K4N-QX2M-9PLR-4VJC"
function generateLicenseKey() {
  const groups = ['STWL', randomGroup(4), randomGroup(4), randomGroup(4), randomGroup(4)];
  return groups.join('-');
}

module.exports = { generateLicenseKey };
