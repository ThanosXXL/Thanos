export type EffectSettings = {
  brightness: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // -1..1
  grayscale: boolean;
  sepia: boolean;
  mute: boolean;
};

export function defaultEffects(): EffectSettings {
  return {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    grayscale: false,
    sepia: false,
    mute: false,
  };
}

export type MediaItem = {
  id: string;
  uri: string;
  name: string;
  duration: number; // seconds, 0 if unknown
  width: number;
  height: number;
  hasAudio: boolean;
};

export type Clip = {
  id: string;
  mediaId: string;
  inPoint: number; // seconds into the source media
  outPoint: number; // seconds into the source media
  speed: number; // 0.25 - 2
  effects: EffectSettings;
};

export type TextOverlay = {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  x: number; // 0..1, fraction of frame width
  y: number; // 0..1, fraction of frame height
  startTime: number; // seconds into the final timeline
  endTime: number;
};

export type ProjectState = {
  projectName: string;
  mediaLibrary: MediaItem[];
  clips: Clip[];
  textOverlays: TextOverlay[];
};

export function emptyProject(): ProjectState {
  return {
    projectName: 'Neues Projekt',
    mediaLibrary: [],
    clips: [],
    textOverlays: [],
  };
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function clipDuration(clip: Clip): number {
  return Math.max(0, (clip.outPoint - clip.inPoint) / clip.speed);
}

export function timelineDuration(clips: Clip[]): number {
  return clips.reduce((sum, c) => sum + clipDuration(c), 0);
}
