import CryptoJS from 'crypto-js';

const PUBLIC_REST_BASE = 'https://api.binance.com';
const WS_BASE = 'wss://stream.binance.com:9443/ws';

function signedRestBase(tradingMode) {
  return tradingMode === 'live' ? 'https://api.binance.com' : 'https://testnet.binance.vision';
}

function sign(queryString, apiSecret) {
  return CryptoJS.HmacSHA256(queryString, apiSecret).toString(CryptoJS.enc.Hex);
}

function toQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function request(settings, method, path, params = {}, { signed = false } = {}) {
  const query = { ...params };
  if (signed) {
    query.timestamp = Date.now();
    query.recvWindow = 5000;
  }
  let queryString = toQueryString(query);
  if (signed) {
    queryString += `&signature=${sign(queryString, settings.binanceApiSecret)}`;
  }
  const baseUrl = signed ? signedRestBase(settings.tradingMode) : PUBLIC_REST_BASE;
  const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;

  const headers = {};
  if (signed || settings.binanceApiKey) {
    headers['X-MBX-APIKEY'] = settings.binanceApiKey;
  }

  const res = await fetch(url, { method, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body && body.msg ? body.msg : res.statusText;
    throw new Error(`Binance API error (${res.status}) on ${path}: ${msg}`);
  }
  return body;
}

/** Public, unsigned: historical candles from real production Binance (all modes). */
export async function getKlines(settings, symbol, interval, limit = 500) {
  const rows = await request(settings, 'GET', '/api/v3/klines', { symbol, interval, limit });
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

/** Signed: account balances. Requires API credentials (testnet or live). */
export async function getAccount(settings) {
  return request(settings, 'GET', '/api/v3/account', {}, { signed: true });
}

/**
 * Signed: place a real order. Only ever called when tradingMode is
 * 'testnet' or 'live' — paper mode simulates fills locally and never calls this.
 */
export async function placeOrder(settings, { symbol, side, type = 'MARKET', quantity, price, timeInForce }) {
  const params = { symbol, side, type, quantity };
  if (type === 'LIMIT') {
    params.price = price;
    params.timeInForce = timeInForce || 'GTC';
  }
  return request(settings, 'POST', '/api/v3/order', params, { signed: true });
}

/**
 * Signed: withdraw crypto to an address you control. Production Binance only;
 * callers must gate this to live mode themselves (see withdrawal.js).
 */
export async function withdraw(settings, { coin, address, amount }) {
  return request(settings, 'POST', '/sapi/v1/capital/withdraw/apply', { coin, address, amount }, { signed: true });
}

/**
 * Subscribes to the live production kline stream and invokes onCandle(candle, isFinal)
 * for every update. Returns an unsubscribe function.
 */
export function subscribeKlines(symbol, interval, onCandle, onError) {
  const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
  const ws = new WebSocket(`${WS_BASE}/${streamName}`);

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
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
  };

  ws.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => ws.close();
}
