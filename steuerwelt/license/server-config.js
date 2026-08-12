// Adresse des SteuerWelt-Lizenzservers (steuerwelt-license-server/).
//
// Für lokale Entwicklung per Umgebungsvariable überschreibbar. Für den
// fertigen Installer, der an Kunden geht, hier die echte HTTPS-Adresse des
// selbst gehosteten Servers eintragen (siehe
// steuerwelt-license-server/README.md für Deployment-Optionen).
const LICENSE_SERVER_URL =
  process.env.STEUERWELT_LICENSE_SERVER_URL || 'https://license.steuerwelt.example.com';

module.exports = { LICENSE_SERVER_URL };
