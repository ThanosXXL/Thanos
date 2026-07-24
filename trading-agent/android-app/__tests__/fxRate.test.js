/**
 * Verifies fxRate.js parsing/caching/error-handling against the real,
 * documented frankfurter.app response shape. The sandbox this was built in
 * blocks outbound calls to the real API, so this is the strongest local
 * verification available: prove the parsing logic is correct against a
 * known-real response shape, not just that a network failure is handled.
 */
import { it, expect, afterEach } from '@jest/globals';

const FRANKFURTER_FIXTURE = {
  amount: 1.0,
  base: 'USD',
  date: '2024-06-14',
  rates: { EUR: 0.9312 },
};

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  jest.resetModules();
});

it('parses a real-shaped frankfurter.app response correctly', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => FRANKFURTER_FIXTURE,
  }));

  const { getUsdEurRate } = require('../src/fxRate');
  const result = await getUsdEurRate();

  expect(result.rate).toBe(0.9312);
  expect(result.asOf).toBe('2024-06-14');
  expect(result.error).toBeNull();
});

it('serves from cache without a second fetch call', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => FRANKFURTER_FIXTURE,
  }));

  const { getUsdEurRate } = require('../src/fxRate');
  await getUsdEurRate();
  await getUsdEurRate();

  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it('reports an error instead of throwing on a malformed response', async () => {
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ amount: 1, base: 'USD', date: '2024-06-15', rates: {} }),
  }));

  const { getUsdEurRate } = require('../src/fxRate');
  const result = await getUsdEurRate();

  expect(result.rate).toBeNull();
  expect(result.error).toContain('Unexpected FX API response shape');
});

it('reports an error instead of throwing on an HTTP failure', async () => {
  global.fetch = jest.fn(async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
  }));

  const { getUsdEurRate } = require('../src/fxRate');
  const result = await getUsdEurRate();

  expect(result.rate).toBeNull();
  expect(result.error).toContain('FX API error (500)');
});
