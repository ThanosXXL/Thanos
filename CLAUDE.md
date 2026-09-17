# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dozenten Dashboard is a cross-platform Electron desktop app for managing up to four *Dozenten* (instructors). Each instructor owns three lists — a To-Do list (`todos`), open projects (`openProjects`), and completed projects (`doneProjects`) — plus a chat/notes log (`chat`). Projects move between the open and completed lists; all state persists locally as JSON. The UI is in German.

This repository also hosts a second, unrelated project: `omniroute/` is a vendored snapshot of [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (an AI gateway/router, Next.js + TypeScript monorepo), included as-is with its own `package.json`, tooling, and `CLAUDE.md`. It does not share dependencies, build config, or CI with the Dozenten Dashboard — the root `npm install`/`npm start`/`npm run dist` commands above only ever touch the Dozenten Dashboard files (`main.js`, `preload.js`, `renderer/`); nothing in `omniroute/` is packaged into its installers. Treat `omniroute/` as its own project — see `omniroute/CLAUDE.md` and `omniroute/VENDORED.md` for details and provenance. It is a one-time snapshot, not a live sync with upstream.

A third project, `it-schulung/`, is a separate Electron desktop app for managing up to four IT-Schulungen (IT training courses), built with the same architecture as the Dozenten Dashboard (main/preload/renderer split, `contextIsolation: true`, JSON persistence in `app.getPath('userData')`) but as fully independent code: its own `package.json`, `main.js`, `preload.js`, `renderer/`, and data file (`it-schulung-data.json`, separate from `dozenten-data.json`). Each *Schulung* object is `{ id, name, erklaerung, admin, link, todos, offeneThemen, abgeschlosseneThemen, teilnehmer, chat }` — the training-course equivalent of a *Dozent*. `erklaerung` is a free-text description, `admin` names the person responsible, and `link` is the join URL for the daily live session (opened via `shell.openExternal` through an `open-external` IPC handler, restricted to `http(s)` URLs). `teilnehmer` is a fourth list (alongside `todos`, `offeneThemen`, `abgeschlosseneThemen`) holding the course's participants as `{ id, text }` entries. Run it with `npm install` / `npm start` / `npm run dist` from inside `it-schulung/`, not from the repo root. It shares no dependencies, build config, or CI with the Dozenten Dashboard or with `omniroute/`.

A fourth project, `fotonetz/`, is a separate Electron desktop app ("FotoNetz") for managing up to six photography *Aufträge* (jobs/shoots), again built with the same main/preload/renderer architecture (`contextIsolation: true`, JSON persistence in `app.getPath('userData')`) as fully independent code: its own `package.json`, `main.js`, `preload.js`, `renderer/`, and data file (`fotonetz-data.json`). Each *Auftrag* object is `{ id, titel, art, kunde, termin, link, preis, zahlungsstatus, notizen, todos, offeneEdits, fertigeEdits, referenzen, chat }` — the photography-job equivalent of a *Dozent*. `art` is the job category, a fixed dropdown (`AUFTRAGSARTEN` in `renderer.js`: Hochzeit, Verlobung / Paarshooting, Portrait, Familie, Business / Corporate, Event, Produkt, Sonstiges) also shown as a badge next to the panel title. `kunde` is the client name, `termin` is a free-text date/location field, `preis` is a free-text fee/honorarium field, `zahlungsstatus` is a fixed dropdown (`ZAHLUNGSSTATUS`: offen/angezahlt/bezahlt, color-coded), `notizen` is a free-text description (equipment, client wishes, style), and `link` is the gallery/delivery URL (opened via `shell.openExternal` through an `open-external` IPC handler, restricted to `http(s)` URLs). The four lists are `todos`, `offeneEdits` (open editing/deliverable tasks), `fertigeEdits` (finished ones, movable back and forth like the other apps' open/done lists), and `referenzen` (reference/inspiration entries). The renderer bundles its own Poppins webfonts (`renderer/fonts/*.woff2`, fetched once from Google Fonts and vendored — no runtime network dependency) and uses a black/navy glossy visual theme with an animated 3D-style SVG camera logo; both are purely `renderer/style.css` + `renderer/index.html` presentation and don't affect the state/IPC architecture. Run it with `npm install` / `npm start` / `npm run dist` from inside `fotonetz/`, not from the repo root. It shares no dependencies, build config, or CI with the Dozenten Dashboard, `it-schulung/`, or `omniroute/`.

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

`it-schulung/` has its own, separate release workflow, `.github/workflows/it-schulung-release.yml`, using a distinct tag prefix (`it-schulung-v*`, e.g. `it-schulung-v1.0.0`) so it never collides with the Dozenten Dashboard's `v*` tags in the same repo. Unlike the Dozenten Dashboard workflow, it does not rely on electron-builder's own GitHub publish step (which always computes the release tag from `package.json`'s `version` and would produce the same `v*`-style tag as the root app); instead each OS build uploads its installer as a plain workflow artifact, and a separate `release` job (gated on the `it-schulung-v*` tag) downloads all three and publishes them together to one GitHub Release under the exact pushed tag via `gh release create`.

`fotonetz/` follows the same pattern as `it-schulung/`: its own workflow, `.github/workflows/fotonetz-release.yml`, triggered by a `fotonetz-v*` tag (e.g. `fotonetz-v1.0.0`), building on all three OSes, uploading each installer as a plain workflow artifact, and a `release` job (gated on the `fotonetz-v*` tag) that downloads them and publishes one GitHub Release via `gh release create`.
