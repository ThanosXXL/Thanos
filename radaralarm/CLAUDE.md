# CLAUDE.md — RadarAlarm

Guidance specific to `radaralarm/`, a standalone project inside this repo (see the
root `CLAUDE.md` for how it relates to the Dozenten Dashboard and `omniroute/`).

## Standing rule: always include a download button

For every deliverable file handed to the user — demo videos, images/flyers,
social-media MP4s/loops, PDFs, and anything similar — always ship it with a
working download button, not just a bare file. Concretely: wrap it in a
self-contained HTML page (per the pattern below) with a real
`<a download>`/blob-download button, in addition to sending the raw file.
Do this by default, every time, without being asked again. Confirmed by the
user twice now (this instruction and its predecessor) — treat as permanent
for this project.

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

## "Vollversion" scope — explicitly split by the user, mid-flight

When asked whether a full version was possible, the user answered three
sub-questions differently — don't collapse them back into one "just build
everything" task:

1. **Demo limits (2 projects / 8 defects)**: explicitly "NEIN" — leave as is.
2. **More local features ("das Maximale")**: "JA" — this is what got built
   (see below). Keep extending this list when asked for more, still fully
   local/offline, no account system.
3. **Real multi-user cloud + real paid subscription**: "Ja auch", but the
   user deferred both sub-decisions explicitly — **ask again before
   building either**, don't just wire something up:
   - Hosting/backend: user said it depends on which customer(s) it's for —
     ask what to use (or whether to recommend something, e.g. Supabase)
     only once real cloud work actually starts.
   - Payments: user said to set up a real Stripe-style account "once it
     starts" — ask again at that point rather than assuming test/mock
     billing is wanted, and don't draft binding legal text (AGB/Widerruf)
     without flagging it needs a real legal review.

Local feature set built for point 2 (all in `renderer.js`/`main.js`, no
external services): team members + roles per project, defect assignment,
auto-logged per-defect activity history, desktop notifications (new defect /
defect done / new comment) via `Notification` in the main process, multiple
floor plans ("Etagen") per project with per-floor pins, a Kanban view
(offen/in Bearbeitung/erledigt, click-to-move) alongside the list view, a
cross-project dashboard ("Übersicht"), and PDF (via `webContents.printToPDF`
in a hidden `BrowserWindow`, no dependency needed) + CSV (semicolon-delimited,
BOM-prefixed for Excel) exports per project. `window.prompt()` does not work
in Electron's renderer (Chromium disabled it) — use a real modal for any new
free-text input, not `prompt()`, as originally attempted for adding a floor.
