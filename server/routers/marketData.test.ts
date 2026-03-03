/* marketData.test.ts — Margin Sentinel
 * Tests for the marketData tRPC router
 * Uses mocked callDataApi to avoid real network calls in CI
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// ─── mock the dataApi module ──────────────────────────────────────────────────

vi.mock("../_core/dataApi", () => ({
  callDataApi: vi.fn(),
}));

import { callDataApi } from "../_core/dataApi";

const mockCallDataApi = vi.mocked(callDataApi);

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeYahooResponse(price: number, prevClose: number, closes: number[]) {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol: "BZ=F",
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

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("marketData.pulseBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns live Brent and WTI prices from Yahoo Finance", async () => {
    const brentResponse = makeYahooResponse(83.5, 70.0, [70.0, 75.0, 80.0, 83.5]);
    const wtiResponse = makeYahooResponse(76.2, 65.0, [65.0, 70.0, 73.0, 76.2]);

    mockCallDataApi
      .mockResolvedValueOnce(brentResponse) // BZ=F
      .mockResolvedValueOnce(wtiResponse)   // CL=F
      .mockResolvedValueOnce({ chart: { result: [{ meta: { regularMarketPrice: 0, chartPreviousClose: 0 }, timestamp: [], indicators: { quote: [{ close: [] }] } }], error: null } }); // BDI

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.pulseBar();

    expect(result.brentCrude.price).toBe(83.5);
    expect(result.wtiCrude.price).toBe(76.2);
    expect(result.brentCrude.label).toBe("BRENT CRUDE");
    expect(result.wtiCrude.label).toBe("WTI CRUDE");
    expect(result.usPortCongestion.status).toBe("Amber");
    expect(result.lastUpdated).toBeDefined();
  });

  it("uses daily change from second-to-last close (not chartPreviousClose)", async () => {
    // chartPreviousClose = 60 (week ago), but prev day close = 80
    const brentResponse = makeYahooResponse(83.0, 60.0, [60.0, 70.0, 80.0, 83.0]);
    const wtiResponse = makeYahooResponse(76.0, 55.0, [55.0, 65.0, 73.0, 76.0]);

    mockCallDataApi
      .mockResolvedValueOnce(brentResponse)
      .mockResolvedValueOnce(wtiResponse)
      .mockResolvedValueOnce({ chart: { result: null, error: null } });

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.pulseBar();

    // Change should be from 80 to 83 = +3.75%, NOT from 60 to 83 = +38.3%
    expect(result.brentCrude.changePct).toBeCloseTo(3.75, 1);
    expect(result.brentCrude.change).toBeCloseTo(3.0, 1);
  });

  it("falls back to static data when API fails", async () => {
    mockCallDataApi.mockRejectedValue(new Error("Network error"));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.pulseBar();

    // Should return fallback values
    expect(result.brentCrude.price).toBe(84.5);
    expect(result.wtiCrude.price).toBe(80.25);
    expect(result.fbxContainer.price).toBe(4120);
  });

  it("uses static FBX value when BDI returns 0", async () => {
    const brentResponse = makeYahooResponse(83.0, 80.0, [78.0, 80.0, 83.0]);
    const wtiResponse = makeYahooResponse(76.0, 73.0, [71.0, 73.0, 76.0]);
    const bdiResponse = makeYahooResponse(0, 0, [0, 0, 0]);

    mockCallDataApi
      .mockResolvedValueOnce(brentResponse)
      .mockResolvedValueOnce(wtiResponse)
      .mockResolvedValueOnce(bdiResponse);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.pulseBar();

    expect(result.fbxContainer.price).toBe(4120); // static fallback
  });
});

describe("marketData.oilHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns merged WTI and Brent history data points", async () => {
    const wtiHistory = makeYahooResponse(76.0, 65.0, [65.0, 68.0, 72.0, 76.0]);
    const brentHistory = makeYahooResponse(83.0, 70.0, [70.0, 73.0, 78.0, 83.0]);

    mockCallDataApi
      .mockResolvedValueOnce(wtiHistory)
      .mockResolvedValueOnce(brentHistory);

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
    mockCallDataApi.mockRejectedValue(new Error("API down"));

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

describe("marketData.currentPrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current WTI and Brent prices", async () => {
    const wtiResponse = makeYahooResponse(76.5, 73.0, [73.0, 76.5]);
    const brentResponse = makeYahooResponse(83.8, 80.0, [80.0, 83.8]);

    mockCallDataApi
      .mockResolvedValueOnce(wtiResponse)
      .mockResolvedValueOnce(brentResponse);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.marketData.currentPrices();

    expect(result.wtiPrice).toBe(76.5);
    expect(result.brentPrice).toBe(83.8);
    expect(result.freightMultiplier).toBe(1.18);
  });
});
