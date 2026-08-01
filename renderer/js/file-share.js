// ===== Dateifreigabe im Video-Chat-Fenster =====

let fileShareEnabled = false;
let pendingShareFile = null;
let sharedFiles = [];

  // ===== Dateifreigabe =====

  function setFileShareEnabled(enabled) {
    fileShareEnabled = enabled;
    const openBtn = document.getElementById('openFileBtn');
    const iconBtn = document.getElementById('videoShareFile');
    if (openBtn) openBtn.disabled = !enabled;
    if (iconBtn) iconBtn.disabled = !enabled;
    if (!enabled) clearPendingShare();
  }

  async function chooseFileToShare() {
    if (!fileShareEnabled) {
      showToast('Bitte zuerst die Dateifreigabe einschalten.', true);
      return;
    }
    const result = await window.dashboardAPI.openFileDialog();
    if (result.canceled || !result.files.length) return;
    // Mehrfachauswahl: erste Datei in die Bestätigung, restliche direkt vormerken
    pendingShareFile = result.files;
    showPendingShare();
  }

  function showPendingShare() {
    const box = document.getElementById('fileSharePending');
    const name = document.getElementById('pendingFileName');
    if (!pendingShareFile) {
      box.hidden = true;
      return;
    }
    const label =
      pendingShareFile.length === 1
        ? pendingShareFile[0].name
        : `${pendingShareFile.length} Dateien`;
    name.textContent = label;
    box.hidden = false;
  }

  function clearPendingShare() {
    pendingShareFile = null;
    const box = document.getElementById('fileSharePending');
    if (box) box.hidden = true;
  }

  function confirmShare() {
    if (!pendingShareFile) return;
    const target = document.getElementById('shareTargetSelect').value;
    const targetLabel = target === 'alle' ? 'Alle Teilnehmer' : 'Nur Dozent';
    pendingShareFile.forEach((file) => {
      sharedFiles.push({
        id: uid(),
        name: file.name,
        target,
        targetLabel,
        time: new Date().toLocaleString('de-DE', {
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    });
    const count = pendingShareFile.length;
    clearPendingShare();
    renderSharedFiles();
    showToast(`${count} Datei(en) mit "${targetLabel}" geteilt.`);
  }

  function renderSharedFiles() {
    const list = document.getElementById('sharedFileList');
    if (!list) return;
    list.innerHTML = '';
    sharedFiles.forEach((sf) => {
      const li = document.createElement('li');

      const icon = document.createElement('span');
      icon.textContent = '📄';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'sf-name';
      nameSpan.textContent = `${sf.name} · ${sf.time}`;

      const targetSpan = document.createElement('span');
      targetSpan.className = 'sf-target' + (sf.target === 'alle' ? ' alle' : '');
      targetSpan.textContent = sf.targetLabel;

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn danger';
      delBtn.textContent = '✕';
      delBtn.title = 'Freigabe entfernen';
      delBtn.addEventListener('click', () => {
        sharedFiles = sharedFiles.filter((f) => f.id !== sf.id);
        renderSharedFiles();
      });

      li.appendChild(icon);
      li.appendChild(nameSpan);
      li.appendChild(targetSpan);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }

