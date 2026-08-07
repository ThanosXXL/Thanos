# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Dozenten Dashboard is a cross-platform Electron desktop app for managing up to four *Dozenten* (instructors). Each instructor owns three lists — a To-Do list (`todos`), open projects (`openProjects`), and completed projects (`doneProjects`) — plus a chat/notes log (`chat`). Projects move between the open and completed lists; all state persists locally as JSON. The UI is in German.

The app also hosts a second, independent feature reachable via the main nav: **Kundenverwaltung DELUXE**, a global CRM (customer list with contact fields, a Lead/Kontaktiert/Aktiv/Inaktiv status pipeline, and a per-customer notes/history log) styled in a dark-brown/gold 3D glossy theme, distinct from the Dozenten section's blue theme. It is not scoped per-Dozent — customers are shared across the whole app.

> **IMPORTANT — do not touch the Dozenten feature.** The user has asked that the existing Dozenten functionality (todos/openProjects/doneProjects/chat, the blue theme, `renderTabs()`, `renderPanel()`, `buildListColumn()`, `buildChatPanel()`, and the `addItem`/`deleteItem`/`toggleTodo`/`moveProject`/`addChatMessage`/`deleteChatMessage` functions in `renderer.js`, and the corresponding blue-themed rules in `style.css`) stay exactly as-is going forward. Do not refactor, restyle, "clean up", or otherwise modify any Dozenten-specific code or markup unless the user explicitly asks for a change to the Dozenten feature in that request. This rule is durable — it applies to every future session, not just the one it was written in. Work on the CRM (or anything else) without touching these.
>
> **IMPORTANT — CRM and Dozenten are fully independent; never let one brand leak into the other.** The user has explicitly said "CRM hat nichts mit DOZENTEN zu tun" (the CRM has nothing to do with Dozenten). Concretely: the shared chrome (`#appTitle`, `document.title`, `.app-header` styling) must switch per `activeView` — see `updateAppTitle()` in `renderer.js` and the `body.view-crm .app-header*` rules in `style.css` — so that while the CRM view is active, nothing on screen (header text, window/tab title, colors) reads "Dozenten", and while the Dozenten view is active, nothing reads "Kundenverwaltung"/"CRM"/"DELUXE". This applies to any screenshot, exported photo, or video made of either feature too — a CRM screenshot must not show Dozenten branding and vice versa. Keep `updateAppTitle()` (or its equivalent) in sync whenever the shared chrome changes. This rule is durable across every future session, new or continued.

This repository also hosts a second, unrelated project: `omniroute/` is a vendored snapshot of [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (an AI gateway/router, Next.js + TypeScript monorepo), included as-is with its own `package.json`, tooling, and `CLAUDE.md`. It does not share dependencies, build config, or CI with the Dozenten Dashboard — the root `npm install`/`npm start`/`npm run dist` commands above only ever touch the Dozenten Dashboard files (`main.js`, `preload.js`, `renderer/`); nothing in `omniroute/` is packaged into its installers. Treat `omniroute/` as its own project — see `omniroute/CLAUDE.md` and `omniroute/VENDORED.md` for details and provenance. It is a one-time snapshot, not a live sync with upstream.

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
- **`renderer/`** — the entire UI. `index.html` is the static shell (header, main nav for Dozenten/CRM, dozent tab nav, CRM toolbar, `#content`, and modals for add/delete of both Dozenten and Kunden). `renderer.js` is a single IIFE holding all app logic and state for both features. `style.css` is the styling — blue theme for Dozenten, dark-brown/gold glossy theme for CRM.

### State and data flow

The renderer keeps the whole app state in one in-memory `state = { dozenten: [], customers: [] }` object. The canonical pattern for any mutation is: **mutate `state` → call `persist()` → call `render()`**. `persist()` pushes the full state through `dashboardAPI.saveData`; there is no partial/diff saving. `render()` dispatches on `activeView` ('dozenten' | 'crm') and rebuilds the DOM from scratch for whichever view is active — no incremental DOM updating — always drive the UI by changing `state` and re-rendering, never by hand-editing the DOM.

Each *Dozent* object is `{ id, name, todos, openProjects, doneProjects, chat }`. List items are `{ id, text, done }`; chat messages are `{ id, text, time }`. IDs come from the local `uid()` helper (timestamp + random). `MAX_DOZENTEN = 4` caps the number of instructors.

Each *Kunde* (customer) object is `{ id, name, firma, telefon, email, adresse, status, createdAt, notes }`, where `status` is one of `CUSTOMER_STATUSES` (Lead/Kontaktiert/Aktiv/Inaktiv) and `notes` is a chronological log `{ id, text, time }` analogous to Dozenten chat.

`init()` loads persisted data and back-fills `chat: []` on older Dozent records and `customers: []` at the top level for older saves that predate those fields — follow this pattern when adding new fields to either the *Dozent* or *Kunde* shape so existing saved files keep loading.

## Conventions

- User-facing strings, list labels, and comments are in German. Match the existing language when touching the UI.
- Build DOM with `createElement` and set user-controlled text via `textContent` (never `innerHTML`) — this is done consistently to avoid injecting untrusted list/chat content.

## Releases (CI)

`.github/workflows/build-release.yml` builds and publishes installers for Windows, macOS, and Linux. It triggers on pushing a `v*` tag (e.g. `v1.0.0`) or manually via **Actions → Build & Release Desktop App → Run workflow**, running `npm run dist -- --publish always` to upload artifacts to GitHub Releases (`publish: github` in `package.json`).
