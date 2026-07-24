# Trading Agent (Binance)

An autonomous crypto trading agent for Binance: pluggable strategy engine, hard
risk limits, backtesting, paper trading, and a local monitoring dashboard.

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
- **A live mode** that only activates if you explicitly set both
  `TRADING_MODE=live` and a literal confirmation phrase in `.env` — this is
  intentionally hard to trigger by accident.

If you go live, you are trading with real money and are solely responsible
for the outcome. Start with paper trading, then testnet, and only move to
live mode once you understand and accept how the strategy behaves.

## Architecture

```
src/
  config.js         loads & validates .env, gates live mode behind LIVE_CONFIRM
  binanceClient.js   signed REST calls + kline WebSocket stream (testnet or live endpoints)
  riskManager.js     position sizing, stop-loss/take-profit, daily loss kill-switch
  strategy/          pluggable strategy interface + example SMA crossover strategy
  portfolio.js       balance, open positions, trade history (persisted to data/)
  agent.js           wires everything into a running loop (index.js is the entrypoint)
  backtester.js      replays historical candles through strategy + risk manager
  backtestRunner.js  CLI: fetches history and prints a backtest report
  dashboard/         local Express server + static page showing live status
```

State model: `Portfolio` mutates in memory, then persists the full state to
`data/state.json` and appends closed trades to `data/trades.log` (JSON
lines). The dashboard reads those files directly — there's no shared process
or socket between the agent and dashboard.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- For **paper mode** (default), you can leave `BINANCE_API_KEY`/`SECRET`
  blank — historical candles and the live price stream are public endpoints.
- For **testnet mode**, generate free keys at
  https://testnet.binance.vision (login with GitHub, no real funds involved).
- For **live mode**, generate keys at
  https://www.binance.com/en/my/settings/api-management. Restrict the key to
  spot trading only, and do not enable withdrawals on that key.

## Running

```bash
npm start          # runs the agent (mode from TRADING_MODE in .env)
npm run backtest    # fetches recent history and reports how the strategy would have performed
npm run dashboard    # serves the local monitoring UI on http://localhost:4173
```

Run the agent and dashboard in separate terminals; they communicate only
through the files in `data/`.

## Going live (optional, at your own risk)

1. Run `npm run backtest` and `TRADING_MODE=testnet npm start` first. Watch
   the dashboard for at least several completed trades before considering
   live mode.
2. In `.env`, set `TRADING_MODE=live`, add real API credentials, and set
   `LIVE_CONFIRM=I_UNDERSTAND_THE_RISK` (the app refuses to start in live
   mode without this exact phrase).
3. Start with a small `PAPER_STARTING_BALANCE`-equivalent amount of real
   capital and conservative `RISK_PER_TRADE_PCT`/`MAX_DAILY_LOSS_PCT` values.

### Known limitations to address before trusting this with real capital

- **Exchange filters**: order quantities are rounded to a fixed precision
  and do not query Binance's `exchangeInfo` `LOT_SIZE`/`MIN_NOTIONAL`
  filters per symbol. Verify your symbol's filters or extend
  `binanceClient.js` to fetch and apply them, or live orders may be
  rejected or sized incorrectly.
- **Fees and slippage** are not modeled in the backtester or paper
  simulation; live results will be worse than paper/backtest results by at
  least the exchange's taker fee plus any slippage.
- **Single-strategy, single-symbol**: the example SMA crossover strategy is
  a starting point, not a validated trading edge. Back-test and paper-trade
  any changes before going live.
- **Backtester models at most one open position at a time**, regardless of
  `MAX_OPEN_POSITIONS`.
- No monitoring/alerting beyond the local dashboard; if the process crashes
  while a position is open, nothing will manage that position until you
  restart it.
