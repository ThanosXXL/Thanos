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
- Employee: `{ id, name, reminderStart, reminderEnd, targetHoursPerDay, active, createdBy, adminId }` — `reminderStart`/`reminderEnd` are `"HH:MM"` strings (defaults `"06:30"`/`"15:00"`) that drive that employee's own reminder schedule; `targetHoursPerDay` (default `8`) is the daily Soll-Stunden used by the Auswertung tab. `adminId` is `null` for a regular employee, or an admin's id if this record is that admin's own linked time-tracking entry (see below).
- Time entry: `{ id, employeeId, date, start, end, pauseStart, pauseEnd, note }` — `date` is `"YYYY-MM-DD"`, the four time fields are `"HH:MM"` or `null`. `pauseStart`/`pauseEnd` model a single lunch/break window per day (not multiple breaks) and are subtracted from worked time by `workedHours()`. At most one entry per `(employeeId, date)` pair is expected; `findEntry()` looks it up.
- Absence: `{ id, employeeId, type, dateFrom, dateTo, note }` — `type` is `'urlaub'` or `'krank'`; `dateFrom`/`dateTo` are inclusive `"YYYY-MM-DD"` date-range strings compared directly (they sort/compare correctly as plain strings, no `Date` parsing needed). Unlike time entries, an absence spans multiple days per record rather than one row per day. `findAbsence(employeeId, date)` looks up whichever absence (if any) covers a given date.

IDs come from the local `uid()` helper (timestamp + random). `load()`/`normalizeEmployees()` back-fill `reminderStart`/`reminderEnd`/`targetHoursPerDay`/`active` on older employee records that predate those fields — follow this pattern when adding new fields to the shapes above so existing saved files keep loading.

### Admins are also employees

Every admin gets their own linked employee record so they clock in/out on the kiosk and get reminded
exactly like anyone else — admins are not exempt from tracking their own time. `ensureAdminEmployees()`
(called from `load()`, `addAdmin()`, and after renaming an admin) makes sure each admin in `state.admins`
has exactly one `state.employees` row with `adminId` set to that admin's id, creating it on first run and
keeping its `name` in sync with the admin's name; this also self-heals if that row was ever deleted. The
linked employee otherwise behaves like a normal one (kiosk tile, Pause, Urlaub/Krank, Auswertung, CSV
export all just work — no special-casing needed there). The "Mitarbeiter" tab table marks these rows with
a small "Admin" badge next to the name, disables the "Löschen" button while the admin account still exists
(delete the admin instead, in "Administratoren"), and locks the Name field in the edit modal (rename via
the admin account instead, to keep the two in sync). Deleting an admin unlinks (`adminId = null`) rather
than deletes their employee row, so their time history is preserved and the row becomes a normal employee.

### Reminder engine

`checkReminders()` runs on load and then every `REMINDER_CHECK_MS` (30s). For each active employee it compares the current time against `reminderStart`/`reminderEnd` and that employee's today-entry; if a reminder is due it calls `maybeNotify(key, title, body)`, which throttles per `key` (e.g. `start-<employeeId>`) to at most one `Notification` per `REMINDER_REPEAT_MS` (10 min) — so each employee is reminded individually and repeatedly until their entry is filled in, independent of the other employees. An employee with a `findAbsence()` hit for today (on Urlaub or krankgeschrieben) is skipped entirely — no reminder, and the kiosk tile shows a type badge instead of Kommen/Pause/Gehen controls.

### Absences (Urlaub/Krank)

Recorded through the same "Zeiteintrag"-style modal (`entryModal`) as time entries, toggled by the `entryType` select (`arbeit` | `urlaub` | `krank`): choosing `arbeit` shows `#entryWorkFields` (single date + times), choosing `urlaub`/`krank` shows `#entryAbsenceFields` (`Von`/`Bis` date range) instead, via `updateEntryTypeVisibility()`. `openEntryModal(item, presetType)` disambiguates what it was handed by shape — `item.type` set means it's an absence being edited, `item.date` set (no `.type`) means a time entry, neither means a new record of `presetType`. Once created, an absence's type can't be switched (the select is disabled while editing). Absences render in their own card below the time-entries table in the "Zeiten" tab (`renderAbsencesCard()`), and `absenceDaysInMonth()` feeds Urlaubstage/Kranktage columns into the "Auswertung" tab, clipped to the selected month. Deleting an employee also deletes their absences.

### Browser fallback (demo/testing)

At the top of `renderer.js`, if `window.zeitAPI` is absent (i.e. the page is opened outside Electron, with no preload bridge), a `localStorage`-backed shim is installed under the same name before anything else runs. This means `renderer/index.html` can be opened directly in any browser — or inlined into a single self-contained HTML file — for a fully working demo/test build with no Electron involved; the Electron path is untouched since `contextBridge` always provides `window.zeitAPI` there first.

### Auswertung (Soll/Ist) and exports

- `workedHours(entry)` / `durationStr(entry)` compute worked time as `end - start`, minus the pause window when both `pauseStart` and `pauseEnd` are set.
- The "Auswertung" admin tab sums `workedHours()` per employee for a selected `YYYY-MM` month and compares it against `targetHoursPerDay × (days with a completed entry that month)` — Soll-Stunden are only counted for days actually worked, not calendar/workdays, to avoid needing a holiday/vacation model.
- "Zeiten" tab entries can be exported as CSV (`exportEntriesCsv`) and the full `state` can be exported/imported as a JSON backup ("Mein Konto" tab, `exportBackup`/`importBackupFile`) — both build a `Blob` and trigger a synthetic `<a download>` click; import replaces `state` wholesale after a confirm step and logs the current admin out.

## Conventions

- User-facing strings, list labels, and comments are in German. Match the existing language when touching the UI.
- Build DOM with `createElement` and set user-controlled text via `textContent` (never `innerHTML`) — `innerHTML` is only ever assigned static, hardcoded markup (e.g. a table's `<thead>`), never a template string containing user/data-derived values.

## Releases (CI)

`.github/workflows/build-release.yml` builds 5 installers across three OS runners: Windows (`nsis`), macOS
`x64`+`arm64` (two `dmg`s, via `mac.target: [{ target: "dmg", arch: [...] }]` — a top-level `mac.arch` key
is rejected by electron-builder's schema), and Linux (`AppImage` + `deb`; the `deb` target needs a real
`author.email` in `package.json` or the build fails). `artifactName` is set explicitly per platform
(`Zeiterfassung-<version>-<platform>.<ext>`) so a download page can link to predictable filenames.

It triggers on pushing a `v*` tag, or manually via **Actions → Run workflow** with the `publish` checkbox.
Publishing does **not** use electron-builder's own `--publish` flag — its GitHub integration creates the
release as a draft when run across a matrix (each OS job only appends assets; nothing ever un-drafts it),
which left real tag-pushes sitting as invisible, unlisted drafts more than once. Instead a `prepare-release`
job runs first (only when `ref_type == 'tag'` or `publish == 'true'`): it deletes any stale release/draft for
the target tag, then `gh release create`s a fresh non-draft one. Each OS job then builds with
`--publish never` and `gh release upload`s its installers straight into that release — this also sidesteps
the Actions artifact storage quota (shared across every project in this repo, and exhausted more than once
this session) since Release assets are billed separately and aren't capped the same way. A plain
build-only dispatch (`publish` left `false`) skips `prepare-release` and falls back to uploading via
`actions/upload-artifact` instead (90-day retention, not a permanent Release).
