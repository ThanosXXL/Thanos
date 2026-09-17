const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const dataFilePath = path.join(app.getPath('userData'), 'fotonetz-data.json');
const mediaRootPath = path.join(app.getPath('userData'), 'fotonetz-media');

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { auftraege: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function auftragMediaDir(auftragId) {
  return path.join(mediaRootPath, auftragId);
}

function originalsDir(auftragId) {
  return ensureDir(path.join(auftragMediaDir(auftragId), 'originale'));
}

function editedDir(auftragId) {
  return ensureDir(path.join(auftragMediaDir(auftragId), 'bearbeitet'));
}

function musikDir(auftragId) {
  return ensureDir(path.join(auftragMediaDir(auftragId), 'musik'));
}

function videoDir(auftragId) {
  return ensureDir(path.join(auftragMediaDir(auftragId), 'videos'));
}

function isInsideMediaRoot(filePath) {
  return typeof filePath === 'string' && path.resolve(filePath).startsWith(path.resolve(mediaRootPath));
}

function toMediaEntry(dest) {
  return { pfad: dest, url: pathToFileURL(dest).href };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 100 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr ? stderr.slice(-2000) : err.message));
      else resolve();
    });
  });
}

function slideshowTransitionDuration(secondsPerImage) {
  return Math.min(1, secondsPerImage / 2);
}

function slideshowTotalDuration(imageCount, secondsPerImage) {
  const transition = slideshowTransitionDuration(secondsPerImage);
  return imageCount * secondsPerImage - (imageCount - 1) * transition;
}

function buildSlideshowArgs(images, secondsPerImage, outputPath) {
  const transition = slideshowTransitionDuration(secondsPerImage);
  const args = [];
  images.forEach((img) => {
    args.push('-loop', '1', '-t', String(secondsPerImage), '-i', img);
  });

  const scaleParts = images.map(
    (_, i) =>
      `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25,format=yuv420p[s${i}]`
  );

  let filterComplex;
  if (images.length === 1) {
    filterComplex = `${scaleParts[0]}`;
    args.push('-y', '-filter_complex', filterComplex, '-map', '[s0]');
  } else {
    const xfadeParts = [];
    let runningDuration = secondsPerImage;
    let previousLabel = 's0';
    for (let i = 1; i < images.length; i++) {
      const offset = runningDuration - transition;
      const outLabel = i === images.length - 1 ? 'outv' : `x${i}`;
      xfadeParts.push(
        `[${previousLabel}][s${i}]xfade=transition=fade:duration=${transition}:offset=${offset.toFixed(3)}[${outLabel}]`
      );
      runningDuration = runningDuration + secondsPerImage - transition;
      previousLabel = outLabel;
    }
    filterComplex = `${scaleParts.join(';')};${xfadeParts.join(';')}`;
    args.push('-y', '-filter_complex', filterComplex, '-map', '[outv]');
  }

  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', outputPath);
  return args;
}

function buildAudioMuxArgs(videoPath, musicPath, outputPath) {
  return [
    '-y',
    '-i', videoPath,
    '-stream_loop', '-1',
    '-i', musicPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outputPath
  ];
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#05070d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('load-data', () => {
  return loadData();
});

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('open-external', (event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

ipcMain.handle('import-images', async (event, auftragId) => {
  const result = await dialog.showOpenDialog({
    title: 'Bilder importieren',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Bilder', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  });
  if (result.canceled || !result.filePaths.length) return [];

  const dir = originalsDir(auftragId);
  return result.filePaths.map((src) => {
    const id = uid();
    const ext = path.extname(src).toLowerCase() || '.jpg';
    const dateiname = `${id}${ext}`;
    const dest = path.join(dir, dateiname);
    fs.copyFileSync(src, dest);
    return { id, dateiname, ...toMediaEntry(dest) };
  });
});

ipcMain.handle('import-videos', async (event, auftragId) => {
  const result = await dialog.showOpenDialog({
    title: 'Videos importieren',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'webm', 'avi', 'mkv'] }]
  });
  if (result.canceled || !result.filePaths.length) return [];

  const dir = videoDir(auftragId);
  return result.filePaths.map((src) => {
    const id = uid();
    const ext = path.extname(src).toLowerCase() || '.mp4';
    const dateiname = `${id}${ext}`;
    const dest = path.join(dir, dateiname);
    fs.copyFileSync(src, dest);
    return { id, dateiname, ...toMediaEntry(dest), quelle: 'importiert' };
  });
});

ipcMain.handle('pick-music', async (event, auftragId) => {
  const result = await dialog.showOpenDialog({
    title: 'Hintergrundmusik wählen',
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'aac'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;

  const src = result.filePaths[0];
  const dir = musikDir(auftragId);
  const id = uid();
  const ext = path.extname(src).toLowerCase() || '.mp3';
  const dateiname = `${id}${ext}`;
  const dest = path.join(dir, dateiname);
  fs.copyFileSync(src, dest);
  return { id, dateiname, ...toMediaEntry(dest) };
});

ipcMain.handle('save-edited-image', async (event, { auftragId, dataUrl }) => {
  const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('Ungültiges Bildformat');

  const ext = match[1] === 'jpeg' ? '.jpg' : '.png';
  const buffer = Buffer.from(match[2], 'base64');
  const dir = editedDir(auftragId);
  const id = uid();
  const dateiname = `${id}${ext}`;
  const dest = path.join(dir, dateiname);
  fs.writeFileSync(dest, buffer);
  return { id, dateiname, ...toMediaEntry(dest) };
});

ipcMain.handle('create-slideshow-video', async (event, { auftragId, bildPfade, sekundenProBild, musikPfad }) => {
  if (!Array.isArray(bildPfade) || !bildPfade.length) {
    throw new Error('Keine Bilder für das Video ausgewählt');
  }
  const gueltigeBilder = bildPfade.filter((p) => isInsideMediaRoot(p) && fs.existsSync(p));
  if (!gueltigeBilder.length) {
    throw new Error('Die ausgewählten Bilder wurden nicht gefunden');
  }

  const dir = videoDir(auftragId);
  const id = uid();
  const silentPath = path.join(dir, `${id}-silent.mp4`);
  const finalPath = path.join(dir, `${id}.mp4`);
  const sekunden = Math.min(Math.max(Number(sekundenProBild) || 3, 1), 15);

  await runFfmpeg(buildSlideshowArgs(gueltigeBilder, sekunden, silentPath));

  if (musikPfad && isInsideMediaRoot(musikPfad) && fs.existsSync(musikPfad)) {
    await runFfmpeg(buildAudioMuxArgs(silentPath, musikPfad, finalPath));
    fs.unlinkSync(silentPath);
  } else {
    fs.renameSync(silentPath, finalPath);
  }

  const dateiname = `${id}.mp4`;
  return {
    id,
    dateiname,
    ...toMediaEntry(finalPath),
    quelle: 'erstellt',
    sekunden: Math.round(slideshowTotalDuration(gueltigeBilder.length, sekunden) * 10) / 10
  };
});

ipcMain.handle('open-media-path', (event, filePath) => {
  if (isInsideMediaRoot(filePath)) shell.openPath(filePath);
});

ipcMain.handle('reveal-media-path', (event, filePath) => {
  if (isInsideMediaRoot(filePath)) shell.showItemInFolder(filePath);
});

ipcMain.handle('delete-media-file', (event, filePath) => {
  if (isInsideMediaRoot(filePath) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
