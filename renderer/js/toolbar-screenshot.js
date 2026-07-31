  // ===== Werkzeugleiste (Screenshot, Sniping, Video-Chat, Audio/Video) =====

  function mkToolBtn(label, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.textContent = label;
    if (title) btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function buildToolbar(dozent) {
    const bar = document.createElement('div');
    bar.className = 'panel-toolbar';

    bar.appendChild(mkToolBtn('📷 Screenshot', 'Ganzen Bildschirm aufnehmen', () => takeScreenshot(false)));
    bar.appendChild(mkToolBtn('✂️ Sniping', 'Bereichsauswahl-Screenshot', () => takeScreenshot(true)));
    bar.appendChild(
      mkToolBtn('📊 PowerPoint', 'PowerPoint-Präsentation auf allen Bildschirmen teilen', () =>
        sharePowerPoint(dozent)
      )
    );
    bar.appendChild(mkToolBtn('⚙ Drive', 'Google Drive verbinden', openSettingsModal));
    bar.appendChild(mkToolBtn('🎥 Video-Chat', 'Video-Live-Chat öffnen', () => openVideoChat(dozent)));

    const audioToggle = mkToolBtn('🎤 Audio', 'Audio an/aus', toggleAudio);
    audioToggle.dataset.mediaToggle = 'audio';
    bar.appendChild(audioToggle);

    const videoToggle = mkToolBtn('📹 Video', 'Video an/aus', toggleVideo);
    videoToggle.dataset.mediaToggle = 'video';
    bar.appendChild(videoToggle);

    // Zustände der Umschalter nach dem Neuzeichnen anwenden
    updateMediaButtons();
    return bar;
  }

  function buildPresentationBanner(dozent) {
    const banner = document.createElement('div');
    banner.className = 'presentation-banner';

    const text = document.createElement('span');
    text.textContent = `📊 "${dozent.presentation.name}" wird von ${dozent.presentation.presenter} auf allen Bildschirmen geteilt (seit ${dozent.presentation.time})`;

    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn-secondary btn-sm';
    stopBtn.textContent = 'Beenden';
    stopBtn.addEventListener('click', () => stopPresenting(dozent));

    banner.appendChild(text);
    banner.appendChild(stopBtn);
    return banner;
  }

  // ===== Screenshot / Sniping =====

  async function takeScreenshot(sniping) {
    let dataUrl = await window.dashboardAPI.captureScreen();
    if (!dataUrl) {
      showToast('Screenshot fehlgeschlagen – keine Bildschirmquelle verfügbar.', true);
      return;
    }

    if (sniping) {
      dataUrl = await runSnipSelection(dataUrl);
      if (!dataUrl) return; // abgebrochen oder zu kleiner Bereich
    }

    const result = await window.dashboardAPI.saveScreenshot({ dataUrl, toDrive: true });
    if (!result || !result.ok) {
      showToast('Screenshot konnte nicht gespeichert werden.', true);
      return;
    }

    let msg = `Screenshot gespeichert: ${result.filePath}`;
    let isDriveError = false;
    if (result.drive) {
      if (result.drive.ok) {
        msg += ' · in Google Drive hochgeladen ✓';
      } else if (result.drive.reason === 'no-token') {
        msg += ' · Google Drive: kein Token hinterlegt (⚙ Drive)';
      } else if (result.drive.reason === 'token-expired') {
        msg += ' · Google-Drive-Token abgelaufen oder ungültig – bitte im ⚙ Drive-Fenster einen neuen Token eintragen.';
        isDriveError = true;
      } else {
        msg += ` · Google Drive fehlgeschlagen (${result.drive.reason})`;
        isDriveError = true;
      }
    }
    showToast(msg, isDriveError);
  }

  function runSnipSelection(dataUrl) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('snipOverlay');
      const img = document.getElementById('snipImage');
      const sel = document.getElementById('snipSelection');
      const dim = overlay.querySelector('.snip-dim');

      img.src = dataUrl;
      overlay.classList.add('visible');
      sel.style.display = 'none';

      let startX = 0;
      let startY = 0;
      let dragging = false;

      function updateSel(x, y) {
        const left = Math.min(startX, x);
        const top = Math.min(startY, y);
        sel.style.left = left + 'px';
        sel.style.top = top + 'px';
        sel.style.width = Math.abs(x - startX) + 'px';
        sel.style.height = Math.abs(y - startY) + 'px';
      }

      function onDown(e) {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        dim.style.display = 'none';
        sel.style.display = 'block';
        updateSel(e.clientX, e.clientY);
      }

      function onMove(e) {
        if (dragging) updateSel(e.clientX, e.clientY);
      }

      function cleanup() {
        overlay.removeEventListener('mousedown', onDown);
        overlay.removeEventListener('mousemove', onMove);
        overlay.removeEventListener('mouseup', onUp);
        document.removeEventListener('keydown', onKey);
        overlay.classList.remove('visible');
        sel.style.display = 'none';
        dim.style.display = '';
      }

      function onUp(e) {
        if (!dragging) return;
        dragging = false;
        const rect = {
          left: Math.min(startX, e.clientX),
          top: Math.min(startY, e.clientY),
          width: Math.abs(e.clientX - startX),
          height: Math.abs(e.clientY - startY)
        };
        cleanup();
        if (rect.width < 5 || rect.height < 5) {
          resolve(null);
          return;
        }
        cropImage(dataUrl, rect, img.clientWidth, img.clientHeight).then(resolve);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      }

      overlay.addEventListener('mousedown', onDown);
      overlay.addEventListener('mousemove', onMove);
      overlay.addEventListener('mouseup', onUp);
      document.addEventListener('keydown', onKey);
    });
  }

  function cropImage(dataUrl, rect, displayW, displayH) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const scaleX = image.naturalWidth / displayW;
        const scaleY = image.naturalHeight / displayH;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(rect.width * scaleX));
        canvas.height = Math.max(1, Math.round(rect.height * scaleY));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          image,
          rect.left * scaleX,
          rect.top * scaleY,
          rect.width * scaleX,
          rect.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
  }

