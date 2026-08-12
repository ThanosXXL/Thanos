const crypto = require('crypto');
const fs = require('fs');
const { canonicalize } = require('./canonical');

function loadPrivateKey() {
  const path = process.env.LICENSE_SERVER_PRIVATE_KEY_PATH || './keys/private.pem';
  const pem = fs.readFileSync(path, 'utf-8');
  return crypto.createPrivateKey(pem);
}

// Signiert ein JSON-fähiges Objekt (das "payload" eines Zertifikats) und
// gibt {payload, signature} zurück. signature ist Base64.
function signPayload(payload) {
  const privateKey = loadPrivateKey();
  const message = Buffer.from(canonicalize(payload), 'utf-8');
  const signature = crypto.sign(null, message, privateKey).toString('base64');
  return { payload, signature };
}

module.exports = { signPayload };
