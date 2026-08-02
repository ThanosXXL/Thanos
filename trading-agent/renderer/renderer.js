(() => {
  const questionInput = document.getElementById('questionInput');
  const micBtn = document.getElementById('micBtn');
  const snipingBtn = document.getElementById('snipingBtn');
  const vorlesenBtn = document.getElementById('vorlesenBtn');
  const saveAsBtn = document.getElementById('saveAsBtn');
  const googleBtn = document.getElementById('googleBtn');
  const answerText = document.getElementById('answerText');
  const demoBanner = document.getElementById('demoBanner');

  if (window.IS_DEMO) {
    demoBanner.hidden = false;
  }

  function setAnswer(text) {
    answerText.textContent = text;
  }

  // Bestätigungsdialog (schwarz/gold), bevor Sniping/Vorlesen/Speichern unter ausgeführt wird
  function showConfirmModal(message, onConfirmed) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const box = document.createElement('div');
    box.className = 'confirm-box';

    const msg = document.createElement('p');
    msg.textContent = message;

    const row = document.createElement('div');
    row.className = 'confirm-actions';

    const yes = document.createElement('button');
    yes.className = 'btn-gold';
    yes.textContent = 'Bestätigen';

    const no = document.createElement('button');
    no.className = 'btn-gold';
    no.textContent = 'Abbrechen';

    yes.addEventListener('click', () => {
      overlay.remove();
      onConfirmed();
    });
    no.addEventListener('click', () => overlay.remove());

    row.appendChild(yes);
    row.appendChild(no);
    box.appendChild(msg);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function askQuestion() {
    const question = questionInput.value.trim();
    if (!question) return;
    setAnswer(`Frage: "${question}" – Antwort folgt, sobald der Assistent angebunden ist.`);
    questionInput.value = '';
  }

  questionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      askQuestion();
    }
  });

  // Mikrofon: Frage per Sprache eingeben (Web Speech API)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener('result', (event) => {
      const transcript = event.results[0][0].transcript;
      questionInput.value = transcript;
    });

    recognition.addEventListener('end', () => {
      listening = false;
      micBtn.classList.remove('is-active');
      micBtn.setAttribute('aria-pressed', 'false');
    });

    recognition.addEventListener('error', () => {
      listening = false;
      micBtn.classList.remove('is-active');
      micBtn.setAttribute('aria-pressed', 'false');
    });
  }

  micBtn.addEventListener('click', () => {
    if (!recognition) {
      setAnswer('Spracherkennung wird von diesem System nicht unterstützt.');
      return;
    }
    if (listening) {
      recognition.stop();
      return;
    }
    listening = true;
    micBtn.classList.add('is-active');
    micBtn.setAttribute('aria-pressed', 'true');
    recognition.start();
  });

  // Sniping: Screenshot des Fensters aufnehmen (nach Bestätigung)
  snipingBtn.addEventListener('click', () => {
    showConfirmModal('Jetzt einen Screenshot des Fensters aufnehmen?', async () => {
      const result = await window.freshTradesAPI.captureSniping();
      setAnswer(result.saved ? `Screenshot gespeichert unter: ${result.filePath}` : 'Screenshot wurde nicht gespeichert.');
    });
  });

  // Vorlesen: Antwort per Sprachausgabe vorlesen (nach Bestätigung)
  vorlesenBtn.addEventListener('click', () => {
    showConfirmModal('Die aktuelle Antwort jetzt vorlesen?', () => {
      if (!('speechSynthesis' in window)) {
        setAnswer('Sprachausgabe wird von diesem System nicht unterstützt.');
        return;
      }
      const utterance = new SpeechSynthesisUtterance(answerText.textContent);
      utterance.lang = 'de-DE';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  });

  // Seite speichern unter: Frage & Antwort als Textdatei sichern (nach Bestätigung)
  saveAsBtn.addEventListener('click', () => {
    showConfirmModal('Die aktuelle Seite jetzt speichern?', async () => {
      const content = `Frage/Antwort – FreshTrades\n\n${answerText.textContent}\n`;
      const result = await window.freshTradesAPI.saveAs(content);
      if (result.saved) {
        setAnswer(`Gespeichert unter: ${result.filePath}`);
      }
    });
  });

  // Google: Verbindungsstatus umschalten (Platzhalter bis echte OAuth-Anbindung erfolgt)
  let googleConnected = false;
  googleBtn.addEventListener('click', () => {
    googleConnected = !googleConnected;
    googleBtn.textContent = googleConnected ? 'Google verbunden' : 'Mit Google anmelden';
    googleBtn.classList.toggle('is-active', googleConnected);
  });
})();
