// Leitet eine möglichst stabile, an das Gerät gebundene ID ab, ohne eine
// zusätzliche Abhängigkeit einzuführen. Nutzt betriebssystemeigene
// Maschinen-Kennungen; nur wenn die nicht lesbar sind, wird ersatzweise
// eine einmalig erzeugte, lokal gespeicherte ID verwendet (dann ist die
// Bindung an die Installation, nicht mehr zwingend an die Hardware selbst).
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function readPlatformMachineId() {
  try {
    if (process.platform === 'linux') {
      for (const p of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        if (fs.existsSync(p)) {
          const id = fs.readFileSync(p, 'utf-8').trim();
          if (id) return id;
        }
      }
    } else if (process.platform === 'darwin') {
      const out = execSync('ioreg -rd1 -c IOPlatformExpertDevice').toString();
      const match = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match) return match[1];
    } else if (process.platform === 'win32') {
      const out = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid').toString();
      const match = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/i);
      if (match) return match[1];
    }
  } catch (err) {
    // OS-Aufruf fehlgeschlagen (Berechtigung, Sandbox, ...) -> Fallback unten.
  }
  return null;
}

function getPersistedFallbackId(userDataDir) {
  const fallbackPath = path.join(userDataDir, 'device-fallback-id.txt');
  try {
    const existing = fs.readFileSync(fallbackPath, 'utf-8').trim();
    if (existing) return existing;
  } catch (err) {
    // Datei existiert noch nicht -> neu anlegen.
  }
  const id = crypto.randomUUID();
  fs.writeFileSync(fallbackPath, id, 'utf-8');
  return id;
}

function getHardwareId(userDataDir) {
  const raw = readPlatformMachineId() || getPersistedFallbackId(userDataDir);
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 40);
}

module.exports = { getHardwareId };
