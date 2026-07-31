  // ===== Google-Drive-Einstellungen =====

  function updateTokenSecurityNote(settings) {
    const note = document.getElementById('tokenSecurityNote');
    if (!note) return;
    if (!settings || !settings.googleDriveToken) {
      note.textContent = '';
      note.className = 'token-security-note';
      return;
    }
    if (settings.driveTokenSecure) {
      note.textContent = '🔒 Sicher im OS-Schlüsselbund gespeichert (Windows Credential Manager / macOS Keychain / Secret Service).';
      note.className = 'token-security-note secure';
    } else {
      note.textContent = '⚠ Schlüsselbund auf diesem System nicht verfügbar – Token liegt als Klartext in der Einstellungsdatei.';
      note.className = 'token-security-note insecure';
    }
  }

  async function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const input = document.getElementById('driveTokenInput');
    const settings = await window.dashboardAPI.getSettings();
    input.value = (settings && settings.googleDriveToken) || '';
    updateTokenSecurityNote(settings);
    modal.classList.add('visible');
    input.focus();
  }

  function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('visible');
  }

  async function saveSettingsFromModal() {
    const input = document.getElementById('driveTokenInput');
    const settings = (await window.dashboardAPI.getSettings()) || {};
    settings.googleDriveToken = input.value.trim();
    await window.dashboardAPI.saveSettings(settings);
    const updated = await window.dashboardAPI.getSettings();
    updateTokenSecurityNote(updated);
    closeSettingsModal();
    showToast(
      settings.googleDriveToken
        ? updated && updated.driveTokenSecure
          ? 'Google-Drive-Token sicher im Schlüsselbund gespeichert.'
          : 'Google-Drive-Token gespeichert (Schlüsselbund nicht verfügbar, Klartext-Datei verwendet).'
        : 'Google-Drive-Token entfernt.'
    );
  }

