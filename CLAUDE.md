# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Zeiterfassung is a cross-platform Electron desktop time-tracking app. It has two sides:

- A **kiosk clock-in screen** (the default view, no login) where any employee taps "Kommt" / "Geht"
  to log their own start/end time for the day.
- An **admin panel** behind a PIN login, for up to four administrators. Each admin has their own
  4-digit PIN, and can create/edit/delete employees, correct time entries, and manage the other
  admin accounts.

A background reminder loop checks, once per minute interval, whether each active employee is past
their configured "Kommen" or "Feierabend" time without a matching entry for today, and fires a
repeating (per-employee) desktop `Notification` until that employee's entry is filled in. All state
persists locally as JSON. The UI is in German; the visual theme is a wine-red, glossy 3D ("Hochglanz")
look defined in `renderer/style.css`.

This repository also hosts a second, unrelated project: `omniroute/` is a vendored snapshot of [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (an AI gateway/router, Next.js + TypeScript monorepo), included as-is with its own `package.json`, tooling, and `CLAUDE.md`. It does not share dependencies, build config, or CI with Zeiterfassung — the root `npm install`/`npm start`/`npm run dist` commands above only ever touch the Zeiterfassung files (`main.js`, `preload.js`, `renderer/`); nothing in `omniroute/` is packaged into its installers. Treat `omniroute/` as its own project — see `omniroute/CLAUDE.md` and `omniroute/VENDORED.md` for details and provenance. It is a one-time snapshot, not a live sync with upstream.

## Commands

```bash
npm install     # install dependencies
npm start        # run the app in development (electron .)
npm run dist     # build installers into dist/ via electron-builder (win: nsis, mac: dmg, linux: AppImage)
```

There is no test suite, linter, or build/transpile step — the renderer is plain HTML/CSS/vanilla JS loaded directly, and the main process is plain Node. Changes are verified by running `npm start`.

## Architecture

Standard Electron three-process split with `contextIsolation: true` and `nodeIntegration: false`:

- **`main.js`** (main process) — creates the `BrowserWindow`, and owns all persistence. Registers two IPC handlers, `load-data` and `save-data`, that read/write a single JSON file at `app.getPath('userData')/zeiterfassung-data.json`. `loadData()` returns `{ admins: [], employees: [], entries: [] }` on any read/parse failure, so a missing or corrupt file degrades gracefully.
- **`preload.js`** — the only bridge. Exposes `window.zeitAPI` with `loadData()` and `saveData(data)`, each forwarding to `ipcRenderer.invoke`. Any new main↔renderer capability must be added here; the renderer has no direct Node/Electron access.
- **`renderer/`** — the entire UI. `index.html` is the static shell (header, `#content`, plus modals for setup/login/employee/admin/entry/confirm). `renderer.js` is a single IIFE holding all app logic, state, and the reminder engine. `style.css` is the wine-red glossy 3D styling.

### State and data flow

The renderer keeps the whole app state in one in-memory `state = { admins: [], employees: [], entries: [] }` object, plus non-persisted UI state (`session`, `ui`, `login`, editing-id variables) that lives only in memory and resets on reload. The canonical pattern for any mutation of `state`: **mutate `state` → call `persist()` → call `render()`**. `persist()` pushes the full state through `zeitAPI.saveData`; there is no partial/diff saving. `render()` rebuilds `#content` from scratch based on `ui.view` (`'kiosk'` or `'admin'`) and `ui.adminTab`, so there is no incremental DOM updating — always drive the UI by changing state and re-rendering, never by hand-editing the DOM. The modal elements themselves are static (defined in `index.html`) and are only shown/hidden via the `visible` class, not rebuilt.

Shapes:
- Admin: `{ id, name, pinHash }` — `pinHash` is `simpleHash(pin)`, a non-cryptographic hash (cyrb53); it's a convenience gate for a shared local kiosk machine, not a security boundary. `MAX_ADMINS = 4`.
- Employee: `{ id, name, reminderStart, reminderEnd, active, createdBy }` — `reminderStart`/`reminderEnd` are `"HH:MM"` strings (defaults `"06:30"`/`"15:00"`) that drive that employee's own reminder schedule.
- Time entry: `{ id, employeeId, date, start, end, note }` — `date` is `"YYYY-MM-DD"`, `start`/`end` are `"HH:MM"` or `null`. At most one entry per `(employeeId, date)` pair is expected; `findEntry()` looks it up.

IDs come from the local `uid()` helper (timestamp + random). `load()` back-fills `reminderStart`/`reminderEnd`/`active` on older employee records that predate those fields — follow this pattern when adding new fields to the shapes above so existing saved files keep loading.

### Reminder engine

`checkReminders()` runs on load and then every `REMINDER_CHECK_MS` (30s). For each active employee it compares the current time against `reminderStart`/`reminderEnd` and that employee's today-entry; if a reminder is due it calls `maybeNotify(key, title, body)`, which throttles per `key` (e.g. `start-<employeeId>`) to at most one `Notification` per `REMINDER_REPEAT_MS` (10 min) — so each employee is reminded individually and repeatedly until their entry is filled in, independent of the other employees.

## Conventions

- User-facing strings, list labels, and comments are in German. Match the existing language when touching the UI.
- Build DOM with `createElement` and set user-controlled text via `textContent` (never `innerHTML`) — this is done consistently to avoid injecting untrusted list/chat content.

## Releases (CI)

`.github/workflows/build-release.yml` builds and publishes installers for Windows, macOS, and Linux. It triggers on pushing a `v*` tag (e.g. `v1.0.0`) or manually via **Actions → Build & Release Desktop App → Run workflow**, running `npm run dist -- --publish always` to upload artifacts to GitHub Releases (`publish: github` in `package.json`).
