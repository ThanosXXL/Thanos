const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Spawning ffmpeg/ffprobe (and reading the font/sample directories below) goes
// through the OS's real exec/fs calls, which cannot see inside an asar
// archive — only Electron's own patched fs/require can. electron-builder
// unpacks anything matched by "asarUnpack" into a sibling app.asar.unpacked
// directory, but the paths below still point inside app.asar unless we
// redirect them ourselves, so packaged builds need this rewrite; it is a
// no-op both in dev (no asar) and for ffmpeg-static/ffprobe-static, which
// only ever return a path is inside app.asar when actually packaged.
function unpackAsarPath(p) {
  if (!p) return p;
  return p.replace(/([\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2');
}

const ffmpegPath = unpackAsarPath(require('ffmpeg-static'));
const ffprobePath = unpackAsarPath(require('ffprobe-static').path);

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const FONTS_DIR = unpackAsarPath(path.join(__dirname, 'build', 'fonts'));
const SAMPLES_DIR = unpackAsarPath(path.join(__dirname, 'build', 'samples'));

// Generate a fontconfig config (with an absolute <dir>, since a relative one
// resolves against the process cwd, not the config file's location) that
// chains the system config and adds our bundled fonts with priority, so the
// "Montserrat" family used in exported text overlays resolves to the
// bundled font instead of silently falling back to a generic system font.
try {
  const fontsConfPath = path.join(os.tmpdir(), 'videowelt-fonts.conf');
  const fontsConfXml =
    '<?xml version="1.0"?>\n' +
    '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n' +
    '<fontconfig>\n' +
    '  <dir>' + FONTS_DIR.replace(/&/g, '&amp;') + '</dir>\n' +
    '  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n' +
    '</fontconfig>\n';
  fs.writeFileSync(fontsConfPath, fontsConfXml, 'utf-8');
  process.env.FONTCONFIG_FILE = fontsConfPath;
} catch (err) {
  // Fall back to whatever fontconfig would otherwise resolve; text overlays
  // still render, just possibly with a substitute system font.
}

const RESOLUTIONS = {
  '3840x2160': { w: 3840, h: 2160 },
  '1920x1080': { w: 1920, h: 1080 },
  '1280x720': { w: 1280, h: 720 },
  '854x480': { w: 854, h: 480 }
};

function probeMedia(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const videoStream = (data.streams || []).find((s) => s.codec_type === 'video');
      const audioStream = (data.streams || []).find((s) => s.codec_type === 'audio');
      let fps = 30;
      if (videoStream && videoStream.avg_frame_rate && videoStream.avg_frame_rate !== '0/0') {
        const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
        if (den) fps = num / den;
      }
      resolve({
        duration: Number(data.format.duration) || (videoStream && Number(videoStream.duration)) || 0,
        width: videoStream ? videoStream.width : 0,
        height: videoStream ? videoStream.height : 0,
        fps: fps || 30,
        hasAudio: !!audioStream,
        hasVideo: !!videoStream
      });
    });
  });
}

function generateThumbnail(filePath, outputPath, seekSeconds) {
  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .screenshots({
        timestamps: [Math.max(0, seekSeconds || 0)],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '320x?'
      });
  });
}

function escapeFilterPath(p) {
  return String(p).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, '\u2019');
}

function escapeAssText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\r?\n/g, '\\N');
}

function toAssTime(seconds) {
  seconds = Math.max(0, seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds - Math.floor(seconds)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function hexToAssColor(hex) {
  const clean = String(hex || '#ffffff').replace('#', '');
  const r = clean.slice(0, 2) || 'ff';
  const g = clean.slice(2, 4) || 'ff';
  const b = clean.slice(4, 6) || 'ff';
  return `&H${b}${g}${r}&`;
}

function buildAssSubtitleFile(textOverlays, targetRes) {
  const lines = [];
  lines.push('[Script Info]');
  lines.push('ScriptType: v4.00+');
  lines.push(`PlayResX: ${targetRes.w}`);
  lines.push(`PlayResY: ${targetRes.h}`);
  lines.push('ScaledBorderAndShadow: yes');
  lines.push('');
  lines.push('[V4+ Styles]');
  lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding');
  lines.push('Style: Default,Montserrat,42,&H00FFFFFF,&H000000FF,&H00000000,&H78000000,-1,0,0,0,100,100,0,0,1,2,1,5,10,10,10,1');
  lines.push('');
  lines.push('[Events]');
  lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');

  textOverlays.forEach((ov) => {
    const start = Number(ov.start) || 0;
    const end = Number(ov.end != null ? ov.end : start + 3);
    if (end <= start) return;
    const x = Math.round(clamp(ov.x != null ? ov.x : 0.5, 0, 1) * targetRes.w);
    const y = Math.round(clamp(ov.y != null ? ov.y : 0.85, 0, 1) * targetRes.h);
    const fontsize = Math.round(clamp(ov.fontSize || 42, 8, 200));
    const color = hexToAssColor(ov.color || '#ffffff');
    const fontFamily = (ov.fontFamily || 'Montserrat').replace(/[{}\\]/g, '');
    const text = escapeAssText(ov.text || '');
    const overrides = `{\\pos(${x},${y})\\fs${fontsize}\\c${color}\\fn${fontFamily}}`;
    lines.push(`Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Default,,0,0,0,,${overrides}${text}`);
  });

  const assPath = path.join(os.tmpdir(), 'videowelt-subs-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.ass');
  fs.writeFileSync(assPath, lines.join('\n'), 'utf-8');
  return assPath;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v)));
}

