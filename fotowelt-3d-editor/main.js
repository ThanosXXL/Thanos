const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const dataFilePath = path.join(app.getPath('userData'), 'fotowelt-3d-editor-data.json');

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
};

function loadData() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { projects: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

function fileToDataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
  const buffer = fs.readFileSync(filePath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b0c14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  return win;
}

let mainWindow = null;
let activeExport = null; // { proc, tempDir }

ipcMain.handle('load-data', () => loadData());

ipcMain.handle('save-data', (event, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Bilder auswählen',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }]
  });
  if (result.canceled) return [];
  return result.filePaths.map((filePath) => ({
    path: filePath,
    name: path.basename(filePath),
    dataUrl: fileToDataUrl(filePath)
  }));
});

ipcMain.handle('select-logo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Logo auswählen',
    properties: ['openFile'],
    filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  return { path: filePath, name: path.basename(filePath), dataUrl: fileToDataUrl(filePath) };
});

function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath];
    const proc = spawn(ffprobePath, args);
    let out = '';
    let err = '';
    proc.stdout.on('data', (chunk) => { out += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { err += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      const value = parseFloat(out.trim());
      if (code === 0 && Number.isFinite(value)) resolve(value);
      else reject(new Error(err || 'ffprobe fehlgeschlagen'));
    });
  });
}

ipcMain.handle('select-music', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Hintergrundmusik auswählen',
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  let duration = 0;
  try {
    duration = await probeDuration(filePath);
  } catch (err) {
    duration = 0;
  }
  return {
    path: filePath,
    name: path.basename(filePath),
    fileUrl: 'file://' + filePath.split(path.sep).join('/'),
    duration
  };
});

ipcMain.handle('select-export-path', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Loop-Video exportieren',
    defaultPath: defaultName || 'fotowelt-loop.mp4',
    filters: [{ name: 'MP4-Video', extensions: ['mp4'] }]
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle('show-in-folder', (event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

ipcMain.handle('export-begin', () => {
  const tempDir = path.join(os.tmpdir(), `fotowelt-3d-editor-${crypto.randomBytes(6).toString('hex')}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
});

function framePattern(tempDir, imageIndex) {
  return path.join(tempDir, `img${imageIndex}_frame_%04d.png`);
}

function frameFilePath(tempDir, imageIndex, subFrameIndex) {
  return path.join(tempDir, `img${imageIndex}_frame_${String(subFrameIndex).padStart(4, '0')}.png`);
}

ipcMain.handle('export-write-frame', (event, tempDir, imageIndex, subFrameIndex, buffer) => {
  const filePath = frameFilePath(tempDir, imageIndex, subFrameIndex);
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return filePath;
});

function buildFilterComplex({ frameCount, width, height, fps, transitionDuration, offsets }) {
  const parts = [];
  for (let i = 0; i < frameCount; i++) {
    parts.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps}[s${i}]`
    );
  }
  let finalLabel = 's0';
  if (frameCount > 1) {
    let prev = 's0';
    for (let i = 1; i < frameCount; i++) {
      const out = `x${i}`;
      const offset = offsets[i - 1].toFixed(3);
      parts.push(`[${prev}][s${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${out}]`);
      prev = out;
    }
    finalLabel = prev;
  }
  return { filterComplex: parts.join(';'), finalLabel };
}

ipcMain.handle('export-render-video', async (event, params) => {
  const {
    tempDir,
    frameCount,
    clipDuration,
    transitionDuration,
    offsets,
    totalDuration,
    width,
    height,
    fps,
    musicPath,
    outputPath,
    animateLogo,
    subFps
  } = params;

  const { filterComplex, finalLabel } = buildFilterComplex({
    frameCount,
    width,
    height,
    fps,
    transitionDuration,
    offsets
  });

  const fadeOutStart = Math.max(totalDuration - 1, 0);
  const audioFilter = `afade=t=in:st=0:d=0.6,afade=t=out:st=${fadeOutStart.toFixed(2)}:d=1`;

  const args = ['-y', '-loglevel', 'error', '-progress', 'pipe:1', '-nostats'];
  for (let i = 0; i < frameCount; i++) {
    if (animateLogo) {
      args.push('-framerate', String(subFps), '-start_number', '0', '-t', String(clipDuration), '-i', framePattern(tempDir, i));
    } else {
      args.push('-loop', '1', '-t', String(clipDuration), '-i', frameFilePath(tempDir, i, 0));
    }
  }
  args.push('-i', musicPath);
  args.push('-filter_complex', filterComplex);
  args.push('-map', `[${finalLabel}]`);
  args.push('-map', `${frameCount}:a`);
  args.push('-t', String(totalDuration));
  args.push('-af', audioFilter);
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19');
  args.push('-c:a', 'aac', '-b:a', '192k');
  args.push('-movflags', '+faststart');
  args.push(outputPath);

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    activeExport = { proc, tempDir };
    let stderrTail = '';

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const match = text.match(/out_time_ms=(\d+)/);
      if (match) {
        const seconds = parseInt(match[1], 10) / 1000000;
        const percent = Math.min(100, Math.round((seconds / totalDuration) * 100));
        if (mainWindow) mainWindow.webContents.send('export-progress', percent);
      }
      if (text.includes('progress=end')) {
        if (mainWindow) mainWindow.webContents.send('export-progress', 100);
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-4000);
    });

    proc.on('error', (err) => {
      activeExport = null;
      cleanupTempDir(tempDir);
      reject(err);
    });

    proc.on('close', (code) => {
      activeExport = null;
      cleanupTempDir(tempDir);
      if (code === 0) resolve({ success: true, outputPath });
      else reject(new Error(stderrTail || `ffmpeg wurde mit Code ${code} beendet`));
    });
  });
});

ipcMain.handle('export-cancel', () => {
  if (activeExport && activeExport.proc) {
    activeExport.proc.kill('SIGKILL');
    return true;
  }
  return false;
});

function cleanupTempDir(tempDir) {
  fs.rm(tempDir, { recursive: true, force: true }, () => {});
}

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on('window-all-closed', () => {
  if (activeExport && activeExport.proc) activeExport.proc.kill('SIGKILL');
  if (process.platform !== 'darwin') app.quit();
});
