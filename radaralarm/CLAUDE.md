# CLAUDE.md — RadarAlarm

Guidance specific to `radaralarm/`, a standalone project inside this repo (see the
root `CLAUDE.md` for how it relates to the Dozenten Dashboard and `omniroute/`).

## Brand identity (persistent — apply to all future visual work here)

Every visual asset for RadarAlarm (app UI, demo videos, flyers, social posts,
future marketing material) uses the same identity established for the demo:

- **Colors**: black background with a gold accent (`--gold: #d4af37`,
  `--gold-bright: #f6de8f`, `--gold-dark: #8a6d1f`), see `renderer/style.css`
  for the full token set (`--bg`, `--panel`, `--panel-gradient`,
  `--gold-gradient`).
- **Style**: glossy "Hochglanz" 3D look — gradient fills, soft shadows,
  inset highlights on buttons/badges, a diagonal shine/glare sweep animation
  on hero wordmarks for marketing assets (flyers, video intros).
- **Tone**: German UI copy, professional/construction-industry register.
- **Tagline**: "Erfassen. Alarmieren. Beheben." (see other options discussed
  in chat history if a different one is picked later — update this file if so).

Don't silently switch to a different palette or a flat/non-glossy style for
RadarAlarm assets; ask first if a request seems to imply a different look.

## Demo-video / flyer production pattern

Reuse the approach already proven on this project (see `branding/`):
- App walkthroughs are **real recordings**, not synthetic/AI-generated video:
  drive the actual Electron app with Playwright (`_electron.launch`,
  `executablePath: require('electron')`), capture via `ffmpeg -f x11grab` on
  an Xvfb display, mux in music afterwards with `ffmpeg`.
- Reset `~/.config/radaralarm/radaralarm-data.json` (delete it) before
  recording a clean demo — otherwise the app resumes with leftover state
  from a previous recording run and skips the empty-state UI.
- Background music: `branding/lounge-band.mp3`, copied from the sibling
  branch `claude/msr175-dashboard-demo-fyhsly` (`branding/lounge-band.mp3` /
  `branding/README.md` there) — synthetically generated (ffmpeg audio
  synthesis / Fluidsynth + General-MIDI), license-free. Reuse it rather than
  regenerating, unless the user supplies their own track.
- Deliverables are shipped as a **self-contained HTML player/poster page**
  (video or image embedded as a base64 blob, working `<a download>` button)
  plus the raw file — pattern taken from that same sibling branch's
  `branding/msr-deluxe-video-player.html` / `msr-deluxe-flyer.html`. These
  only need to be opened locally in a real browser; they are not published
  as claude.ai Artifacts (the Artifact sandbox blocks blob/data-URI
  downloads).
- Any file this session builds under 30 MiB, send directly via the
  file-delivery tool; larger files must be split into <30 MiB chunks (see
  git history on this branch for the exact `split -b 25m` approach) since
  there is no configured public release/hosting for this project.

## Demo limits

The app enforces intentional demo constraints in the **main process**, not
just the UI (`DEMO_MAX_PROJECTS`, `DEMO_MAX_DEFECTS_PER_PROJECT` in
`main.js`) — keep it that way if the constraints are ever changed, since a
UI-only limit on a deliberately-limited demo build is trivially bypassed.

## Known limitation: no backend

There is no license/subscription/payment backend for this project (see chat
history from when this was discussed) — don't imply real billing, license
enforcement beyond the local checksum-format check, or a hosted download
link exists unless one has actually been built.
