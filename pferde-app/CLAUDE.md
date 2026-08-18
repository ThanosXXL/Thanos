# CLAUDE.md (pferde-app/)

This directory is a self-contained, unrelated project living alongside the Dozenten Dashboard
(the repo root) and `omniroute/`. It shares no dependencies, build config, or CI with either.
**Never move, rename, or merge this project into the repo root** — see the "PERMANENT RULE" at
the top of the root `CLAUDE.md`: the Dozenten Dashboard's root files must never be touched or
replaced to make room for this app.

## Overview

Pferde App is a single self-contained HTML file (`PferdeApp.html`) for managing and securing
horses: chip registration, a photo-ID database (markings/brand marks), and a stable-break-in
alarm. It is built to be downloaded and opened directly (double-click) in any browser on any
OS — Windows, macOS, Linux, Android, iOS — with no install step, no server, and no build
tooling. All data (horses, chip numbers, photos, alarm log) lives only in the browser's
`localStorage`; nothing is sent to a server. The UI is in German. Visual design is navy blue
mixed with baby blue, glossy 3D surfaces, and bold black text throughout.

A fifth tab, "Demo-Video", plays a short walkthrough (`demo/pferde-app-demo.webm`, VP9 + Opus)
with generated background music and offers a "Demo-Video herunterladen" download button
(`<a download>`). Regenerating that video is a manual, off-repo process (Playwright screen
recording muxed with a synthesized music track via ffmpeg) — there is no build step that
produces it, so treat the checked-in `.webm` as a static asset. Use WebM/VP9+Opus, not MP4/H.264
— headless/plain Chromium builds commonly lack the proprietary H.264 decoder and fail to load an
MP4 `<source>` (`MEDIA_ERR_SRC_NOT_SUPPORTED`), which was confirmed while building this feature.

## Commands

There is no install step, build step, test suite, or linter. It is plain HTML/CSS/vanilla JS
in one file. Changes are verified by opening `PferdeApp.html` directly in a browser.

## Architecture

Everything lives in `PferdeApp.html`: inline `<style>` for the design, inline `<script>` for a
single IIFE holding all app logic and state, and a static shell (`<header>`, tab `<nav>`,
`#content`, and a full-screen `#alarmFullOverlay` used for the flashing alarm effect).

### State and data flow

The whole app state lives in one in-memory `state = { horses: [], alarm: { armed, triggered, log } }` object.
The canonical pattern for any mutation is: **mutate `state` → call `persist()` → call `render()`**.
`persist()` writes the full state to `localStorage` under the `pferdeAppData` key via
`JSON.stringify`; there is no partial/diff saving. `render()` rebuilds `#content` from scratch
based on `activeTab` (`renderUebersicht` / `renderChip` / `renderFoto` / `renderAlarm` / `renderDemo`), so
there is no incremental DOM updating — always drive the UI by changing `state` and
re-rendering, never by hand-editing the DOM. `loadData()` returns a fresh empty state on any
missing/corrupt `localStorage` value, so a cleared or broken store degrades gracefully.

Each horse object is `{ id, name, chip, rasse, fellfarbe, geburtsdatum, besitzer, notizen,
abzeichen, brandzeichen, fotos, registriertAm }`. `fotos` is an array of data-URL strings read
from uploaded files via `FileReader`. IDs come from the local `uid()` helper (timestamp +
random). The alarm log is an array of `{ zeit, text }` entries, capped at 50 via
`state.alarm.log.slice(0, 50)`.

The alarm feature (`renderAlarm` / `triggerAlarm`) is a local simulation: a Web Audio
oscillator beep loop, a CSS `@keyframes` red flash on `#alarmFullOverlay`,
`navigator.vibrate` on mobile, and an optional `Notification` — there is no real hardware
sensor integration.

## Conventions

- User-facing strings, list labels, and comments are in German. Match the existing language when touching the UI.
- Build DOM with the local `el()` helper (a thin `createElement` wrapper) and set user-controlled text via
  `textContent`/child text nodes (never `innerHTML` for user-controlled content) — this avoids injecting
  untrusted horse/photo/note data. Static markup for the page shell may use `innerHTML` with literal strings.
- When adding a new field to the horse shape, default it to an empty value so existing saved `localStorage`
  data keeps loading without a migration step.
