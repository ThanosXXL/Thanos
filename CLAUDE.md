# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Buchhaltung!** is a cross-platform Electron desktop app (plus a PWA build for the web/mobile) for managing
bookkeeping (income and expenses) for up to four *Administratoren* (admins). Each admin has their own
per-year, per-month ledger for January–December, tracking `einnahmen` (income) and `ausgaben` (expenses).
Each month can be marked `abgeschlossen` (closed/complete). From the 28th of each month, a daily reminder
(modal + banner + OS notification) appears at 11:30 local time until every admin's current month is marked
complete. The UI is in German.

## Commands

```bash
npm install       # install dependencies
npm start          # run the app in development (electron .)
npm run dist       # build installers into dist/ via electron-builder (win: nsis, mac: dmg, linux: AppImage)
npm run build:web  # sync renderer/ -> docs/ for the GitHub Pages PWA build
```

There is no test suite, linter, or build/transpile step — the renderer is plain HTML/CSS/vanilla JS loaded
directly, and the main process is plain Node. Changes are verified by running `npm start`, or headlessly via
Electron + Xvfb (`xvfb-run electron --no-sandbox --disable-gpu <script>.js`, capturing screenshots with
`webContents.capturePage()`) when no display is available.

## Architecture

Standard Electron three-process split with `contextIsolation: true` and `nodeIntegration: false`:

- **`main.js`** (main process) — creates the `BrowserWindow`, a `Tray` icon (closing the window hides it
  instead of quitting, so the reminder loop keeps running in the background — only the tray's "Beenden"
  or `before-quit` actually exits), and owns all persistence. Registers IPC handlers: `load-data` /
  `save-data` (JSON file at `app.getPath('userData')/buchhaltung-data.json`, degrading to
  `{ administratoren: [], einstellungen: {} }` on any read/parse failure), `show-notification` (native OS
  notification), `get-autostart` / `set-autostart` (login item settings), and `export-csv` /
  `export-backup` / `import-backup` (save/open dialogs for CSV and JSON backup files).
- **`preload.js`** — the only bridge. Exposes `window.dashboardAPI` with all of the above, each forwarding
  to `ipcRenderer.invoke`. Any new main↔renderer capability must be added here; the renderer has no direct
  Node/Electron access.
- **`renderer/`** — the entire UI, shared verbatim between the Electron shell and the PWA build:
  - `index.html` — static shell (header with admin tabs, year bar, month tabs, `#content`, install banner,
    footer reminder banner) plus modals for entry add/edit, delete-confirm, reminder, and settings.
  - `renderer.js` — single IIFE holding all app logic and state.
  - `style.css` — the glossy wine-red/yellow 3D theme.
  - `manifest.json`, `sw.js`, `icons/` — PWA support (installable on Android/iOS via "Add to Home Screen").
- **`docs/`** — a build artifact: an exact copy of `renderer/` produced by `scripts/sync-docs.js` /
  `npm run build:web`, served by GitHub Pages. **Never hand-edit files in `docs/`** — edit `renderer/` and
  re-run the sync script (the `deploy-pages.yml` workflow does this automatically on push to `main`).
- **`build/icon.png`, `assets/`** — app/tray icon source images (electron-builder auto-generates `.icns`/
  `.ico` from `build/icon.png`).

### Electron vs. browser/PWA runtime

`renderer.js` feature-detects `window.dashboardAPI`: inside Electron it's provided by `preload.js`; in a
plain browser/PWA context (no Electron), `createLocalStorageApi()` provides an API-compatible fallback
backed by `localStorage`, `Notification`, and `<a download>` / `<input type=file>` for export/import. Keep
both paths working when changing the API surface — anything added to `dashboardAPI` needs a matching
fallback in `createLocalStorageApi()`.

### State and data flow

The renderer keeps the whole app state in one in-memory `state = { administratoren: [], einstellungen: {} }`
object. The canonical pattern for any mutation is: **mutate `state` → call `persist()` → call `render()`**.
`persist()` pushes the full state through `dashboardAPI.saveData`; there is no partial/diff saving.
`render()` rebuilds the DOM from scratch, so there is no incremental DOM updating — always drive the UI by
changing `state` and re-rendering, never by hand-editing the DOM.

Each admin object is `{ id, name, jahre: { [year]: { monate: { "01".."12": { einnahmen, ausgaben,
abgeschlossen } } } } }`. Entries are `{ id, datum, beschreibung, kategorie, zahlungsart, beleg, betrag }`.
IDs come from the local `uid()` helper (timestamp + random). `MAX_ADMINS = 4` caps the number of admins.
`einstellungen` holds shared settings: category lists, autostart flag, last-reminder-shown date, and the
currently active admin/year/month (persisted so the app reopens where the user left off).

`init()` loads persisted data, backfills missing fields (administrators, categories, settings) on older
records — follow this pattern when adding new fields so existing saved files keep loading.

### Reminder logic

`isReminderWindowNow()` returns true from the 28th of the month, after 11:30 local time. `checkReminder()`
runs once ~1.2s after load and then every 60s. It always refreshes the persistent footer banner
(`renderReminderBanner()`), but only pops the modal + fires an OS notification once per calendar day
(tracked via `einstellungen.letzteErinnerung`), to avoid being annoying while still satisfying "reappears
daily until resolved." Because the window hides-to-tray instead of closing, the renderer (and thus this
interval) keeps running in the background as long as the app isn't fully quit — autostart-at-login
(`setting-autostart`) makes this reliable across reboots. This is a design tradeoff, not a guarantee: if the
user fully quits the app (via the tray menu), no reminder fires until it's reopened.

