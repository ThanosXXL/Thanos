// Best-effort media probing via ffmpeg-kit's FFprobeKit. Only available in a
// native dev-client/standalone build; in Expo Go we fall back to whatever
// expo-image-picker already told us (duration, no audio-stream detection).
export type ProbedInfo = {
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
};

export async function probeMedia(
  uri: string,
  fallback: { duration: number; width: number; height: number }
): Promise<ProbedInfo> {
  let ffprobe: typeof import('ffmpeg-kit-react-native') | null = null;
  try {
    ffprobe = require('ffmpeg-kit-react-native');
  } catch {
    ffprobe = null;
  }
  if (!ffprobe) {
    return { ...fallback, hasAudio: true };
  }

  try {
    const session = await ffprobe.FFprobeKit.getMediaInformation(uri);
    const info = session.getMediaInformation();
    if (!info) return { ...fallback, hasAudio: true };
    const streams = info.getStreams();
    const videoStream = streams.find((s: any) => s.getType() === 'video');
    const audioStream = streams.find((s: any) => s.getType() === 'audio');
    const rawDuration = info.getDuration();
    const duration = parseFloat(String(rawDuration ?? '0')) || fallback.duration;
    const width = videoStream?.getWidth?.() || fallback.width;
    const height = videoStream?.getHeight?.() || fallback.height;
    return { duration, width, height, hasAudio: Boolean(audioStream) };
  } catch {
    return { ...fallback, hasAudio: true };
  }
}
