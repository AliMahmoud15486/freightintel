/* marketData.test.ts — Margin Sentinel
 * Tests for the marketData tRPC router
 * Mocks global fetch (used by fetchQuote) to avoid real network calls in CI
 *
 * Response shape (current):
 *   pulseBar    → { tickers: TickerItem[], usPortCongestion: {...}, lastUpdated }
 *   oilHistory  → { data: { month, oilCost, freightCost }[], lastUpdated }
 *   currentPrices → { wtiPrice, brentPrice, freightMultiplier, lastUpdated }
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { _resetCacheForTesting } from "./marketData";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeYahooResponse(price: number, prevClose: number, closes: number[]) {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol: "TEST",
            regularMarketPrice: price,
            chartPreviousClose: prevClose,
            regularMarketDayHigh: price + 1,
            regularMarketDayLow: price - 1,
          },
          timestamp: closes.map((_, i) => 1700000000 + i * 86400),
          indicators: {
            quote: [
              {
                open: closes,
                close: closes,
                high: closes,
                low: closes,
                volume: closes.map(() => 1000),
              },
            ],
          },
        },
      ],
      error: null,
    },
  };
}

function makeFailedResponse() {
  return { chart: { result: null, error: "Not found" } };
}

/** Create a mock fetch that returns the given responses in order */
function mockFetchSequence(responses: object[]) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const body = responses[callIndex] ?? makeFailedResponse();
    callIndex++;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(body),
    } as Response);
  });
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── pulseBar tests ───────────────────────────────────────────────────────────

describe("marketData.pulseBar", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    _resetCacheForTesting();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns live Brent and WTI prices from Yahoo Finance", async () => {
    const brent = makeYahooResponse(83.5, 81.0, [79.0, 81.0, 83.5]);
    const wti   = makeYahooResponse(76.2, 74.0, [72.0, 74.0, 76.2]);
    const other = makeYahooResponse(10.0,  9.5, [ 9.0,  9.5, 10.0]);
    // 9 symbols: BZ=F, CL=F, NG=F, GC=F, BDRY, ZIM, MAERSK-B.CO, CHRW, XLE
    globalThis.fetch = mockFetchSequence([brent, wti, other, other, other, other, other, other, other]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.pulseBar();

    const brentTicker = result.tickers.find((t) => t.symbol === "BZ=F");
    const wtiTicker   = result.tickers.find((t) => t.symbol === "CL=F");

    expect(brentTicker).toBeDefined();
    expect(wtiTicker).toBeDefined();
    expect(brentTicker!.price).toBe(83.5);
    expect(wtiTicker!.price).toBe(76.2);
    expect(brentTicker!.label).toBe("BRENT CRUDE");
    expect(wtiTicker!.label).toBe("WTI CRUDE");
    expect(result.usPortCongestion.status).toBeDefined();
    expect(result.lastUpdated).toBeDefined();
  });

  it("uses daily change from second-to-last close (not chartPreviousClose)", async () => {
    // chartPreviousClose = 60 (week ago), but second-to-last close = 80 → change = +3.75%
    const brent = makeYahooResponse(83.0, 60.0, [60.0, 70.0, 80.0, 83.0]);
    const wti   = makeYahooResponse(76.0, 55.0, [55.0, 65.0, 73.0, 76.0]);
    const other = makeYahooResponse(10.0,  9.0, [ 8.0,  9.0, 10.0]);
    globalThis.fetch = mockFetchSequence([brent, wti, other, other, other, other, other, other, other]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.pulseBar();

    const brentTicker = result.tickers.find((t) => t.symbol === "BZ=F")!;
    // 83 - 80 = 3, 3/80 = 3.75%
    expect(brentTicker.changePct).toBeCloseTo(3.75, 1);
    expect(brentTicker.change).toBeCloseTo(3.0, 1);
  });

  it("falls back to static data when all API calls fail", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.pulseBar();

    expect(result.tickers.length).toBeGreaterThan(0);
    const brent = result.tickers.find((t) => t.label === "BRENT CRUDE");
    const wti   = result.tickers.find((t) => t.label === "WTI CRUDE");
    expect(brent!.price).toBe(84.5);
    expect(wti!.price).toBe(80.25);
  });

  it("returns all 9 tickers with required fields", async () => {
    const resp = makeYahooResponse(10.0, 9.5, [9.0, 9.5, 10.0]);
    globalThis.fetch = mockFetchSequence(Array(9).fill(resp));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.pulseBar();

    expect(result.tickers.length).toBe(9);
    result.tickers.forEach((t) => {
      expect(t).toHaveProperty("label");
      expect(t).toHaveProperty("symbol");
      expect(t).toHaveProperty("price");
      expect(t).toHaveProperty("change");
      expect(t).toHaveProperty("changePct");
      expect(t).toHaveProperty("unit");
      expect(t).toHaveProperty("category");
    });
  });
});

// ─── oilHistory tests ─────────────────────────────────────────────────────────

describe("marketData.oilHistory", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    _resetCacheForTesting();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns merged WTI and Brent history data points", async () => {
    const wtiHistory   = makeYahooResponse(76.0, 65.0, [65.0, 68.0, 72.0, 76.0]);
    const brentHistory = makeYahooResponse(83.0, 70.0, [70.0, 73.0, 78.0, 83.0]);
    globalThis.fetch = mockFetchSequence([wtiHistory, brentHistory]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.oilHistory({ months: 6 });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]).toHaveProperty("month");
    expect(result.data[0]).toHaveProperty("oilCost");
    expect(result.data[0]).toHaveProperty("freightCost");
    expect(result.lastUpdated).toBeDefined();
  });

  it("generates fallback data when both APIs fail", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("API down"));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.oilHistory({ months: 6 });

    expect(result.data.length).toBe(6);
    result.data.forEach((point) => {
      expect(point.oilCost).toBeGreaterThan(0);
      expect(point.freightCost).toBeGreaterThan(0);
    });
  });
});

// ─── currentPrices tests ──────────────────────────────────────────────────────

describe("marketData.currentPrices", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    _resetCacheForTesting();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns current WTI and Brent prices", async () => {
    const wtiResp   = makeYahooResponse(76.5, 73.0, [73.0, 76.5]);
    const brentResp = makeYahooResponse(83.8, 80.0, [80.0, 83.8]);
    globalThis.fetch = mockFetchSequence([wtiResp, brentResp]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.currentPrices();

    expect(result.wtiPrice).toBe(76.5);
    expect(result.brentPrice).toBe(83.8);
    expect(result.freightMultiplier).toBe(1.18);
  });

  it("returns fallback prices when API fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.currentPrices();

    expect(result.wtiPrice).toBeGreaterThan(0);
    expect(result.brentPrice).toBeGreaterThan(0);
    expect(result.freightMultiplier).toBeGreaterThan(0);
  });
});