## Vertraulichkeit & Zugriff (WICHTIG)

Dieses Projekt ist **proprietär** (`"license": "UNLICENSED"`, siehe `LICENSE`) — der Eigentümer plant,
die App möglicherweise kommerziell zu verkaufen. Daraus folgt eine feste Regel, die für **jede** Session,
jedes Fenster und jeden Klon dieses Repos gilt:

- **Niemals** Personen als GitHub-Collaborator zum Repository hinzufügen und **niemals** vorschlagen, das
  Repository öffentlich zu machen. Es gibt bei GitHub keine Zugriffsstufe, die Quellcode verbirgt — jeder
  Collaborator kann den kompletten Code klonen.
- **Ausschließlich der Repo-Owner** darf Zugriff auf den Quellcode haben. Kolleginnen/Kollegen, Kunden oder
  Tester bekommen **nur die fertig gebauten Installer-Dateien** (`.exe`/`.dmg`/`.AppImage` bzw. die
  gepackte Web-Version), niemals Repo- oder Quellcode-Zugriff.
- Falls eine Aufgabe scheinbar erfordern würde, jemanden einzuladen oder das Repo öffentlich zu schalten:
  stattdessen nachfragen bzw. auf reine Datei-Weitergabe (Chat/Mail/Freigabe-Link) der gebauten Artefakte
  ausweichen.

## Conventions

- User-facing strings, list labels, and comments are in German. Match the existing language when touching
  the UI.
- Build DOM with `createElement` and set user-controlled text via `textContent` (never `innerHTML`) — this
  is done consistently to avoid injecting untrusted entry/category content.
- Icons (`build/icon.png`, `renderer/icons/*.png`, `assets/tray.png`) are generated with a pure-Python PNG
  encoder (no Pillow/ImageMagick available) — see git history for the generator if new sizes are needed.

## Releases (CI)

- `.github/workflows/build-release.yml` has two stages: a `build` matrix (Windows/macOS/Linux, `npm run
  dist`, no publish) that always runs and uploads each OS's installer as a workflow artifact, and a
  `release` job that only runs on a `v*` tag push or a manual run with the `publish` input set to `true`.
  The release job downloads all three artifacts, deletes any stale draft release for the target tag
  (`gh release delete ... --cleanup-tag`), then publishes a clean release with `gh release create`.
  **Do not** rely on electron-builder's own `--publish always` here — triggered from a non-tag ref it only
  ever produces a permanently-draft "untagged-xxxx" release with no working download links, which is why
  this project uses the two-stage design instead. Artifact names are pinned
  (`Buchhaltung-Windows-Setup.exe`, `Buchhaltung-macOS.dmg`, `Buchhaltung-Linux.AppImage` via
  `build.<platform>.artifactName`) so the in-app download banner can link to
  `.../releases/latest/download/<fixed-name>` without needing updates per release.
- This repository hosts multiple unrelated projects across different branches, and already has generic
  `v1.0.0`/`v0.1.1` releases belonging to other apps. Buchhaltung!'s `package.json` version must stay
  distinct from those to avoid electron-builder/`gh release` colliding with someone else's release.
- Pushing a git tag directly from a Claude Code session is blocked (403) by this environment's sandboxed
  git proxy — use the manual `publish: true` workflow_dispatch input instead (see above); it does not
  require pushing a tag yourself.
- `.github/workflows/deploy-pages.yml` syncs `renderer/` → `docs/` and publishes it to GitHub Pages on every
  push to `main` that touches `renderer/`. GitHub Pages itself must be pointed at **Source: GitHub Actions**
  once, manually, in repository Settings — this workflow only handles subsequent deploys.

### Current live release (keep this section in sync — do not lose track of it)

As of this writing, a real, published (non-draft) GitHub Release already exists at tag **`v1.1.0`**, built
from this project's own code (not to be confused with the unrelated `v1.0.0`/`v0.1.1` releases from other
projects sharing this repo — see above). Its fixed-name assets are what `renderer/download.html` and the
in-app install banner link to:

- https://github.com/ThanosXXL/Thanos/releases/tag/v1.1.0
- https://github.com/ThanosXXL/Thanos/releases/latest/download/Buchhaltung-Windows-Setup.exe
- https://github.com/ThanosXXL/Thanos/releases/latest/download/Buchhaltung-macOS.dmg
- https://github.com/ThanosXXL/Thanos/releases/latest/download/Buchhaltung-Linux.AppImage

The repo is **private**, so these links only resolve for the repo owner (or anyone later given access —
see "Vertraulichkeit & Zugriff" above, which currently forbids that). Whenever a future change should ship
as a new build (new features, bug fixes the owner wants distributed), bump `package.json`'s `version` to a
value not already used by any release in this repo, then trigger `build-release.yml` via `workflow_dispatch`
with `publish: true` (see the two-stage design above) — do not assume the owner will do this manually, and
do not leave `download.html`/README references pointing at a stale version. Keep this section's tag/links
updated to whatever the actual latest Buchhaltung! release is after doing so.
