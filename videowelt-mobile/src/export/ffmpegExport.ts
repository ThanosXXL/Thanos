import { Clip, MediaItem, ProjectState, TextOverlay, clipDuration } from '../state/types';

// ffmpeg-kit-react-native is a native module: it only runs inside a custom
// dev client / standalone build, never inside Expo Go. We load it lazily so
// the rest of the app (import, timeline editing, trimming) keeps working in
// Expo Go even before a native build exists.
type FFmpegKitModule = typeof import('ffmpeg-kit-react-native');

let ffmpegModule: FFmpegKitModule | null | undefined;

function loadFfmpegKit(): FFmpegKitModule | null {
  if (ffmpegModule !== undefined) return ffmpegModule;
  try {
    ffmpegModule = require('ffmpeg-kit-react-native') as FFmpegKitModule;
  } catch {
    ffmpegModule = null;
  }
  return ffmpegModule ?? null;
}

export function isNativeExportAvailable(): boolean {
  return loadFfmpegKit() !== null;
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

function mediaFor(state: ProjectState, clip: Clip): MediaItem | undefined {
  return state.mediaLibrary.find((m) => m.id === clip.mediaId);
}

function buildColorFilter(clip: Clip): string | null {
  const parts: string[] = [];
  const { effects } = clip;
  if (effects.brightness !== 0 || effects.contrast !== 0 || effects.saturation !== 0) {
    const brightness = effects.brightness.toFixed(3);
    const contrast = (1 + effects.contrast).toFixed(3);
    const saturation = (1 + effects.saturation).toFixed(3);
    parts.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);
  }
  if (effects.grayscale) {
    parts.push('hue=s=0');
  } else if (effects.sepia) {
    parts.push(
      'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'
    );
  }
  return parts.length ? parts.join(',') : null;
}

function buildClipFilterGraph(
  clip: Clip,
  media: MediaItem,
  index: number,
  fps: number
): { inputs: string[]; videoLabel: string; audioLabel: string | null } {
  const duration = Math.max(0.05, clip.outPoint - clip.inPoint);
  const speed = clip.speed || 1;

  const videoParts = [
    `[${index}:v]trim=start=${clip.inPoint}:duration=${duration}`,
    'setpts=PTS-STARTPTS',
  ];
  if (speed !== 1) {
    videoParts.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
  }
  const colorFilter = buildColorFilter(clip);
  if (colorFilter) videoParts.push(colorFilter);
  videoParts.push(`fps=${fps}`);
  const videoLabel = `v${index}`;
  const videoChain = `${videoParts.join(',')}[${videoLabel}]`;

  const inputs = [videoChain];
  let audioLabel: string | null = null;
  if (media.hasAudio !== false && !clip.effects.mute) {
    audioLabel = `a${index}`;
    const audioParts = [
      `[${index}:a]atrim=start=${clip.inPoint}:duration=${duration}`,
      'asetpts=PTS-STARTPTS',
    ];
    if (speed !== 1) {
      audioParts.push(`atempo=${Math.min(2, Math.max(0.5, speed)).toFixed(3)}`);
    }
    inputs.push(`${audioParts.join(',')}[${audioLabel}]`);
  }

  return { inputs, videoLabel, audioLabel };
}

function buildTextOverlayFilters(overlays: TextOverlay[], baseLabel: string): {
  filters: string[];
  outputLabel: string;
} {
  if (!overlays.length) return { filters: [], outputLabel: baseLabel };
  const filters: string[] = [];
  let current = baseLabel;
  overlays.forEach((overlay, i) => {
    const nextLabel = `txt${i}`;
    const x = `(w*${overlay.x.toFixed(3)})-(text_w/2)`;
    const y = `(h*${overlay.y.toFixed(3)})-(text_h/2)`;
    const enable = `between(t\\,${overlay.startTime}\\,${overlay.endTime})`;
    filters.push(
      `[${current}]drawtext=text='${escapeDrawtext(overlay.text)}':fontcolor=${overlay.color}:fontsize=${overlay.fontSize}:x=${x}:y=${y}:enable='${enable}'[${nextLabel}]`
    );
    current = nextLabel;
  });
  return { filters, outputLabel: current };
}

