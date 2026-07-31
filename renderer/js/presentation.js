  // ===== PowerPoint-Präsentation teilen (auf allen Bildschirmen) =====

  async function sharePowerPoint(dozent) {
    const result = await window.dashboardAPI.openFileDialog({
      title: 'PowerPoint-Präsentation auswählen',
      filters: [{ name: 'PowerPoint', extensions: ['pptx', 'ppt', 'ppsx', 'pps'] }],
      multiSelections: false
    });
    if (result.canceled || !result.files.length) return;

    pendingPresentationFile = result.files[0];
    presentTargetDozentId = dozent.id;
    document.getElementById('presentFileName').textContent = '📊 ' + pendingPresentationFile.name;
    const input = document.getElementById('presenterNameInput');
    input.value = '';
    document.getElementById('presentModal').classList.add('visible');
    input.focus();
  }

  function closePresentModal() {
    pendingPresentationFile = null;
    presentTargetDozentId = null;
    document.getElementById('presentModal').classList.remove('visible');
  }

  function confirmPresent() {
    if (!pendingPresentationFile || !presentTargetDozentId) return;
    const dozent = findDozent(presentTargetDozentId);
    if (!dozent) return;
    const presenter = document.getElementById('presenterNameInput').value.trim() || 'Unbekannt';

    dozent.presentation = {
      name: pendingPresentationFile.name,
      presenter,
      time: nowStr()
    };
    const fileName = dozent.presentation.name;
    closePresentModal();
    persist();
    render();
    updateLessonPresentationLabel(dozent);
    if (roomClient.connected) {
      roomClient.broadcast({
        kind: 'presentation-start',
        dozentId: dozent.id,
        name: dozent.presentation.name,
        presenter: dozent.presentation.presenter,
        time: dozent.presentation.time
      });
    }
    showToast(`"${fileName}" wird von ${presenter} auf allen Bildschirmen geteilt.`);
  }

  function stopPresenting(dozent) {
    dozent.presentation = null;
    persist();
    render();
    updateLessonPresentationLabel(dozent);
    if (roomClient.connected) {
      roomClient.broadcast({ kind: 'presentation-stop', dozentId: dozent.id });
    }
    showToast('Präsentation beendet.');
  }

  // Aktualisiert die Anzeige im Video-Chat-Fenster, falls es gerade für diesen Dozenten offen ist.
  function updateLessonPresentationLabel(dozent) {
    const label = document.getElementById('lessonVideoLabel');
    if (!label || !activeVideoDozent || activeVideoDozent.id !== dozent.id) return;
    label.textContent = dozent.presentation
      ? `📊 ${dozent.presentation.presenter} präsentiert: ${dozent.presentation.name}`
      : 'Live-Übertragung – Unterricht';
  }

