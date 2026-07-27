import crypto from 'node:crypto';
import WebSocket from 'ws';
import { config } from './config.js';

function sign(queryString) {
  return crypto.createHmac('sha256', config.binance.apiSecret).update(queryString).digest('hex');
}

function toQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function request(method, path, params = {}, { signed = false } = {}) {
  const query = { ...params };
  if (signed) {
    query.timestamp = Date.now();
    query.recvWindow = 5000;
  }
  let queryString = toQueryString(query);
  if (signed) {
    queryString += `&signature=${sign(queryString)}`;
  }
  const baseUrl = signed ? config.binance.signedRestBaseUrl : config.binance.publicRestBaseUrl;
  const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;

  const headers = {};
  if (signed || config.binance.apiKey) {
    headers['X-MBX-APIKEY'] = config.binance.apiKey;
  }

  const res = await fetch(url, { method, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body && body.msg ? body.msg : res.statusText;
    throw new Error(`Binance API error (${res.status}) on ${path}: ${msg}`);
  }
  return body;
}

/** Public, unsigned: historical candles. Works in every mode, incl. paper. */
export async function getKlines(symbol, interval, limit = 500) {
  const rows = await request('GET', '/api/v3/klines', { symbol, interval, limit });
  return rows.map(([openTime, open, high, low, close, volume, closeTime]) => ({
    openTime,
    closeTime,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  }));
}

/**
 * Public, unsigned: every tradable spot market on production Binance, with its
 * base/quote asset and status. Used to let the user browse/pick a real SYMBOL
 * rather than typing one blind.
 */
export async function getExchangeInfo() {
  const body = await request('GET', '/api/v3/exchangeInfo');
  return body.symbols
    .filter((s) => s.status === 'TRADING' && s.isSpotTradingAllowed)
    .map((s) => ({ symbol: s.symbol, baseAsset: s.baseAsset, quoteAsset: s.quoteAsset }));
}

/**
 * Public, unsigned: current price + 24h change for every symbol in one
 * batch call. Used to show live prices in the markets browser without a
 * per-symbol request.
 */
export async function getTicker24hr() {
  const body = await request('GET', '/api/v3/ticker/24hr');
  return body.map((t) => ({
    symbol: t.symbol,
    lastPrice: Number(t.lastPrice),
    priceChangePercent: Number(t.priceChangePercent),
  }));
}

/**
 * Public, unsigned: best current bid/ask for one symbol — the actual price
 * you'd sell at (bid) or buy at (ask) right now, distinct from lastPrice
 * (the last *executed* trade, which can already be stale by comparison).
 */
export async function getBookTicker(symbol) {
  const t = await request('GET', '/api/v3/ticker/bookTicker', { symbol });
  return { symbol: t.symbol, bidPrice: Number(t.bidPrice), askPrice: Number(t.askPrice) };
}

/** Signed: account balances. Requires API credentials (testnet or live). */
export async function getAccount() {
  return request('GET', '/api/v3/account', {}, { signed: true });
}

/**
 * Signed: place a real order. Only ever called by the agent when
 * config.mode is 'testnet' or 'live' — paper mode simulates fills locally
 * and never calls this.
 */
export async function placeOrder({ symbol, side, type = 'MARKET', quantity, price, timeInForce }) {
  const params = { symbol, side, type, quantity };
  if (type === 'LIMIT') {
    params.price = price;
    params.timeInForce = timeInForce || 'GTC';
  }
  return request('POST', '/api/v3/order', params, { signed: true });
}

/**
 * Signed: withdraw crypto to an address you control. Production Binance only
 * (there is no meaningful withdrawal on spot testnet) — callers must gate this
 * to live mode themselves; see withdrawal.js for the confirmation safeguard.
 */
export async function withdraw({ coin, address, amount, addressTag, network }) {
  return request('POST', '/sapi/v1/capital/withdraw/apply', { coin, address, amount, addressTag, network }, { signed: true });
}

/**
 * Subscribes to the live production kline stream (real market data, all modes) and
 * invokes onCandle(candle, isFinal) for every update. Returns an unsubscribe function.
 */
export function subscribeKlines(symbol, interval, onCandle) {
  const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
  const ws = new WebSocket(`${config.binance.wsBaseUrl}/${streamName}`);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const k = msg.k;
    if (!k) return;
    onCandle(
      {
        openTime: k.t,
        closeTime: k.T,
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
      },
      k.x === true
    );
  });

  ws.on('error', (err) => {
    console.error(`[binance ws] error on ${streamName}:`, err.message);
  });

  return () => ws.close();
}