function buildTransformFilterParts(fx) {
  const parts = [];
  if (fx.flipH) parts.push('hflip');
  if (fx.flipV) parts.push('vflip');

  const rotate = Number(fx.rotate) || 0;
  if (rotate === 90) parts.push('transpose=1');
  else if (rotate === 180) parts.push('transpose=1,transpose=1');
  else if (rotate === 270) parts.push('transpose=2');
  return parts;
}

function buildColorFilterParts(fx) {
  const parts = [];
  const brightness = clamp(fx.brightness || 0, -1, 1);
  const contrast = clamp(fx.contrast != null ? fx.contrast : 1, 0, 3);
  const saturation = fx.grayscale ? 0 : clamp(fx.saturation != null ? fx.saturation : 1, 0, 3);
  if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
    parts.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);
  }
  if (fx.sepia) {
    parts.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0');
  }
  const blur = clamp(fx.blur || 0, 0, 20);
  if (blur > 0) parts.push(`boxblur=${blur}:1`);

  const hue = clamp(fx.hue || 0, -180, 180);
  if (hue) parts.push(`hue=h=${hue}`);
  const sharpen = clamp(fx.sharpen || 0, 0, 5);
  if (sharpen > 0) parts.push(`unsharp=5:5:${sharpen}:5:5:0`);
  if (fx.vignette) parts.push('vignette');

  return parts;
}

function buildVideoFilterChain(clip, mediaItem, targetRes, index, fps) {
  const fx = clip.effects || {};
  const inPoint = Number(clip.inPoint) || 0;
  const outPoint = Number(clip.outPoint) || (mediaItem.duration || inPoint + 1);
  const speed = clamp(fx.speed || 1, 0.25, 4);
  const rawDuration = Math.max(0.05, outPoint - inPoint);
  const effDuration = rawDuration / speed;

  const parts = [];
  parts.push(`trim=start=${inPoint}:end=${outPoint}`);
  parts.push('setpts=PTS-STARTPTS');
  if (speed !== 1) parts.push(`setpts=${(1 / speed).toFixed(6)}*PTS`);

  parts.push(...buildTransformFilterParts(fx));

  parts.push(
    `scale=${targetRes.w}:${targetRes.h}:force_original_aspect_ratio=decrease`
  );
  parts.push(`pad=${targetRes.w}:${targetRes.h}:(ow-iw)/2:(oh-ih)/2:color=black`);
  parts.push('setsar=1');
  // xfade (and downstream concat) require a known, constant frame rate;
  // without this, a source with variable/unknown fps metadata makes xfade
  // fail with "inputs needs to be a constant frame rate". For slow motion
  // with smoothSlowmo on, minterpolate generates the extra in-between
  // frames motion-compensated (judder-free) and also pins the frame rate,
  // so it replaces the plain fps filter rather than stacking with it.
  if (fx.smoothSlowmo && speed < 1) {
    parts.push(`minterpolate=fps=${fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`);
  } else {
    parts.push(`fps=${fps}`);
  }

  parts.push(...buildColorFilterParts(fx));

  const fadeIn = clamp(fx.fadeIn || 0, 0, effDuration / 2);
  const fadeOut = clamp(fx.fadeOut || 0, 0, effDuration / 2);
  if (fadeIn > 0) parts.push(`fade=t=in:st=0:d=${fadeIn}`);
  if (fadeOut > 0) parts.push(`fade=t=out:st=${Math.max(0, effDuration - fadeOut)}:d=${fadeOut}`);

  parts.push('format=yuv420p');

  return { filter: `[${index}:v]${parts.join(',')}[v${index}]`, effDuration, hasAudio: mediaItem.hasAudio !== false };
}

