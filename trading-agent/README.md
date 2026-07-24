# Trading Agent (Binance)

An autonomous crypto trading agent for Binance: pluggable strategy engine, hard
risk limits, backtesting, paper trading, and a local monitoring dashboard —
available as a CLI, a Windows desktop app, and an Android app.

## No guarantees — read this first

**No software can guarantee a profit, daily or otherwise.** Markets move
against every strategy some of the time, and a bad run can happen on day
one. This project does not, and will never, promise a specific return. What
it does provide is a framework with:

- **Paper trading by default** — no real orders are sent unless you
  deliberately switch modes.
- **A Binance Testnet mode** — real order flow, fake funds, so you can watch
  the full system run against a live exchange without financial risk.
- **Hard risk limits** — fixed risk-per-trade sizing, stop-loss/take-profit
  on every position, and a daily-loss kill-switch that stops the agent from
  opening new positions once a configured loss threshold is hit for the day.
- **A live mode** that only activates if you explicitly set both a
  `live` mode selection and a literal confirmation phrase — this is
  intentionally hard to trigger by accident.
- The current defaults trade more frequently (1-minute candles, short moving
  averages) per an explicit choice to trade more actively. **More trades is
  not the same as more profit** — it also means more exposure to noise, and
  on testnet/live, more exchange fees. The per-trade risk and daily-loss caps
  were tightened accordingly, but the trade-off is real, not eliminated.

If you go live, you are trading with real money and are solely responsible
for the outcome. Start with paper trading, then testnet, and only move to
live mode once you understand and accept how the strategy behaves.

## Downloads

Windows and Android builds are produced by CI, not by hand — nothing is
uploaded from a developer machine.

1. Push a tag matching `trading-v*` (e.g. `trading-v0.1.0`) to this
   repository, or run **Actions → Build & Release Trading Agent (Windows +
   Android) → Run workflow** manually.
2. The workflow builds the Windows installer (`.exe`, NSIS) and the Android
   package (`.apk`) and attaches both to a GitHub Release for that tag.
3. Download the `.exe` or `.apk` from the release page and run/install it.

The Android APK is **debug-signed** (see limitations below) — Android will
warn about an unverified app; that's expected for a sideloaded build that
hasn't gone through Play Store review, not a sign of tampering, as long as
you got it from this repository's GitHub Releases page.

**This session could not build or run either the Windows installer or the
Android APK** — the sandbox this was developed in has no Windows machine and
no Android SDK/emulator, and downloading the Android SDK components is
blocked by the sandbox's network policy. What was verified locally instead:
the Electron app boots cleanly under Xvfb with no wiring errors, the RN
project's TypeScript compiles with no errors, and its Jest test suite
passes. The actual `.exe`/`.apk` build should be treated as unverified until
someone runs the CI workflow (or builds locally) and confirms the outputs
install and run.

## Architecture

```
src/                     Core engine, shared by the CLI and the Electron desktop app
  config.js              loads & validates .env, gates live mode behind LIVE_CONFIRM
  binanceClient.js       public market data always from production Binance;
                         signed calls (account/order) go to testnet or live per mode
  riskManager.js         position sizing, stop-loss/take-profit, daily loss kill-switch
  strategy/              pluggable strategy interface + example SMA crossover strategy
  portfolio.js           balance, open positions, trade history (persisted to data/)
  agent.js               wires everything into a running loop (index.js is the entrypoint)
  backtester.js          replays historical candles through strategy + risk manager
  backtestRunner.js      CLI: fetches history and prints a backtest report
  dashboard/             local Express server + static page showing live status

electron-main.cjs        Electron main process: settings storage, spawns electron-run.js
electron-preload.cjs     contextBridge API exposed to the renderer
electron-run.js          child-process entrypoint: starts the dashboard server + agent
electron-renderer/       settings form, start/stop, log console, embedded dashboard iframe

android-app/             Standalone React Native app — a full on-device trading engine,
                          not just a remote monitor. Ported (not shared) from src/ since
                          the mobile runtime has no Node.js APIs.
  src/config.js          AsyncStorage-backed settings, mirrors the CLI's validation rules
  src/binanceClient.js   fetch + WebSocket + crypto-js HMAC signing (no node:crypto on RN)
  src/riskManager.js     identical logic to the CLI version, ported
  src/strategy/          identical logic to the CLI version, ported
  src/portfolio.js       AsyncStorage instead of the filesystem
  src/agent.js           same orchestration as the CLI's agent.js
  src/backgroundTask.js  wraps the agent in a react-native-background-actions
                         foreground service so it can keep running while backgrounded
  App.tsx                settings + dashboard UI in one screen, polls AsyncStorage
```

