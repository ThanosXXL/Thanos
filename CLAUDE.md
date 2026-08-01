# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dozenten Dashboard is a cross-platform Electron desktop app for managing up to four *Dozenten* (instructors). Each instructor owns three lists — a To-Do list (`todos`), open projects (`openProjects`), and completed projects (`doneProjects`) — plus a chat/notes log (`chat`). Projects move between the open and completed lists; all state persists locally as JSON. The UI is in German.

The app also has a second mode, the **Inventar - Dashboard**, toggled via the header's mode switch (`#modeDozentenBtn` / `#modeInventarBtn`). It manages a flat inventory list (`state.inventar`) of devices — Gerät, Hersteller, Zustand (OVP/Gebraucht), Stückzahl — with keyboard, microphone dictation (Web Speech API), and camera-based photo recognition (TensorFlow.js `coco-ssd`, lazy-loaded from a CDN) as input methods. Issuing stock to a colleague/customer logs an `ausgaben` entry and shows a low-stock reminder toast once the remaining quantity drops to `LOW_STOCK_THRESHOLD`. This mode uses a distinct gold/brown, glossy, 3D-styled theme (`body.mode-inventar` in `style.css`), separate from the blue Dozenten theme.

## Commands

```bash
npm install     # install dependencies
npm start        # run the app in development (electron .)
npm run dist     # build installers into dist/ via electron-builder (win: nsis, mac: dmg, linux: AppImage)
```

There is no test suite, linter, or build/transpile step — the renderer is plain HTML/CSS/vanilla JS loaded directly, and the main process is plain Node. Changes are verified by running `npm start`.

## Architecture

Standard Electron three-process split with `contextIsolation: true` and `nodeIntegration: false`:

- **`main.js`** (main process) — creates the `BrowserWindow`, and owns all persistence. Registers two IPC handlers, `load-data` and `save-data`, that read/write a single JSON file at `app.getPath('userData')/dozenten-data.json`. `loadData()` returns `{ dozenten: [], inventar: [] }` on any read/parse failure, so a missing or corrupt file degrades gracefully. Also installs a `setPermissionRequestHandler` that allows `media` (camera/microphone) requests, needed for the Inventar mode's photo recognition and voice dictation.
- **`preload.js`** — the only bridge. Exposes `window.dashboardAPI` with `loadData()` and `saveData(data)`, each forwarding to `ipcRenderer.invoke`. Any new main↔renderer capability must be added here; the renderer has no direct Node/Electron access.
- **`renderer/`** — the entire UI. `index.html` is the static shell (header with mode switch, tab nav, inventar toolbar, `#content`, and modals for add/delete in both Dozenten and Inventar modes). `renderer.js` is a single IIFE holding all app logic and state. `style.css` is the styling, including the separate `body.mode-inventar` theme.

### State and data flow

The renderer keeps the whole app state in one in-memory `state = { dozenten: [], inventar: [] }` object. The canonical pattern for any mutation is: **mutate `state` → call `persist()` → call `render()`**. `persist()` pushes the full state through `dashboardAPI.saveData`; there is no partial/diff saving. `render()` branches on the `mode` variable (`'dozenten'` or `'inventar'`) and rebuilds the DOM from scratch, so there is no incremental DOM updating — always drive the UI by changing `state` and re-rendering, never by hand-editing the DOM.

Each *Dozent* object is `{ id, name, todos, openProjects, doneProjects, chat }`. List items are `{ id, text, done }`; chat messages are `{ id, text, time }`. Each inventory item is `{ id, geraet, hersteller, zustand, stueckzahl, photo, ausgaben }`, where `zustand` is `'OVP'` or `'Gebraucht'`, `photo` is a captured `data:` URL or `null`, and `ausgaben` is a log of `{ id, menge, empfaenger, datum }` issue-outs. IDs come from the local `uid()` helper (timestamp + random). `MAX_DOZENTEN = 4` caps the number of instructors; `LOW_STOCK_THRESHOLD` drives the low-stock reminder badge/toast.

`init()` loads persisted data and back-fills `chat: []` / `inventar: []` / `ausgaben: []` on older records that predate those fields — follow this pattern when adding new fields to the *Dozent* or inventory item shape so existing saved files keep loading.

## Conventions

- User-facing strings, list labels, and comments are in German. Match the existing language when touching the UI.
- Build DOM with `createElement` and set user-controlled text via `textContent` (never `innerHTML`) — this is done consistently to avoid injecting untrusted list/chat content.

## Releases (CI)

`.github/workflows/build-release.yml` builds and publishes installers for Windows, macOS, and Linux. It triggers on pushing a `v*` tag (e.g. `v1.0.0`) or manually via **Actions → Build & Release Desktop App → Run workflow**, running `npm run dist -- --publish always` to upload artifacts to GitHub Releases (`publish: github` in `package.json`).
