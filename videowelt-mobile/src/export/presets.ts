export type ResolutionPreset = {
  key: string;
  label: string;
  width: number;
  height: number;
};

export const RESOLUTION_GROUPS: { label: string; presets: ResolutionPreset[] }[] = [
  {
    label: 'YouTube',
    presets: [
      { key: 'yt-1080', label: 'Full HD (1920×1080)', width: 1920, height: 1080 },
      { key: 'yt-4k', label: '4K (3840×2160)', width: 3840, height: 2160 },
    ],
  },
  {
    label: 'YouTube Shorts / Reels / Story',
    presets: [
      { key: 'vertical-1080', label: 'Hochformat Full HD (1080×1920)', width: 1080, height: 1920 },
      { key: 'vertical-720', label: 'Hochformat HD (720×1280)', width: 720, height: 1280 },
    ],
  },
  {
    label: 'Instagram / Facebook Feed',
    presets: [{ key: 'square-1080', label: 'Quadratisch (1080×1080)', width: 1080, height: 1080 }],
  },
  {
    label: 'Sonstiges',
    presets: [
      { key: 'hd-720', label: 'HD (1280×720)', width: 1280, height: 720 },
      { key: 'sd-480', label: 'SD (854×480)', width: 854, height: 480 },
    ],
  },
];
