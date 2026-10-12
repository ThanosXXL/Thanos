# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dozenten Dashboard is a cross-platform Electron desktop app for managing up to four *Dozenten* (instructors). Each instructor owns three lists — a To-Do list (`todos`), open projects (`openProjects`), and completed projects (`doneProjects`) — plus a chat/notes log (`chat`). Projects move between the open and completed lists; all state persists locally as JSON. The UI is in German.

This repository also hosts a second, unrelated project: `omniroute/` is a vendored snapshot of [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (an AI gateway/router, Next.js + TypeScript monorepo), included as-is with its own `package.json`, tooling, and `CLAUDE.md`. It does not share dependencies, build config, or CI with the Dozenten Dashboard — the root `npm install`/`npm start`/`npm run dist` commands above only ever touch the Dozenten Dashboard files (`main.js`, `preload.js`, `renderer/`); nothing in `omniroute/` is packaged into its installers. Treat `omniroute/` as its own project — see `omniroute/CLAUDE.md` and `omniroute/VENDORED.md` for details and provenance. It is a one-time snapshot, not a live sync with upstream.

A third, also unrelated project lives in `radaralarm/`: **RadarAlarm** is a separate Electron desktop app — a demo-scoped construction-documentation / defect-management ("Mängelmanagement") / communication tool for building and real-estate projects (floor plans with clickable defect pins, defect cards with photo/status/priority/trade/due date, and a per-defect comment thread, team members with roles and per-defect assignment, a Kanban view, a cross-project dashboard, and PDF/CSV exports). It has its own `package.json`, `main.js`, `preload.js`, and `renderer/`, follows the same Electron hardening pattern as the Dozenten Dashboard (CSP, sandboxed `contextIsolation`, no direct Node access from the renderer, plus a global `web-contents-created` guard and sanitized save-dialog filenames), and persists to its own local JSON file — nothing is shared with the Dozenten Dashboard's data or code. It intentionally enforces demo limits (max projects / max defects per project, checked in the main process, not just the UI) since it has no backend — there is no license/payment or cloud-sync infrastructure behind it (see `radaralarm/CLAUDE.md` for the full history of what was explicitly deferred there, and don't build real multi-user/payment infra without re-confirming with the user first). The app footer has a copyright notice plus Impressum/Datenschutz modals — the Impressum is a deliberately empty placeholder (needs the real provider's details before any real publication), the Datenschutz text honestly describes the actual local-only, no-tracking architecture. `radaralarm/docs/` holds three separate PDFs (publishing/selling requirements, user manual, installation guide) and `radaralarm/branding/` an OS-detecting download landing page — kept as separate files/deliverables per the user's explicit "don't mix" instruction, not one combined document. Run it with `npm start` from inside `radaralarm/` (after its own `npm install`).

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

`radaralarm/` has its own, separate release workflow, `.github/workflows/radaralarm-release.yml`, using a distinct tag prefix (`radaralarm-v*`, e.g. `radaralarm-v0.1.0`) so it never collides with the Dozenten Dashboard's `v*` tags in the same repo. Its `package.json` has no `publish` config, so unlike the root workflow it does not rely on electron-builder's own GitHub publish step: each OS build just runs `npm run dist` and uploads the installer as a plain workflow artifact, and a separate `release` job (gated on the `radaralarm-v*` tag) downloads all three and publishes them together to one GitHub Release under the exact pushed tag via `gh release create`. No tag has been pushed yet — the workflow exists but has never actually run, so `radaralarm-download.html`'s links to the repo's Releases page are a placeholder until someone deliberately pushes a `radaralarm-v*` tag (a real, visible, hard-to-reverse action — confirm with the user before doing that rather than just tagging it because the workflow exists).
