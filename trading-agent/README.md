# FreshTrades (Binance Trading Agent)

An autonomous crypto trading agent for Binance: pluggable strategy engine, hard
risk limits, backtesting, paper trading, and a local monitoring dashboard —
available as a CLI, a Windows desktop app ("FreshTrades Desktop"), and an
Android app ("FreshTrades").

[![Download for Windows](https://img.shields.io/badge/Download-Windows-0078D6?style=for-the-badge&logo=windowsterminal&logoColor=white)](https://github.com/ThanosXXL/Thanos/releases/latest/download/FreshTrades-Setup.exe)
[![Download for Android](https://img.shields.io/badge/Download-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/ThanosXXL/Thanos/releases/latest/download/FreshTrades.apk)

[![Download Demo for Windows](https://img.shields.io/badge/Demo-Windows-0078D6?style=for-the-badge&logo=windowsterminal&logoColor=white)](https://github.com/ThanosXXL/Thanos/releases/latest/download/FreshTrades-Demo-Setup.exe)
[![Download Demo for Android](https://img.shields.io/badge/Demo-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/ThanosXXL/Thanos/releases/latest/download/FreshTrades-Demo.apk)

These links always point at the newest published release (via GitHub's
`/releases/latest/download/` alias) — no need to hunt for a version number.
They only work once at least one release has actually been published (see
**Downloads** below for how that happens and what "one click" does and
doesn't mean here). The **Demo** builds are the safest way to try the app —
see **Demo mode** below for exactly what they lock down.

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

## Deposits, withdrawals, and payments — scope

This project is a personal trading tool for your own Binance account. It
deliberately does **not**, and will not, include:

- Collecting deposits from anyone via PayPal, credit card, direct debit, or
  bank transfer. Fund your own Binance account through Binance's own
  deposit flow (it already supports card/SEPA/etc.) — this app has no
  payment-collection code and never will, because accepting deposits from
  other people is a regulated activity (payment services/deposit-taking)
  that requires a license this project doesn't have and isn't trying to get.
- Initiating real bank transfers (SEPA, "Echtzeitüberweisung", or
  otherwise) itself. Withdraw fiat to your own verified bank account
  directly through Binance's own app/website — that's Binance acting as
  your licensed exchange, not something this project reimplements or fakes.

What it does include, for managing your own funds:

- **Euro as the reference currency for balances.** The default trading pair
  is `BTCEUR` (a real Binance EUR-quoted spot pair), so your account
  balance, `PAPER_STARTING_BALANCE`, and `MIN_LIVE_BALANCE` are genuinely in
  EUR, not a USDT stand-in — this is what "Einzahlung ... immer Euro" means
  in practice: deposit EUR into your Binance account (via Binance's own
  deposit flow) and the app tracks and gates on that EUR balance directly.
- A **minimum-balance gate** (`MIN_LIVE_BALANCE`, default 50, in EUR given
  the default pair above) that blocks live mode from starting until your
  account holds at least that much — a safety floor, not a deposit mechanism.
- A **manual, on-demand CRYPTO withdrawal** (e.g. USDT, BTC — a real coin
  with a blockchain address) to an address you control, using Binance's own
  documented withdrawal API, gated behind a typed confirmation phrase (like
  live mode itself). Never automatic, never daily by itself — you trigger
  it, once, for an amount you choose, each time. **This is not a Euro
  withdrawal**: EUR has no blockchain address, so it can't be paid out this
  way — the app refuses `WITHDRAWAL_ASSET=EUR` outright with an error
  pointing you to Binance's own SEPA withdrawal screen for that.
- An **email sent to yourself** after each withdrawal (CLI/desktop: via your
  own SMTP account; Android: via your phone's own mail app, so no email
  credentials are stored on the device) with a record for your own
  bookkeeping. This is not a compliance or KYC process — it's a receipt.
- A **maximum tradable capital** (`MAX_TRADABLE_CAPITAL`, default 5000, in
  EUR) that caps how much of your balance the position-sizing calculation
  will ever use — a personal risk ceiling, not a deposit limit or a payment
  processing feature. If your balance is higher, the excess simply isn't
  risked; nothing stops you from holding more than this on Binance.

## Dashboard features

- **No raw script/log output by default.** The Electron desktop app and
  Android app both hide the technical stdout/stderr trail behind a
  collapsed "Technische Details" toggle — the default view is only the
  structured cards/tables (status, balance, today's trades, positions,
  markets, withdrawal history) plus a plain-language one-line status
  ("Läuft", "Gestoppt", "Start fehlgeschlagen: ..."). The technical log is
  still there and still gets every event (including errors) — it's just
  not shown unless you open it, so a fresh install feels like a normal app
  rather than a developer console.
- **Live USD→EUR rate**: fetched from
  [frankfurter.app](https://www.frankfurter.app/) (free, keyless, ECB
  reference rates). This is a real, currently-published rate, refreshed
  periodically — not sub-second forex tick data (ECB publishes once per
  business day), and not a made-up number.
- **All Binance markets, browsable**: a searchable list of every real,
  currently tradable Binance spot pair (via the public `exchangeInfo`
  endpoint), so you can look up a symbol before typing it into the
  settings. This is Binance's own crypto market list — **no stock markets,
  no countries, no sector/theme categories**: those don't exist on a crypto
  exchange, and adding them for real would mean an entirely separate broker
  integration (see the "no guarantees" note above about staying
  Binance/crypto-only).
- **Crypto withdrawal history with a time-range filter** (last 5 days / 30
  days / 3 months) — reads the same `data/withdrawals.log` /
  `AsyncStorage` history already used for the email receipts.
- **Today's trades**: closed trades filtered to the current calendar day,
  with a running total of today's win count and P&L, alongside the
  all-time balance/P&L cards.

## Downloads

Windows and Android builds are produced by CI, not by hand — nothing is
uploaded from a developer machine. Once at least one release has been
published, the four buttons at the top of this file are genuinely one
click: they point at fixed, version-independent filenames
(`FreshTrades-Setup.exe`, `FreshTrades.apk`, `FreshTrades-Demo-Setup.exe`,
`FreshTrades-Demo.apk`) via GitHub's `/releases/latest/download/` alias, so
they always resolve to the newest build without anyone having to look up a
version number.

Getting that first (and every subsequent) release published still takes one
of these two triggers — this project doesn't auto-publish on every commit,
deliberately, since a release is a public, real thing other people can
download:

1. Push a tag matching `freshtrades-v*` (e.g. `freshtrades-v0.1.0`) to this
   repository, or run **Actions → Build & Release FreshTrades (Windows +
   Android) → Run workflow** manually.
2. The workflow builds the full Windows installer, the full Android APK,
   and their demo counterparts, and attaches all four to a GitHub Release
   for that tag — all four download buttons above then work immediately,
   no further action needed.

The Android APKs are **debug-signed** (see limitations below) — Android
will warn about an unverified app; that's expected for a sideloaded build
that hasn't gone through Play Store review, not a sign of tampering, as
long as you got it from this repository's GitHub Releases page.

**This session could not build or run any of the Windows or Android
outputs** — the sandbox this was developed in has no Windows machine and no
Android SDK/emulator, and downloading the Android SDK components is
blocked by the sandbox's network policy. What was verified locally instead:
the Electron app boots cleanly under Xvfb in both normal and demo mode with
no wiring errors, the RN project's TypeScript compiles with no errors, and
its Jest test suite (including the demo-mode render path) passes. The
actual `.exe`/`.apk` builds should be treated as unverified until someone
runs the CI workflow (or builds locally) and confirms the outputs install
and run.

## Demo mode

The demo builds (`FreshTrades-Demo-Setup.exe`, `FreshTrades-Demo.apk`) are
the same app with three things removed at build time, not just hidden
behind a setting a user could flip:

- **Trading mode is locked to paper.** The mode selector isn't shown, and
  even if a saved settings file somehow held something else, the app
  overwrites it back to `paper` on every load and before every start — see
  `DEMO_MODE` in `electron-main.cjs` and `IS_DEMO` in
  `android-app/src/buildFlavor.js`.
- **No Binance API key fields.** Paper mode never calls a signed endpoint,
  so a demo build has no use for credentials and doesn't ask for them.
- **No withdrawal feature.** The withdrawal button/section isn't shown, and
  the underlying withdrawal call refuses to run at all in a demo build,
  independent of the UI.

A demo build genuinely cannot place a real order, hold real credentials, or
move real funds — safe to hand to someone who just wants to see the app
run. The full builds are unaffected: `demo` defaults to `false` in
`package.json` and `IS_DEMO` defaults to `false` in `buildFlavor.js`; only
the CI steps that explicitly build the demo variant flip either flag.

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
  withdrawal.js          manual crypto withdrawal (Binance API) behind a confirmation phrase
  withdrawCli.js          CLI entrypoint: npm run withdraw -- --amount X --confirm Y
  notifier.js             emails a withdrawal record to yourself via your own SMTP account
  fxRate.js               live USD->EUR rate (frankfurter.app, ECB reference rates), cached

electron-main.cjs        Electron main process: settings storage, spawns electron-run.js;
                         reads `demo` from package.json (see Demo mode above) and enforces
                         paper-only + no withdrawal server-side, not just in the renderer
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
  src/withdrawal.js      manual crypto withdrawal (Binance API), AsyncStorage-logged
  src/fxRate.js          live USD->EUR rate (frankfurter.app), cached in memory
  src/buildFlavor.js     IS_DEMO constant (see Demo mode above); CI swaps it to `true`
                         via a source-file overwrite before building the demo APK
  App.tsx                settings + dashboard UI in one screen, polls AsyncStorage;
                         withdrawal emails go through the device's own mail app (mailto)
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
npm run dist:demo      # builds the demo variant locally (see Demo mode above)
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
   risk-per-trade/daily-loss settings. Live mode won't start below
   `MIN_LIVE_BALANCE` (default 50, quote-asset units) — fund your Binance
   account directly through Binance first.
4. To withdraw crypto to an address you control: set `WITHDRAWAL_ASSET` and
   `WITHDRAWAL_ADDRESS` in `.env` (CLI/desktop) or in-app (Android), then
   trigger it with `npm run withdraw -- --amount <x> --confirm
   I_CONFIRM_THIS_WITHDRAWAL`, the desktop app's "Auszahlen" button, or the
   Android app's withdrawal panel. Optionally set `SMTP_HOST`/`NOTIFY_EMAIL`
   (CLI/desktop) or just `notifyEmail` (Android) to get a record emailed to
   yourself afterwards.

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
- **The Windows installer is not code-signed** (no code-signing certificate
  for a personal project). Windows SmartScreen or antivirus software may
  flag it, and — more importantly — some antivirus products quarantine the
  installed `.exe` shortly after first launch specifically because the app
  re-spawns its own binary as a plain Node process (`ELECTRON_RUN_AS_NODE`)
  to run the trading agent without bundling a separate Node runtime; that
  self-respawn pattern reads as suspicious to some heuristics. If clicking
  "Starten" fails with a `spawn ... ENOENT` pointing at the app's own
  install path, check your antivirus's quarantine/protection history first
  and add an exclusion for the install folder if needed. The app itself
  now catches this failure gracefully (a status message instead of a
  crash), but can't prevent the antivirus action itself.
- **Withdrawal API is untested against real Binance** in this session (no
  network access to Binance from this sandbox — see the Downloads section).
  `/sapi/v1/capital/withdraw/apply` is Binance's documented endpoint, but
  verify it works for your account/region before relying on it; it is not
  available on Binance's spot testnet, so withdrawal only works in live mode.
- **The withdrawal amount is not itself risk-limited** by `RISK_PER_TRADE_PCT`
  or similar — it's an amount you type, up to whatever Binance's own API
  allows for your account. Double-check the amount before confirming; it
  moves real funds off the exchange irreversibly.
- **Email notification is best-effort.** A missing SMTP config, a wrong
  password, or a network hiccup means no email — but the withdrawal itself
  already happened by that point. Don't rely on the email as your only
  record; check `data/withdrawals.log` (CLI/desktop) or the in-app history
  (Android) too.
- **The FX rate is not sub-second live forex data.** frankfurter.app serves
  ECB reference rates, published once per ECB business day — real and
  current, but not a tick-by-tick feed. It's shown for reference only and is
  not used anywhere in the trading/risk logic itself.
- **The markets browser and FX rate calls could not be exercised against the
  live real APIs in this session** (same sandbox network restriction as the
  Binance calls — see the Downloads section). Two things *were* verified
  here, though: (1) both fail gracefully — clear error, no crash — when the
  network call itself fails, and (2) their parsing/filtering/caching logic
  was checked against fixture payloads shaped exactly like the real,
  documented API responses (frankfurter.app's `/latest` and Binance's
  `/api/v3/exchangeInfo`) — see `android-app/__tests__/fxRate.test.js` and
  `android-app/__tests__/binanceClient.test.js`, which run as part of the
  normal `npm test` suite. What's still unverified is the live network
  round-trip itself (DNS, TLS, actual current API behavior) — check that
  once you have normal internet access.
