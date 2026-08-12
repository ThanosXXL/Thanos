// Erzeugt einmalig das Ed25519-Schlüsselpaar für den Lizenzserver.
//   node scripts/generate-keys.js
//
// keys/private.pem  -> geheim, bleibt NUR auf dem Server (nicht committen)
// keys/public.pem   -> öffentlich, wird in die SteuerWelt-App eingebaut
//                      (steuerwelt/license/public-key.js)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', 'keys');
fs.mkdirSync(keysDir, { recursive: true });

const privatePath = path.join(keysDir, 'private.pem');
if (fs.existsSync(privatePath)) {
  console.error(
    `Es existiert bereits ein Schlüsselpaar unter ${privatePath}.\n` +
      'Ein neues Paar würde alle bisher ausgestellten Lizenzzertifikate ungültig machen ' +
      '(die App prüft gegen den fest eingebauten alten Public Key). Vorher löschen, ' +
      'falls das wirklich gewollt ist.'
  );
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

fs.writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey.export({ type: 'spki', format: 'pem' }));

console.log('Schlüsselpaar erzeugt:');
console.log('  keys/private.pem  (geheim halten, nur auf dem Server)');
console.log('  keys/public.pem   (in die SteuerWelt-App einbauen)');
console.log('');
console.log('Nächster Schritt: den Inhalt von keys/public.pem in');
console.log('steuerwelt/license/public-key.js einsetzen.');
