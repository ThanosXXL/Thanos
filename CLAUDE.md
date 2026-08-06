# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dozenten Dashboard is a cross-platform Electron desktop app for managing up to four *Dozenten* (instructors). Each instructor owns three lists — a To-Do list (`todos`), open projects (`openProjects`), and completed projects (`doneProjects`) — plus a chat/notes log (`chat`). Projects move between the open and completed lists; all state persists locally as JSON. The UI is in German.

This repository also hosts a second, unrelated project: `omniroute/` is a vendored snapshot of [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (an AI gateway/router, Next.js + TypeScript monorepo), included as-is with its own `package.json`, tooling, and `CLAUDE.md`. It does not share dependencies, build config, or CI with the Dozenten Dashboard — the root `npm install`/`npm start`/`npm run dist` commands above only ever touch the Dozenten Dashboard files (`main.js`, `preload.js`, `renderer/`); nothing in `omniroute/` is packaged into its installers. Treat `omniroute/` as its own project — see `omniroute/CLAUDE.md` and `omniroute/VENDORED.md` for details and provenance. It is a one-time snapshot, not a live sync with upstream.

A third, also unrelated project lives in `patientenwelt/`: **PatientenWelt**, a standalone Electron desktop app for managing patient records (Praxisverwaltung — patient list, journal/visit history, prescriptions, appointments, calendar, letters, lab values), styled in a blue-white 3D glossy theme with glossy/chrome 3D typography (gradient-filled headings via `.text-glossy-dark`/`.text-glossy-blue`). It is an original app (not vendored) that mirrors the Dozenten Dashboard's architecture pattern (`main.js`/`preload.js`/`renderer/`, `contextIsolation: true`) but has its own `package.json` and its own `window.patientenweltAPI` bridge. Its sidebar mixes real functionality with `PLACEHOLDER_GROUPS` entries (menu items present in the reference practice software but not implemented here) that render an honest "not available yet" panel rather than dead UI. See `patientenwelt/README.md`. All sample/patient data in it is fictional.

Unlike the Dozenten Dashboard, PatientenWelt's data file (`patientenwelt-data.json` in `userData`) is **encrypted at rest** (AES-256-GCM, multi-user PBKDF2 key-wrapping, Admin/Mitarbeiter roles, audit log, rotating backups) and gated behind a login/setup screen (`#authScreen` / `#appShell` in `renderer/index.html`) — see `patientenwelt/README.md`'s "Datensicherheit" section before touching `main.js`'s crypto helpers or the auth IPC handlers. Despite that, it is explicitly **not** a certifiable Praxisverwaltungssystem (no KBV approval, no TI/eHealth-Konnektor, no real billing interface) and must never be used with real patient data — see the "Grenzen" section of that README.

`patientenwelt/assets/branding/` is the durable, versioned home for the official PatientenWelt demo-video background music, so it survives across sessions instead of living only in one chat. `lounge-band.mp3` (~30s, piano/strings/soft beat, committed) is the track; `mix-demo-audio.sh` in that same folder muxes it under any demo video and auto-fits its length to the video (looping if shorter, trimming if longer) via `ffprobe`/`ffmpeg` — reuse it for every future demo video instead of re-deriving the ffmpeg invocation or re-asking the user for music. See `patientenwelt/assets/branding/README.md`.

**On "missing" assets in this repo:** this GitHub account hosts many unrelated, per-branch demo projects in the same `ThanosXXL/Thanos` repository (e.g. `claude/msr175-dashboard-demo-fyhsly`, `claude/kalenderwelt-software-ify3cj`, `claude/steuerbescheid-software-fmi2uk`, ...) — one per past user request, each on its own branch, sharing no code with each other or with the branch you're on. `lounge-band.mp3` itself was first generated on `claude/msr175-dashboard-demo-fyhsly` and only later copied here. Before telling a user an asset doesn't exist, check other branches too (`git fetch origin && git ls-tree -r --name-only origin/<branch>` per `git branch -r`), not just the current branch's working tree — it may already exist elsewhere in the same account and just need copying over, the way `lounge-band.mp3` did.

## Commands

```bash
npm install     # install dependencies
npm start        # run the app in development (electron .)
npm run dist     # build installers into dist/ via electron-builder (win: nsis, mac: dmg, linux: AppImage)
```

There is no test suite, linter, or build/transpile step — the renderer is plain HTML/CSS/vanilla JS loaded directly, and the main process is plain Node. Changes are verified by running `npm start`.

## Architecture

Standard Electron three-process split with `contextIsolation: true` and `nodeIntegration: false`:

- **`main.js`** (main process) — creates the `BrowserWindow`, and owns all persistence. Registers two IPC handlers, `load-data` and `save-data`, that read/write a single JSON file at `app.getPath('userData')/dozenten-data.json`. `loadData()` returns `{ dozenten: [] }` on any read/parse failure, so a missing or corrupt file degrades gracefully.
- **`preload.js`** — the only bridge. Exposes `window.dashboardAPI` with `loadData()` and `saveData(data)`, each forwarding to `ipcRenderer.invoke`. Any new main↔renderer capability must be added here; the renderer has no direct Node/Electron access.
- **`renderer/`** — the entire UI. `index.html` is the static shell (header, tab nav, `#content`, and two modals for add/delete). `renderer.js` is a single IIFE holding all app logic and state. `style.css` is the styling.

### State and data flow

The renderer keeps the whole app state in one in-memory `state = { dozenten: [] }` object. The canonical pattern for any mutation is: **mutate `state` → call `persist()` → call `render()`**. `persist()` pushes the full state through `dashboardAPI.saveData`; there is no partial/diff saving. `render()` rebuilds the DOM from scratch (`renderTabs()` + `renderPanel()`), so there is no incremental DOM updating — always drive the UI by changing `state` and re-rendering, never by hand-editing the DOM.

Each *Dozent* object is `{ id, name, todos, openProjects, doneProjects, chat }`. List items are `{ id, text, done }`; chat messages are `{ id, text, time }`. IDs come from the local `uid()` helper (timestamp + random). `MAX_DOZENTEN = 4` caps the number of instructors.

`init()` loads persisted data and back-fills `chat: []` on older records that predate that field — follow this pattern when adding new fields to the *Dozent* shape so existing saved files keep loading.

## Conventions

- User-facing strings, list labels, and comments are in German. Match the existing language when touching the UI.
- Build DOM with `createElement` and set user-controlled text via `textContent` (never `innerHTML`) — this is done consistently to avoid injecting untrusted list/chat content.

## Releases (CI)

`.github/workflows/build-release.yml` builds and publishes installers for Windows, macOS, and Linux. It triggers on pushing a `v*` tag (e.g. `v1.0.0`) or manually via **Actions → Build & Release Desktop App → Run workflow**, running `npm run dist -- --publish always` to upload artifacts to GitHub Releases (`publish: github` in `package.json`).