function extractStillFrame(mediaPath, sourceTime, effects, outputPath) {
  const fx = effects || {};
  // Full source resolution, no scale/pad — a still grabbed for its own sake
  // should be as sharp as the source allows, not clamped to export/preview size.
  const filterParts = [...buildTransformFilterParts(fx), ...buildColorFilterParts(fx)];

  return new Promise((resolve, reject) => {
    const command = ffmpeg(mediaPath).seekInput(Math.max(0, Number(sourceTime) || 0));
    if (filterParts.length) command.videoFilters(filterParts.join(','));
    command
      .outputOptions(['-frames:v', '1'])
      .output(outputPath)
      .on('error', (err) => reject(new Error((err && err.message) || 'Standbild-Export fehlgeschlagen')))
      .on('end', () => resolve(outputPath))
      .run();
  });
}

function buildAudioFilterChain(clip, mediaItem, index) {
  const fx = clip.effects || {};
  const inPoint = Number(clip.inPoint) || 0;
  const outPoint = Number(clip.outPoint) || (mediaItem.duration || inPoint + 1);
  const speed = clamp(fx.speed || 1, 0.25, 4);
  const muted = !!fx.muted;

  const parts = [];
  parts.push(`atrim=start=${inPoint}:end=${outPoint}`);
  parts.push('asetpts=PTS-STARTPTS');
  let remaining = speed;
  if (remaining !== 1) {
    while (remaining > 2) {
      parts.push('atempo=2.0');
      remaining /= 2;
    }
    while (remaining < 0.5) {
      parts.push('atempo=0.5');
      remaining /= 0.5;
    }
    parts.push(`atempo=${remaining.toFixed(6)}`);
  }
  parts.push(`volume=${muted ? 0 : clamp(fx.volume != null ? fx.volume : 1, 0, 4)}`);
  return `[${index}:a]${parts.join(',')}[a${index}]`;
}

const XFADE_NAMES = new Set([
  'fade', 'fadeblack', 'fadewhite', 'fadegrays', 'dissolve',
  'wipeleft', 'wiperight', 'wipeup', 'wipedown',
  'slideleft', 'slideright', 'slideup', 'slidedown',
  'smoothleft', 'smoothright', 'smoothup', 'smoothdown',
  'circleopen', 'circleclose', 'circlecrop', 'rectcrop',
  'vertopen', 'vertclose', 'horzopen', 'horzclose',
  'diagtl', 'diagtr', 'diagbl', 'diagbr',
  'pixelize', 'radial', 'hblur', 'zoomin', 'squeezeh', 'squeezev', 'distance'
]);

function transitionName(type) {
  if (type === 'crossfade') return 'fade'; // legacy alias from older saved projects
  if (XFADE_NAMES.has(type)) return type;
  return 'fade';
}

function transitionDuration(clip) {
  const t = clip.transitionOut || {};
  if (t.type && t.type !== 'none') {
    return clamp(t.duration || 0.5, 0.1, 5);
  }
  return 0.04;
}

function buildAudioTrackFilter(item, index) {
  const start = Number(item.start) || 0;
  const parts = [];
  let dur;
  if (item.loop && item.stretchDuration) {
    // The input itself is repeated via "-stream_loop -1" (see runExport),
    // so here we just cut the now-effectively-infinite stream to the exact
    // stretched length instead of the original inPoint/outPoint range.
    dur = Math.max(0.05, item.stretchDuration);
    parts.push(`atrim=start=0:duration=${dur}`);
  } else {
    const inPoint = Number(item.inPoint) || 0;
    const outPoint = Number(item.outPoint) || inPoint + 1;
    dur = Math.max(0.05, outPoint - inPoint);
    parts.push(`atrim=start=${inPoint}:end=${outPoint}`);
  }
  parts.push('asetpts=PTS-STARTPTS');
  const vol = clamp(item.volume != null ? item.volume : 1, 0, 4);
  parts.push(`volume=${vol}`);
  const fadeIn = clamp(item.fadeIn || 0, 0, dur / 2);
  const fadeOut = clamp(item.fadeOut || 0, 0, dur / 2);
  if (fadeIn > 0) parts.push(`afade=t=in:st=0:d=${fadeIn}`);
  if (fadeOut > 0) parts.push(`afade=t=out:st=${Math.max(0, dur - fadeOut)}:d=${fadeOut}`);
  parts.push(`adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)}`);
  return `[${index}:a]${parts.join(',')}[atrack${index}]`;
}

