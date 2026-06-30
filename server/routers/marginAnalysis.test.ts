/**
 * marginAnalysis.test.ts
 * Tests for the marginAnalysis tRPC router.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { _resetMarginAnalysisCache } from "./marginAnalysis";
import { _resetYahooQuoteCache } from "../_core/yahooQuote";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makePriceResponse(price: number) {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol: "TEST",
            regularMarketPrice: price,
            chartPreviousClose: price * 0.98,
            regularMarketDayHigh: price * 1.01,
            regularMarketDayLow: price * 0.99,
          },
          timestamp: [Date.now() / 1000],
          indicators: {
            quote: [
              {
                open: [price],
                close: [price],
                high: [price * 1.01],
                low: [price * 0.99],
                volume: [1000],
              },
            ],
          },
        },
      ],
      error: null,
    },
  };
}

function mockFetchWithPrices(
  brent: number,
  wti: number,
  bdry: number,
  zim: number
) {
  const responses = [brent, wti, bdry, zim].map(makePriceResponse);
  let idx = 0;
  return vi.fn().mockImplementation(() => {
    const body = responses[idx] ?? responses[responses.length - 1];
    idx++;
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

// ─── tests ────────────────────────────────────────────────────────────────────

describe("marginAnalysis.getAnalysis", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    _resetMarginAnalysisCache();
    _resetYahooQuoteCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns a valid analysis result with all required fields", async () => {
    globalThis.fetch = mockFetchWithPrices(88.5, 84.2, 14.5, 30.0);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.marginAnalysis.getAnalysis();

    expect(result).toBeDefined();
    expect(result.kpis).toBeDefined();
    expect(result.waterfall).toBeDefined();
    expect(result.categories).toBeDefined();
    expect(result.skus).toBeDefined();
    expect(result.lastUpdated).toBeDefined();
  });

  it("returns KPIs with numeric values in valid ranges", async () => {
    globalThis.fetch = mockFetchWithPrices(88.5, 84.2, 14.5, 30.0);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.marginAnalysis.getAnalysis();
    const { kpis } = result;

    expect(typeof kpis.avgPortfolioMargin).toBe("number");
    expect(kpis.avgPortfolioMargin).toBeGreaterThan(0);
    expect(kpis.avgPortfolioMargin).toBeLessThan(60);

    expect(typeof kpis.oilPriceImpact).toBe("number");
    expect(typeof kpis.criticalSkus).toBe("number");
    expect(kpis.criticalSkus).toBeGreaterThanOrEqual(0);

    expect(typeof kpis.marginAtRisk).toBe("number");
    expect(kpis.marginAtRisk).toBeGreaterThanOrEqual(0);

    expect(kpis.brentPrice).toBe(88.5);
    expect(kpis.wtiPrice).toBe(84.2);
  });

  it("returns a waterfall with 8 items (base + 6 costs + current)", async () => {
    globalThis.fetch = mockFetchWithPrices(88.5, 84.2, 14.5, 30.0);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.marginAnalysis.getAnalysis();

    expect(result.waterfall).toHaveLength(8);
    expect(result.waterfall[0].isBase).toBe(true);
    expect(result.waterfall[result.waterfall.length - 1].isCurrent).toBe(true);
  });

  it("returns 8 categories with valid risk levels", async () => {
    globalThis.fetch = mockFetchWithPrices(88.5, 84.2, 14.5, 30.0);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.marginAnalysis.getAnalysis();

    expect(result.categories).toHaveLength(8);
    for (const cat of result.categories) {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.baseMargin).toBeGreaterThan(0);
      expect(cat.currentMargin).toBeGreaterThan(0);
      expect(["critical", "warning", "safe"]).toContain(cat.risk);
    }
  });

  it("returns 13 SKUs with landed cost > COGS", async () => {
    globalThis.fetch = mockFetchWithPrices(88.5, 84.2, 14.5, 30.0);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.marginAnalysis.getAnalysis();

    expect(result.skus).toHaveLength(13);
    for (const sku of result.skus) {
      expect(sku.cogs).toBeGreaterThan(0);
      expect(sku.landedCost).toBeGreaterThan(sku.cogs);
      expect(sku.margin).toBeGreaterThanOrEqual(0);
      expect(sku.margin).toBeLessThan(100);
      expect(["critical", "warning", "safe"]).toContain(sku.risk);
    }
  });

  it("uses cache on second call (same lastUpdated)", async () => {
    globalThis.fetch = mockFetchWithPrices(88.5, 84.2, 14.5, 30.0);
    const caller = appRouter.createCaller(createPublicContext());
    const first = await caller.marginAnalysis.getAnalysis();
    const second = await caller.marginAnalysis.getAnalysis();
    expect(second.lastUpdated).toBe(first.lastUpdated);
  });

  it("falls back gracefully when Yahoo Finance is unavailable", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) } as Response);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.marginAnalysis.getAnalysis();

    // Should still return valid data using fallback prices
    expect(result.kpis.brentPrice).toBeGreaterThan(0);
    expect(result.skus.length).toBe(13);
    expect(result.categories.length).toBe(8);
  });
});