State model (CLI/desktop): `Portfolio` mutates in memory, then persists the
full state to `data/state.json` and appends closed trades to
`data/trades.log` (JSON lines). The dashboard reads those files directly.
State model (Android): the same shape, persisted to `AsyncStorage` instead;
the UI polls it every few seconds rather than holding a live reference to
the running agent, since the agent may be executing inside a background
service.

## Setup (CLI / desktop, for development)

```bash
cd trading-agent
npm install
cp .env.example .env
```

Fill in `.env`:
- For **paper mode** (default), you can leave `BINANCE_API_KEY`/`SECRET`
  blank — market data comes from Binance's public production endpoints,
  which need no authentication, in every mode.
- For **testnet mode**, generate free keys at
  https://testnet.binance.vision (login with GitHub, no real funds involved).
- For **live mode**, generate keys at
  https://www.binance.com/en/my/settings/api-management. Restrict the key to
  spot trading only, and do not enable withdrawals on that key.

## Running (CLI)

```bash
npm start           # runs the agent (mode from TRADING_MODE in .env)
npm run backtest     # fetches recent history and reports how the strategy would have performed
npm run dashboard     # serves the local monitoring UI on http://localhost:4173
```

Run the agent and dashboard in separate terminals; they communicate only
through the files in `data/`.

## Running (Electron desktop, for development)

```bash
npm run electron     # launches the desktop app (uses electron-main.cjs)
npm run dist          # builds a Windows installer locally (electron-builder --win)
```

The desktop app is a GUI shell around the same `src/` engine: it stores
settings in Electron's userData folder, spawns `electron-run.js` as a child
process with those settings as environment variables, and embeds the
dashboard in an iframe once the process is running.

## Running (Android, for development)

```bash
cd trading-agent/android-app
npm install
npx react-native run-android   # requires an Android SDK + emulator/device
```

The Android app has no CLI/env-var configuration — all settings are entered
in-app and stored in `AsyncStorage`. There is no separate "dashboard"; the
single screen shows both settings and live status.

## Going live (optional, at your own risk)

1. Run `npm run backtest` and `TRADING_MODE=testnet npm start` (or the
   equivalent Testnet mode in the desktop/Android app) first. Watch for at
   least several completed trades before considering live mode.
2. Switch to live mode, add real API credentials, and enter the exact
   confirmation phrase (`I_UNDERSTAND_THE_RISK`) the app asks for — this is
   enforced in code, not just the UI, so it can't be skipped by accident.
3. Start with a small amount of real capital and conservative
   risk-per-trade/daily-loss settings.

### Known limitations to address before trusting this with real capital

- **Exchange filters**: order quantities are rounded to a fixed precision
  and do not query Binance's `exchangeInfo` `LOT_SIZE`/`MIN_NOTIONAL`
  filters per symbol, in either the CLI/desktop or Android version. Verify
  your symbol's filters or extend `binanceClient.js` to fetch and apply
  them, or orders may be rejected or sized incorrectly.
- **Fees and slippage** are not modeled in the backtester or paper
  simulation; live results will be worse than paper/backtest results by at
  least the exchange's taker fee plus any slippage.
- **Single-strategy, single-symbol**: the example SMA crossover strategy is
  a starting point, not a validated trading edge. Back-test and paper-trade
  any changes before going live.
- **Backtester models at most one open position at a time**, regardless of
  `MAX_OPEN_POSITIONS`.
- **No monitoring/alerting** beyond the local dashboard or the Android log
  screen; if the process (or app) is killed while a position is open,
  nothing manages that position until it's restarted.
- **Android background reliability is not guaranteed.** The app uses a
  foreground service (`react-native-background-actions`) so it can keep
  running while backgrounded, but Android can still kill the process under
  aggressive battery optimization, after a forced app close, or on reboot —
  none of which resume the agent automatically. A phone is a materially
  less reliable place to run a 24/7 trading engine than a server or desktop
  that stays powered on; this was built per an explicit choice to run the
  full engine on-device instead of a remote-monitor-only app, but that
  reliability trade-off is real. Disabling battery optimization for the app
  reduces, but does not eliminate, the risk.
- **The Android APK is debug-signed**, not signed with a real release key.
  Fine for installing on your own device; not suitable for Play Store
  distribution or for proving provenance to other people. Add a real
  signing config (keystore + `android/gradle.properties` /
  `android/app/build.gradle` `signingConfigs.release`) before distributing
  more broadly.
- **CI build unverified**: `.github/workflows/trading-agent-release.yml` was
  written to mirror the existing Dozenten Dashboard release workflow, but
  has not actually been run — the Windows and Android SDK toolchains aren't
  available in the sandbox this was developed in. Run it once (via
  `workflow_dispatch` or a `trading-v*` tag) and check both jobs succeed
  before relying on it.