function runExport(state, settings, outputPath, onProgress) {
  const mediaById = {};
  (state.mediaLibrary || []).forEach((m) => {
    mediaById[m.id] = m;
  });

  const videoClips = (state.timeline && state.timeline.videoTrack) || [];
  const audioItems = (state.timeline && state.timeline.audioTrack) || [];
  const textOverlays = (state.timeline && state.timeline.textOverlays) || [];

  if (videoClips.length === 0) {
    return Promise.reject(new Error('Die Timeline enthält kein Video. Bitte mindestens einen Clip hinzufügen.'));
  }

  const targetRes = RESOLUTIONS[settings.resolution] || (() => {
    const first = mediaById[videoClips[0].mediaId];
    return { w: first.width || 1280, h: first.height || 720 };
  })();
  const fps = clamp(settings.fps || 30, 1, 120);

  const command = ffmpeg();
  const inputIndexOf = {};
  let nextInput = 0;

  videoClips.forEach((clip) => {
    const media = mediaById[clip.mediaId];
    if (!media) throw new Error('Clip verweist auf fehlendes Medium: ' + clip.mediaId);
    command.input(media.path);
    inputIndexOf[clip.id] = nextInput++;
  });
  const audioClipInputStart = nextInput;
  audioItems.forEach((item) => {
    const media = mediaById[item.mediaId];
    if (!media) throw new Error('Audiospur verweist auf fehlendes Medium: ' + item.mediaId);
    command.input(media.path);
    if (item.loop && item.stretchDuration) {
      // Repeats the whole input indefinitely; buildAudioTrackFilter() always
      // cuts this back down with a matching atrim=duration=stretchDuration.
      command.inputOptions(['-stream_loop', '-1']);
    }
    inputIndexOf[item.id] = nextInput++;
  });

  const filters = [];
  const videoLabels = [];
  const audioLabels = [];
  const durations = [];

  videoClips.forEach((clip) => {
    const idx = inputIndexOf[clip.id];
    const media = mediaById[clip.mediaId];
    const { filter, effDuration, hasAudio } = buildVideoFilterChain(clip, media, targetRes, idx, fps);
    filters.push(filter);
    videoLabels.push(`v${idx}`);
    durations.push(effDuration);
    if (hasAudio && !(clip.effects && clip.effects.muted)) {
      filters.push(buildAudioFilterChain(clip, media, idx));
      audioLabels.push(`a${idx}`);
    } else {
      audioLabels.push(null);
    }
  });

  let videoOut;
  let audioOut = null;
  const anyTransition = videoClips.some((c) => c.transitionOut && c.transitionOut.type && c.transitionOut.type !== 'none');
  const anyClipAudio = audioLabels.some((l) => l !== null);

  if (videoLabels.length === 1) {
    videoOut = videoLabels[0];
    audioOut = audioLabels[0];
  } else if (!anyTransition) {
    const vIns = videoLabels.map((l) => `[${l}]`).join('');
    filters.push(`${vIns}concat=n=${videoLabels.length}:v=1:a=0[vconcat]`);
    videoOut = 'vconcat';
    if (anyClipAudio) {
      const silentLabels = [];
      audioLabels.forEach((l, i) => {
        if (l === null) {
          filters.push(`anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${durations[i]}[silence${i}]`);
          silentLabels.push(`silence${i}`);
        } else {
          silentLabels.push(l);
        }
      });
      const aIns = silentLabels.map((l) => `[${l}]`).join('');
      filters.push(`${aIns}concat=n=${silentLabels.length}:v=0:a=1[aconcat]`);
      audioOut = 'aconcat';
    }
  } else {
    let prevV = videoLabels[0];
    let cumulative = durations[0];
    let prevA = audioLabels[0];
    for (let i = 1; i < videoLabels.length; i++) {
      const transClip = videoClips[i - 1];
      const dur = transitionDuration(transClip);
      const name = transitionName((transClip.transitionOut || {}).type);
      const cumulativeBeforeUpdate = cumulative;
      const offset = Math.max(0, cumulativeBeforeUpdate - dur);
      const outLabel = `vx${i}`;
      filters.push(`[${prevV}][${videoLabels[i]}]xfade=transition=${name}:duration=${dur}:offset=${offset}[${outLabel}]`);
      prevV = outLabel;
      cumulative = cumulativeBeforeUpdate + durations[i] - dur;

      if (anyClipAudio) {
        const curA = audioLabels[i];
        const aOutLabel = `ax${i}`;
        let prevALabel = prevA;
        if (prevALabel === null) {
          prevALabel = `aznull${i}`;
          filters.push(`anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${cumulativeBeforeUpdate}[${prevALabel}]`);
        }
        let curALabel = curA;
        if (curALabel === null) {
          curALabel = `aznullb${i}`;
          filters.push(`anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${durations[i]}[${curALabel}]`);
        }
        filters.push(`[${prevALabel}][${curALabel}]acrossfade=d=${dur}[${aOutLabel}]`);
        prevA = aOutLabel;
      }
    }
    videoOut = prevV;
    audioOut = prevA;
  }

  let assSubtitlePath = null;
  const validOverlays = textOverlays.filter((ov) => (ov.text || '').trim() && Number(ov.end) > Number(ov.start));
  if (validOverlays.length > 0) {
    assSubtitlePath = buildAssSubtitleFile(validOverlays, targetRes);
    const assFilterPath = escapeFilterPath(assSubtitlePath);
    const fontsDirPath = escapeFilterPath(FONTS_DIR);
    const outLabel = 'vtext';
    filters.push(`[${videoOut}]ass=filename='${assFilterPath}':fontsdir='${fontsDirPath}'[${outLabel}]`);
    videoOut = outLabel;
  }

  if (audioItems.length > 0) {
    const trackLabels = [];
    audioItems.forEach((item) => {
      const idx = inputIndexOf[item.id];
      filters.push(buildAudioTrackFilter(item, idx));
      trackLabels.push(`atrack${idx}`);
    });
    const mixInputs = [...trackLabels];
    if (audioOut) mixInputs.unshift(audioOut);
    if (mixInputs.length > 1) {
      const ins = mixInputs.map((l) => `[${l}]`).join('');
      filters.push(`${ins}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0[amixed]`);
      audioOut = 'amixed';
    } else {
      audioOut = mixInputs[0];
    }
  }

  command.complexFilter(filters);
  command.outputOptions(['-map', `[${videoOut}]`]);
  if (audioOut) command.outputOptions(['-map', `[${audioOut}]`]);

  command.fps(fps);

  const format = settings.format || 'mp4';
  const quality = settings.quality || 'mittel';

  if (format === 'webm') {
    command.videoCodec('libvpx-vp9');
    const crf = { hoch: 28, mittel: 33, niedrig: 38 }[quality] || 33;
    command.outputOptions(['-crf', String(crf), '-b:v', '0']);
    if (audioOut) command.audioCodec('libopus');
  } else {
    command.videoCodec('libx264');
    const crf = { hoch: 18, mittel: 23, niedrig: 28 }[quality] || 23;
    command.outputOptions(['-crf', String(crf), '-preset', 'medium', '-pix_fmt', 'yuv420p']);
    if (audioOut) command.audioCodec('aac');
  }
  if (audioOut) command.outputOptions(['-b:a', '192k']);

  command.output(outputPath);

  function cleanupAss() {
    if (assSubtitlePath) {
      fs.unlink(assSubtitlePath, () => {});
    }
  }

  return new Promise((resolve, reject) => {
    let totalDurationEstimate = durations.reduce((a, b) => a + b, 0) || 1;
    command
      .on('start', (cmd) => {
        if (onProgress) onProgress({ phase: 'start', percent: 0, command: cmd });
      })
      .on('progress', (p) => {
        let percent = p.percent;
        if (percent == null && p.timemark) {
          const parts = p.timemark.split(':').map(Number);
          const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0;
          percent = Math.min(99, (seconds / totalDurationEstimate) * 100);
        }
        if (onProgress) onProgress({ phase: 'progress', percent: Math.max(0, Math.min(100, percent || 0)) });
      })
      .on('error', (err, stdout, stderr) => {
        cleanupAss();
        reject(new Error((err && err.message) || 'Export fehlgeschlagen') );
      })
      .on('end', () => {
        cleanupAss();
        if (onProgress) onProgress({ phase: 'done', percent: 100 });
        resolve(outputPath);
      })
      .run();
  });
}

module.exports = { probeMedia, generateThumbnail, runExport, extractStillFrame, RESOLUTIONS, SAMPLES_DIR };
