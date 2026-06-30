/* yahooQuote.ts — shared, cached single-price fetcher for Yahoo Finance.
 *
 * Several routers (marginAnalysis, crisisScenarios, marginCalculator, …)
 * independently fetch the same symbols (BZ=F, CL=F, BDRY, ZIM, …) on every
 * request. This module deduplicates those calls with a short in-memory cache
 * plus per-symbol singleflight, so concurrent/overlapping callers share one
 * upstream request instead of each hitting Yahoo (and its ~2k/day rate limit).
 *
 * Returns the latest regularMarketPrice for a symbol, or null on failure.
 * Null results are cached too (briefly) so an outage doesn't trigger a storm.
 */

interface QuoteEntry {
  price: number | null;
  fetchedAt: number;
}

const cache = new Map<string, QuoteEntry>();
const inflight = new Map<string, Promise<number | null>>();
const QUOTE_TTL_MS = 60_000; // 60 seconds

/** Exposed for unit tests — clears the shared quote cache. */
export function _resetYahooQuoteCache() {
  cache.clear();
  inflight.clear();
}

async function fetchFreshPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart: { result: Array<{ meta: { regularMarketPrice: number } }> | null };
    };
    return json.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the latest price for `symbol`, served from a 60s shared cache and
 * coalescing concurrent callers onto a single upstream request.
 */
export async function getQuotePrice(symbol: string): Promise<number | null> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < QUOTE_TTL_MS) {
    return cached.price;
  }

  const existing = inflight.get(symbol);
  if (existing) return existing;

  const p = fetchFreshPrice(symbol).then(price => {
    cache.set(symbol, { price, fetchedAt: Date.now() });
    return price;
  });
  inflight.set(symbol, p);
  void p.finally(() => {
    if (inflight.get(symbol) === p) inflight.delete(symbol);
  });
  return p;
}

/** Convenience wrapper returning `fallback` instead of null. */
export async function getQuotePriceOr(
  symbol: string,
  fallback: number
): Promise<number> {
  return (await getQuotePrice(symbol)) ?? fallback;
}
