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

  // Sniping: Umschalter für den Sniping-Modus
  let snipingActive = false;
  snipingBtn.addEventListener('click', () => {
    snipingActive = !snipingActive;
    snipingBtn.classList.toggle('is-active', snipingActive);
    snipingBtn.setAttribute('aria-pressed', String(snipingActive));
    snipingBtn.textContent = snipingActive ? 'Sniping: Aktiv' : 'Sniping';
  });

  // Vorlesen: Antwort per Sprachausgabe vorlesen
  vorlesenBtn.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      setAnswer('Sprachausgabe wird von diesem System nicht unterstützt.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(answerText.textContent);
    utterance.lang = 'de-DE';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });

  // Seite speichern unter: Frage & Antwort als Textdatei sichern
  saveAsBtn.addEventListener('click', async () => {
    const content = `Frage/Antwort – FreshTrades\n\n${answerText.textContent}\n`;
    const result = await window.freshTradesAPI.saveAs(content);
    if (result.saved) {
      setAnswer(`Gespeichert unter: ${result.filePath}`);
    }
  });

  // Google: Verbindungsstatus umschalten (Platzhalter bis echte OAuth-Anbindung erfolgt)
  let googleConnected = false;
  googleBtn.addEventListener('click', () => {
    googleConnected = !googleConnected;
    googleBtn.textContent = googleConnected ? 'Google verbunden' : 'Mit Google anmelden';
    googleBtn.classList.toggle('is-active', googleConnected);
  });
})();
