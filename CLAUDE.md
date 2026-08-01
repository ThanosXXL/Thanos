# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Inventar - Dashboard is a cross-platform Electron desktop app for managing a device inventory (`state.inventar`) — Gerät, Hersteller, Zustand (OVP/Gebraucht), Stückzahl — with keyboard, microphone dictation (Web Speech API), and camera-based photo recognition (TensorFlow.js `coco-ssd`, lazy-loaded from a CDN) as input methods. Issuing stock to a colleague/customer logs an `ausgaben` entry and shows a low-stock reminder toast once the remaining quantity drops to `LOW_STOCK_THRESHOLD`. The UI is in German, styled throughout in a gold/brown, glossy, 3D theme (`renderer/style.css`).

**The app previously also had a "Dozenten" (instructor-management) mode with a mode switch in the header. That mode was deliberately and permanently removed** at the user's explicit, repeated request — do not reintroduce a mode switch, Dozenten tabs, or Dozenten CRUD logic. The app's only purpose now is the device inventory. Internal filenames and a few release-pipeline identifiers (installer artifact names, the `dozenten-data.json` data file name, `package.json`'s `name`/`productName`/`appId`) still carry the old "Dozenten Dashboard" name — that is intentional, to avoid breaking the GitHub Releases/CI pipeline and the PowerShell/downloader asset-matching logic; only user-visible branding was renamed to "Inventar - Dashboard".

## Commands

```bash
npm install       # install dependencies
npm start          # run the app in development (electron .)
npm run start:demo # run with seeded sample data in a separate data file (electron . --demo)
npm run dist       # build installers into dist/ via electron-builder (win: nsis, mac: dmg, linux: AppImage)
```

There is no test suite, linter, or build/transpile step — the renderer is plain HTML/CSS/vanilla JS loaded directly, and the main process is plain Node. Changes are verified by running `npm start`.

## Architecture

Standard Electron three-process split with `contextIsolation: true` and `nodeIntegration: false`:

- **`main.js`** (main process) — creates the `BrowserWindow`, and owns all persistence. Registers two IPC handlers, `load-data` and `save-data`, that read/write a single JSON file at `app.getPath('userData')/dozenten-data.json`. `loadData()` returns `{ inventar: [] }` on any read/parse failure, so a missing or corrupt file degrades gracefully. Also installs a `setPermissionRequestHandler` that allows `media` (camera/microphone) requests, needed for photo recognition and voice dictation.
- **`preload.js`** — the only bridge. Exposes `window.dashboardAPI` with `loadData()` and `saveData(data)`, each forwarding to `ipcRenderer.invoke`. Any new main↔renderer capability must be added here; the renderer has no direct Node/Electron access.
- **`renderer/`** — the entire UI. `index.html` is the static shell (header, inventar toolbar, `#content`, and modals for add/delete/ausgeben/admin-PIN). `renderer.js` is a single IIFE holding all app logic and state — there is no `mode` concept anymore, it renders straight into `#content`. `style.css` is the styling; the gold/brown/glossy/3D look is the root theme (no `body.mode-inventar` scoping needed).
- **`demo-data.js`** — sample Inventar seed data, used only by the `--demo` launch flag (see below).
- **`docs/`** — static, standalone HTML pages (not part of the Electron app bundle), all built around **`download.html`** as the single landing/download hub.

  **Firm standing rule: every new downloadable deliverable (demo, video, handbook, script, app build, ...) must be added to `download.html` — with a working link/embed — in the same change that introduces it. Never as a follow-up, never only sent via chat.** This was asked for explicitly and repeatedly; treat it as non-negotiable, not a preference to weigh.

  The hero has a platform-adaptive 1-click download block: `detectOS()` in `download.html`'s inline `<script>` sniffs `navigator.userAgent` (iOS/Android/Mac/Linux/Windows, defaulting to Windows) and swaps the big `#autoBtn` CTA's label/href to match, highlights the matching card in the 5-platform grid below it (Windows, macOS, Linux, Android, iOS), and offers a "🔗 Link kopieren, an Kunden schicken" button so the page itself can be handed to a customer and self-adapts on their device. Android/iOS have no native installer (Electron doesn't build those) — both point at `demo-inventar.html`, labeled "Browser-Demo", never a fake install link. This hero setup has been added/removed/re-added a few times at the user's request; the current state (as of this note) is: present, with all 5 platforms. Don't second-guess and remove it again without being asked — confirm the current on-page vs. chat-only split with the user before changing it, this has flip-flopped before.

  There are four handbooks, each with example screenshots from `docs/images/` and each also generated as a PDF: `handbuch.html`/`handbuch.pdf` (general user manual), `handbuch-inventar.html`/`handbuch-inventar.pdf` (Inventar-Dashboard deep dive), `skript-handbuch.html`/`skript-handbuch.pdf` (PowerShell script + downloader app — technical rollout doc), and `admin-handbuch.html`/`admin-handbuch.pdf` (day-to-day Admin-Modus usage for the four admins — PIN entry, downloads list, Nachbestellungen). Keep this 4-way split; don't recombine them. Regenerate all four PDFs with `npm run build:handbook-pdfs` (runs `docs/build-handbook-pdfs.js`, using Electron's `webContents.printToPDF` to render each handbook HTML file with full styling/images intact) whenever a handbook HTML file changes — `download.html`'s "PDF herunterladen" links point at these generated files, not the HTML. Every handbook section describing a concrete UI feature or workflow must include a screenshot; purely textual/reference sections (privacy notices, FAQ, parameter tables) don't need one.

  `demo-inventar.html` + `demo-inventar-shim.js` are the interactive browser demo featured on the download page (localStorage-backed `dashboardAPI` shim, reuses `renderer/renderer.js` unmodified). `demo-inventar-standalone.html` is a generated, fully self-contained version (CSS/JS inlined) meant to be downloaded and opened offline; regenerate it with `npm run build:demo-standalone` (runs `docs/build-standalone-demo.js`) whenever `renderer/style.css`, `renderer/renderer.js`, or `docs/demo-inventar-shim.js` change — it is not rebuilt automatically. The demo HTML file must stay in sync with `renderer/index.html` on every element ID `renderer.js` looks up (`document.getElementById(...)`); a mismatch throws at load and breaks the whole page.

  `docs/demo-video.webm` is a real (not staged/mocked) screen recording of the Inventar-Dashboard, captured with Playwright + the Chromium/ffmpeg binaries already present at `/opt/pw-browsers` (`recordVideo` on a `BrowserContext`) — Playwright itself is not a project dependency, only used ad hoc to (re)generate this asset; re-record it if the Inventar-Dashboard UI changes noticeably. The bundled ffmpeg build only has a VP8/WebM encoder (no H.264), so there is no MP4 alternative.
- **`scripts/Install-DozentenDashboard.ps1`** — PowerShell script that downloads the latest Windows installer from GitHub Releases straight to the user's Desktop and launches it; its comment-based help doubles as the admin/technical documentation for that automation. The filename is kept for release-pipeline continuity even though its visible banner text now says "Inventar - Dashboard". **At the user's explicit request, the PowerShell one-liner/instructions card was removed from `download.html`** — PowerShell content belongs only in this script and in `skript-handbuch.html` (still listed under Handbücher), not promoted on the main download page. This is a deliberate, narrower exception to the "every deliverable belongs on `download.html`" standing rule above; don't re-add a PowerShell card there unless the user asks.
- **`downloader/`** — eigenständige, winzige Electron-App (portable .exe unter Windows), ebenfalls mit Gold/Braun-UI ("Inventar - Dashboard" branding); `productName` in `downloader/package.json` stays `Dozenten Dashboard Downloader` (the real, released executable name).

### Demo mode

`electron . --demo` (or `npm run start:demo`) makes `main.js` use a separate data file (`dozenten-data-demo.json` instead of `dozenten-data.json`) and seed it from `demo-data.js` on first run, so it never touches real user data. The renderer detects demo mode (via a `?demo=1` load-file query param, or `window.__DASHBOARD_DEMO__` set by `docs/demo-inventar-shim.js` for the browser demo) and shows a gold "DEMO-VERSION" ribbon above the header.

### State and data flow

The renderer keeps the whole app state in one in-memory `state = { inventar: [] }` object. The canonical pattern for any mutation is: **mutate `state` → call `persist()` → call `render()`**. `persist()` pushes the full state through `dashboardAPI.saveData`; there is no partial/diff saving. `render()` rebuilds `#content` from scratch on every call, so there is no incremental DOM updating — always drive the UI by changing `state` and re-rendering, never by hand-editing the DOM.

Each inventory item is `{ id, geraet, hersteller, zustand, stueckzahl, photo, ausgaben, nachbestellungen }`, where `zustand` is `'OVP'` or `'Gebraucht'`, `photo` is a captured `data:` URL or `null`, `ausgaben` is a log of `{ id, menge, empfaenger, datum }` issue-outs, and `nachbestellungen` is a log of `{ id, menge, status, datum }` reorder requests (`status`: `'offen'` | `'bestellt'` | `'erledigt'`). IDs come from the local `uid()` helper (timestamp + random). `LOW_STOCK_THRESHOLD` drives the low-stock reminder badge/toast.

### Admin mode

Four fixed PINs (`ADMIN_PINS` in `renderer.js`, one per admin) gate an in-session-only `isAdmin` flag — it is **not** persisted, so every launch starts locked, and there is no PIN-setup flow. The "🔒 Admin-Modus" button in the Inventar toolbar prompts for one of the four PINs; a correct one reveals an admin panel at the top of the dashboard with a static list of all download links and the `nachbestellungen` management UI (add/status-change/delete), all gated behind `if (!isAdmin) return;` guards in their handler functions. This is a lightweight local UI gate for accidental-change protection, not real multi-user authentication.

A Nachbestellungen reminder banner appears at the top of the dashboard on Tuesdays and Fridays from 10:00 onward whenever there is at least one open (`'offen'`) reorder, and stays until all are resolved.

`init()` loads persisted data and back-fills `inventar: []` / `ausgaben: []` / `nachbestellungen: []` on older records that predate those fields — follow this pattern when adding new fields to the inventory item shape so existing saved files keep loading.

## Conventions

- User-facing strings, list labels, and comments are in German. Match the existing language when touching the UI.
- Build DOM with `createElement` and set user-controlled text via `textContent` (never `innerHTML`) — this is done consistently to avoid injecting untrusted list/chat content.

## Releases (CI)

`.github/workflows/build-release.yml` builds and publishes installers for Windows, macOS, and Linux. It triggers on pushing a `v*` tag (e.g. `v1.0.0`) or manually via **Actions → Build & Release Desktop App → Run workflow**, running `npm run dist -- --publish always` to upload artifacts to GitHub Releases (`publish: github` in `package.json`).
