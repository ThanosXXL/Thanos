(function () {
  if (window.__freshtradesBar) {
    return;
  }
  window.__freshtradesBar = true;

  var GOLD = '#FFD700';
  var GOLD_DARK = '#7A5C00';

  // SRI-Hash für html2canvas 1.4.1, berechnet aus dist/html2canvas.min.js im
  // offiziellen npm-Paket (siehe README, Abschnitt "Bekannte offene Sicherheitslücke").
  var HTML2CANVAS_SRI = 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H';

  function styleIconBtn(el) {
    el.style.cssText =
      'width:44px;height:44px;margin-left:6px;border-radius:12px;border:1px solid ' + GOLD_DARK +
      ';background:linear-gradient(180deg,#3c3c3c,#141414 55%,#000);color:' + GOLD +
      ';font-size:18px;box-shadow:0 4px 8px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.18),inset 0 -3px 6px rgba(0,0,0,.65);' +
      'text-shadow:0 1px 1px #000;font-family:sans-serif;';
  }

  function styleTextBtn(el) {
    el.style.cssText =
      'padding:10px 16px;border-radius:12px;border:1px solid ' + GOLD_DARK +
      ';background:linear-gradient(180deg,#3c3c3c,#141414 55%,#000);color:' + GOLD +
      ';box-shadow:0 4px 8px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.18),inset 0 -3px 6px rgba(0,0,0,.65);' +
      'text-shadow:0 1px 1px #000;font-family:sans-serif;';
  }

  var bar = document.createElement('div');
  bar.style.cssText =
    'position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;' +
    'background:#000;padding:8px;border-radius:16px;box-shadow:0 6px 16px rgba(0,0,0,.7);';

  function makeIconBtn(label, title, onClick) {
    var b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    styleIconBtn(b);
    b.addEventListener('click', onClick);
    bar.appendChild(b);
    return b;
  }

  function showConfirm(message, onYes) {
    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2147483647;' +
      'display:flex;align-items:center;justify-content:center;';

    var box = document.createElement('div');
    box.style.cssText =
      'background:#141414;border:1px solid ' + GOLD_DARK + ';border-radius:14px;padding:20px;' +
      'max-width:320px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.8);';

    var msg = document.createElement('p');
    msg.textContent = message;
    msg.style.cssText = 'color:' + GOLD + ';font-family:sans-serif;margin:0 0 16px;';

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center;';

    var yes = document.createElement('button');
    yes.textContent = 'Bestätigen';
    styleTextBtn(yes);

    var no = document.createElement('button');
    no.textContent = 'Abbrechen';
    styleTextBtn(no);

    yes.onclick = function () {
      document.body.removeChild(overlay);
      onYes();
    };
    no.onclick = function () {
      document.body.removeChild(overlay);
    };

    row.appendChild(yes);
    row.appendChild(no);
    box.appendChild(msg);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // Mikrofon: Frage per Sprache in das Google-Suchfeld eintragen und absenden
  makeIconBtn('🎤', 'Frage per Mikrofon eingeben', function () {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Spracherkennung wird von diesem Browser nicht unterstützt.');
      return;
    }
    var recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.onresult = function (event) {
      var transcript = event.results[0][0].transcript;
      var input = document.querySelector('input[name="q"], textarea[name="q"]');
      if (input) {
        input.value = transcript;
        if (input.form) {
          input.form.submit();
        }
      } else {
        alert('Erkannt: ' + transcript);
      }
    };
    recognition.start();
  });

  // Sniping: Screenshot der aktuellen Seite (via html2canvas) nach Bestätigung
  makeIconBtn('🎯', 'Sniping – Screenshot aufnehmen', function () {
    showConfirm('Jetzt einen Screenshot der aktuellen Seite aufnehmen?', function () {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      if (HTML2CANVAS_SRI) {
        script.integrity = HTML2CANVAS_SRI;
        script.crossOrigin = 'anonymous';
      }
      script.onload = function () {
        window.html2canvas(document.body).then(function (canvas) {
          var link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = 'freshtrades-sniping-' + Date.now() + '.png';
          document.body.appendChild(link);
          link.click();
          link.remove();
        });
      };
      document.body.appendChild(script);
    });
  });

  // Vorlesen: Seiteninhalt per Sprachausgabe vorlesen nach Bestätigung
  makeIconBtn('🔊', 'Vorlesen', function () {
    showConfirm('Die aktuelle Seite jetzt vorlesen?', function () {
      if (!('speechSynthesis' in window)) {
        alert('Sprachausgabe wird von diesem Browser nicht unterstützt.');
        return;
      }
      var utterance = new SpeechSynthesisUtterance(document.body.innerText.slice(0, 4000));
      utterance.lang = 'de-DE';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  });

  // Speichern unter: Seiteninhalt als Textdatei herunterladen nach Bestätigung
  makeIconBtn('💾', 'Seite speichern unter', function () {
    showConfirm('Die aktuelle Seite jetzt speichern?', function () {
      var blob = new Blob([document.body.innerText], { type: 'text/plain' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'freshtrades-seite-' + Date.now() + '.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  });

  document.body.appendChild(bar);
})();
