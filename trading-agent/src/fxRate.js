import { config } from './config.js';

const FX_URL = 'https://api.frankfurter.app/latest?from=USD&to=EUR';

let cache = { rate: null, asOf: null, fetchedAt: 0, error: null };

/**
 * Returns the current USD->EUR rate from frankfurter.app (free, keyless,
 * ECB reference rates — published once per ECB business day, not
 * sub-second, but a real published rate rather than a made-up number).
 * Cached for config.fx.refreshSeconds; a fetch failure keeps serving the
 * last good value (with `error` set) instead of throwing.
 */
export async function getUsdEurRate() {
  const ageSeconds = (Date.now() - cache.fetchedAt) / 1000;
  if (cache.rate !== null && ageSeconds < config.fx.refreshSeconds) {
    return cache;
  }

  try {
    const res = await fetch(FX_URL);
    if (!res.ok) throw new Error(`FX API error (${res.status})`);
    const body = await res.json();
    const rate = body?.rates?.EUR;
    if (typeof rate !== 'number') throw new Error('Unexpected FX API response shape');
    cache = { rate, asOf: body.date, fetchedAt: Date.now(), error: null };
  } catch (err) {
    cache = { ...cache, error: err.message, fetchedAt: Date.now() };
  }

  return cache;
}
