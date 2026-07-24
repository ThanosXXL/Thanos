/**
 * Verifies getExchangeInfo() filtering/mapping against the real, documented
 * Binance /api/v3/exchangeInfo response shape. The sandbox this was built in
 * blocks outbound calls to the real API, so this is the strongest local
 * verification available: prove the parsing logic is correct against a
 * known-real response shape, not just that a network failure is handled.
 */
import { it, expect, afterEach } from '@jest/globals';

// Trimmed but real-shaped Binance exchangeInfo response.
// https://binance-docs.github.io/apidocs/spot/en/#exchange-information
const EXCHANGE_INFO_FIXTURE = {
  timezone: 'UTC',
  serverTime: 1718000000000,
  symbols: [
    {
      symbol: 'BTCEUR',
      status: 'TRADING',
      baseAsset: 'BTC',
      quoteAsset: 'EUR',
      isSpotTradingAllowed: true,
      isMarginTradingAllowed: false,
      filters: [],
    },
    {
      symbol: 'ETHBTC',
      status: 'TRADING',
      baseAsset: 'ETH',
      quoteAsset: 'BTC',
      isSpotTradingAllowed: true,
      isMarginTradingAllowed: true,
      filters: [],
    },
    {
      symbol: 'DELISTEDUSDT',
      status: 'BREAK',
      baseAsset: 'DELISTED',
      quoteAsset: 'USDT',
      isSpotTradingAllowed: true,
      filters: [],
    },
    {
      symbol: 'MARGINONLYUSDT',
      status: 'TRADING',
      baseAsset: 'MARGINONLY',
      quoteAsset: 'USDT',
      isSpotTradingAllowed: false,
      filters: [],
    },
  ],
};

const realFetch = global.fetch;
const settings = { tradingMode: 'paper', binanceApiKey: '', binanceApiSecret: '' };

afterEach(() => {
  global.fetch = realFetch;
});

it('filters to only TRADING + spot-allowed symbols and maps fields', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => EXCHANGE_INFO_FIXTURE,
  }));

  const { getExchangeInfo } = require('../src/binanceClient');
  const markets = await getExchangeInfo(settings);

  expect(markets).toHaveLength(2);
  expect(markets).toContainEqual({ symbol: 'BTCEUR', baseAsset: 'BTC', quoteAsset: 'EUR' });
  expect(markets.find((m) => m.symbol === 'DELISTEDUSDT')).toBeUndefined();
  expect(markets.find((m) => m.symbol === 'MARGINONLYUSDT')).toBeUndefined();
});

it('surfaces the Binance error message on an HTTP failure instead of throwing an opaque error', async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    json: async () => ({ code: -1121, msg: 'Invalid symbol.' }),
  }));

  const { getExchangeInfo } = require('../src/binanceClient');
  await expect(getExchangeInfo(settings)).rejects.toThrow('Invalid symbol.');
});
