// ===== Event-Verdrahtung & App-Start =====
// Muss als LETZTE Datei geladen werden, da hier auf alle anderen Module zugegriffen wird.

  // Download-Seite: in Electron über ein eigenes Fenster öffnen (target="_blank"
  // funktioniert dort standardmäßig nicht); im echten Browser normal per Link/Tab.
  const headerDownloadLink = document.querySelector('.header-download-link');
  if (headerDownloadLink && !window.__isBrowserFallback && window.dashboardAPI && window.dashboardAPI.openDownloadPage) {
    headerDownloadLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.dashboardAPI.openDownloadPage();
    });
  }

  document.getElementById('addDozentEmptyBtn').addEventListener('click', openAddDozentModal);
  document.getElementById('cancelAddDozent').addEventListener('click', closeAddDozentModal);
  document.getElementById('confirmAddDozent').addEventListener('click', confirmAddDozent);
  newDozentNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddDozent();
  });

  document.getElementById('cancelDeleteDozent').addEventListener('click', closeDeleteDozentModal);
  document.getElementById('confirmDeleteDozent').addEventListener('click', confirmDeleteDozent);

  // Video-Chat-Fenster
  document.getElementById('closeVideoChat').addEventListener('click', closeVideoChat);
  document.getElementById('videoHangup').addEventListener('click', closeVideoChat);
  document.getElementById('videoToggleAudio').addEventListener('click', toggleAudio);
  document.getElementById('videoToggleVideo').addEventListener('click', toggleVideo);

  // Echter Mehrgeräte-Video-Chat: Verbindung zum Signaling-Server
  document.getElementById('roomConnectBtn').addEventListener('click', connectToRoom);
  document.getElementById('roomDisconnectBtn').addEventListener('click', disconnectFromRoom);

  // Moderation: Melden / Alle stummschalten
  document.getElementById('raiseHandBtn').addEventListener('click', raiseLocalHand);
  document.getElementById('muteAllBtn').addEventListener('click', toggleMuteAll);

  // Teilnehmer, Unterrichts-Chat, Privat-/Gruppenchat
  document.getElementById('addParticipantBtn').addEventListener('click', showAddParticipant);
  document.getElementById('confirmParticipantBtn').addEventListener('click', confirmAddParticipant);
  document.getElementById('cancelParticipantBtn').addEventListener('click', cancelAddParticipant);
  document.getElementById('newParticipantName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddParticipant();
    if (e.key === 'Escape') cancelAddParticipant();
  });
  document.getElementById('lessonChatSend').addEventListener('click', sendLessonMessage);
  document.getElementById('lessonChatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendLessonMessage();
  });
  document.getElementById('pauseBtn').addEventListener('click', enterPause);
  document.getElementById('newGroupBtn').addEventListener('click', startGroupBuilder);
  document.getElementById('createGroupBtn').addEventListener('click', createGroup);
  document.getElementById('cancelGroupBtn').addEventListener('click', cancelGroupBuilder);

  // Dateifreigabe
  document.getElementById('fileShareToggle').addEventListener('change', (e) => {
    setFileShareEnabled(e.target.checked);
  });
  document.getElementById('openFileBtn').addEventListener('click', chooseFileToShare);
  document.getElementById('videoShareFile').addEventListener('click', chooseFileToShare);
  document.getElementById('confirmShareBtn').addEventListener('click', confirmShare);
  document.getElementById('cancelShareBtn').addEventListener('click', clearPendingShare);

  // Google-Drive-Einstellungen
  document.getElementById('cancelSettings').addEventListener('click', closeSettingsModal);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettingsFromModal);

  // PowerPoint-Präsentation teilen
  document.getElementById('cancelPresent').addEventListener('click', closePresentModal);
  document.getElementById('confirmPresent').addEventListener('click', confirmPresent);
  document.getElementById('presenterNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmPresent();
    if (e.key === 'Escape') closePresentModal();
  });

  async function init() {
    const loaded = await window.dashboardAPI.loadData();
    state = loaded && Array.isArray(loaded.dozenten) ? loaded : { dozenten: [] };
    state.dozenten.forEach((d) => {
      if (!Array.isArray(d.chat)) d.chat = [];
      if (!Array.isArray(d.homework)) d.homework = [];
      if (!Array.isArray(d.exams)) d.exams = [];
      if (d.presentation === undefined) d.presentation = null;
    });
    activeDozentId = state.dozenten.length ? state.dozenten[0].id : null;
    setFileShareEnabled(document.getElementById('fileShareToggle').checked);
    startClock();
    render();
  }

  init();
