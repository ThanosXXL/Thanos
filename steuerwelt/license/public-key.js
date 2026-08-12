// Öffentlicher Ed25519-Schlüssel zur Prüfung der Aktivierungszertifikate.
//
// !!! ACHTUNG vor der ersten echten Auslieferung an Kunden !!!
// Der Schlüssel unten ist ein Entwicklungs-/Test-Schlüssel, der nur zum
// Prüfen dieses Repositories dient. Bevor SteuerWelt an echte Kunden
// verteilt wird:
//
//   1. Auf dem Lizenzserver einmalig ausführen:
//        cd steuerwelt-license-server && npm run generate-keys
//   2. Den Inhalt der erzeugten Datei keys/public.pem hier unten einsetzen.
//   3. keys/private.pem bleibt ausschließlich auf dem Lizenzserver.
//
// Wird dieser Schritt übersprungen, akzeptiert die ausgelieferte App
// Zertifikate, die mit dem hier bekannten (unsicheren) Test-Schlüssel
// signiert wurden — kein echter Kopierschutz.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAf/p1ibLVqW2oYjEASjBVU9x6UxDQi3yHFJfQUZoLFwM=
-----END PUBLIC KEY-----
`;

module.exports = { PUBLIC_KEY_PEM };
