# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dozenten Dashboard is a cross-platform Electron desktop app for managing up to four *Dozenten* (instructors). Each instructor owns three lists — a To-Do list (`todos`), open projects (`openProjects`), and completed projects (`doneProjects`) — plus a chat/notes log (`chat`). Projects move between the open and completed lists; all state persists locally as JSON. The UI is in German.

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