export type ExportOptions = {
  width: number;
  height: number;
  fps?: number;
};

export type ExportResult = {
  outputPath: string;
};

export async function exportProject(
  state: ProjectState,
  outputPath: string,
  options: ExportOptions,
  onProgress?: (fractionDone: number) => void
): Promise<ExportResult> {
  const ffmpeg = loadFfmpegKit();
  if (!ffmpeg) {
    throw new Error(
      'Nativer Export ist nur in einem VideoWelt-Dev-Client oder Standalone-Build verfügbar, nicht in Expo Go. Siehe README für "eas build".'
    );
  }
  if (!state.clips.length) {
    throw new Error('Die Timeline ist leer – füge zuerst mindestens einen Clip hinzu.');
  }

  const fps = options.fps || 30;
  const inputs: string[] = [];
  const filterChains: string[] = [];
  const videoLabels: string[] = [];
  const audioLabels: string[] = [];

  state.clips.forEach((clip, index) => {
    const media = mediaFor(state, clip);
    if (!media) return;
    inputs.push('-i', media.uri);
    const graph = buildClipFilterGraph(clip, media, index, fps);
    filterChains.push(...graph.inputs);
    videoLabels.push(graph.videoLabel);
    if (graph.audioLabel) audioLabels.push(graph.audioLabel);
  });

  const scaledLabels = videoLabels.map((label, i) => {
    const scaledLabel = `scaled${i}`;
    filterChains.push(
      `[${label}]scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[${scaledLabel}]`
    );
    return scaledLabel;
  });

  const hasAudio = audioLabels.length === state.clips.length && audioLabels.length > 0;
  const concatInputs = hasAudio
    ? scaledLabels.map((v, i) => `[${v}][${audioLabels[i]}]`).join('')
    : scaledLabels.map((v) => `[${v}]`).join('');
  const concatOut = hasAudio ? '[vcat][acat]' : '[vcat]';
  filterChains.push(
    `${concatInputs}concat=n=${state.clips.length}:v=1:a=${hasAudio ? 1 : 0}${concatOut}`
  );

  const { filters: textFilters, outputLabel } = buildTextOverlayFilters(
    state.textOverlays,
    'vcat'
  );
  filterChains.push(...textFilters);

  const filterComplex = filterChains.join(';');
  const mapArgs = ['-map', `[${outputLabel}]`];
  if (hasAudio) mapArgs.push('-map', '[acat]');

  const args = [
    ...inputs,
    '-filter_complex',
    filterComplex,
    ...mapArgs,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
  ];
  if (hasAudio) args.push('-c:a', 'aac', '-b:a', '192k');
  args.push('-y', outputPath);

  const totalDuration = state.clips.reduce((sum, c) => sum + clipDuration(c), 0);

  return new Promise<ExportResult>((resolve, reject) => {
    ffmpeg.FFmpegKitConfig.enableStatisticsCallback((stats: any) => {
      if (!onProgress || totalDuration <= 0) return;
      const timeSeconds = (stats.getTime?.() ?? 0) / 1000;
      onProgress(Math.min(1, Math.max(0, timeSeconds / totalDuration)));
    });

    ffmpeg.FFmpegKit.execute(args.join(' '))
      .then(async (session: any) => {
        const returnCode = await session.getReturnCode();
        if (ffmpeg.ReturnCode.isSuccess(returnCode)) {
          resolve({ outputPath });
        } else {
          const logs = await session.getAllLogsAsString();
          reject(new Error(`ffmpeg fehlgeschlagen (Code ${returnCode}):\n${logs}`));
        }
      })
      .catch(reject);
  });
}
