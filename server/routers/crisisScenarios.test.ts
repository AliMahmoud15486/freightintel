/**
 * crisisScenarios.test.ts
 * Tests for the Hormuz Crisis impact matrix router.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { crisisScenariosRouter, _resetScenarioCache } from "./crisisScenarios";
import { _resetYahooQuoteCache } from "../_core/yahooQuote";

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const makePriceResponse = (price: number) => ({
  chart: { result: [{ meta: { regularMarketPrice: price } }] },
});

vi.stubGlobal("fetch", vi.fn());

function setupFetchMocks(prices: number[]) {
  let callIndex = 0;
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const price = prices[callIndex % prices.length];
    callIndex++;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(makePriceResponse(price)),
    });
  });
}

// ─── Caller setup ─────────────────────────────────────────────────────────────

function createCaller() {
  return crisisScenariosRouter.createCaller({} as never);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("crisisScenarios.getMatrix", () => {
  beforeEach(() => {
    _resetScenarioCache();
    _resetYahooQuoteCache();
    vi.clearAllMocks();
  });

  it("returns a matrix with 5 elements and 4 sectors", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    expect(result.elements).toHaveLength(5);
    expect(result.sectors).toHaveLength(4);
  });

  it("returns a matrix with 20 cells (5 elements × 4 sectors)", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    expect(result.matrix).toHaveLength(20);
  });

  it("all cells have valid severity values", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    const validSeverities = ["critical", "high", "moderate", "low"];
    for (const cell of result.matrix) {
      expect(validSeverities).toContain(cell.severity);
    }
  });

  it("all cells have impactScore between 0 and 100", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    for (const cell of result.matrix) {
      expect(cell.impactScore).toBeGreaterThanOrEqual(0);
      expect(cell.impactScore).toBeLessThanOrEqual(100);
    }
  });

  it("all cells have valid timeHorizon values", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    const validHorizons = ["immediate", "short", "medium", "long"];
    for (const cell of result.matrix) {
      expect(validHorizons).toContain(cell.timeHorizon);
    }
  });

  it("overallCrisisScore is between 0 and 100", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    expect(result.overallCrisisScore).toBeGreaterThanOrEqual(0);
    expect(result.overallCrisisScore).toBeLessThanOrEqual(100);
  });

  it("marketSnapshot contains all expected fields", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    expect(result.marketSnapshot).toHaveProperty("brentPrice");
    expect(result.marketSnapshot).toHaveProperty("wtiPrice");
    expect(result.marketSnapshot).toHaveProperty("bdryPrice");
    expect(result.marketSnapshot).toHaveProperty("zimPrice");
    expect(result.marketSnapshot).toHaveProperty("uanPrice");
    expect(result.marketSnapshot).toHaveProperty("mosPrice");
    expect(result.marketSnapshot).toHaveProperty("cornPrice");
    expect(result.marketSnapshot).toHaveProperty("wheatPrice");
    expect(result.marketSnapshot).toHaveProperty("warRiskPremium");
  });

  it("warRiskPremium increases when oil price is above $80", async () => {
    // Low oil: $72 (below $80 threshold)
    setupFetchMocks([72, 68, 8, 20, 16, 26, 4.5, 5.0]);
    const callerLow = createCaller();
    const resultLow = await callerLow.getMatrix();
    _resetScenarioCache();
    _resetYahooQuoteCache();

    // High oil: $100 (well above $80 threshold)
    setupFetchMocks([100, 95, 15, 35, 22, 32, 5.5, 6.0]);
    const callerHigh = createCaller();
    const resultHigh = await callerHigh.getMatrix();

    expect(resultHigh.marketSnapshot.warRiskPremium).toBeGreaterThan(
      resultLow.marketSnapshot.warRiskPremium
    );
  });

  it("uses cached result on second call without re-fetching", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();

    await caller.getMatrix();
    const fetchCallsAfterFirst = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls.length;

    await caller.getMatrix();
    const fetchCallsAfterSecond = (global.fetch as ReturnType<typeof vi.fn>)
      .mock.calls.length;

    // No additional fetch calls on second invocation (cache hit)
    expect(fetchCallsAfterSecond).toBe(fetchCallsAfterFirst);
  });

  it("falls back to default prices when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );
    const caller = createCaller();
    const result = await caller.getMatrix();

    // Should still return a valid result using fallback prices
    expect(result.elements).toHaveLength(5);
    expect(result.sectors).toHaveLength(4);
    expect(result.matrix).toHaveLength(20);
  });

  it("each element has exactly 4 cells (one per sector)", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    const elementIds = result.elements.map(e => e.id);
    for (const elementId of elementIds) {
      const cells = result.matrix.filter(c => c.elementId === elementId);
      expect(cells).toHaveLength(4);
    }
  });

  it("each sector has exactly 5 cells (one per element)", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    const sectorIds = result.sectors.map(s => s.id);
    for (const sectorId of sectorIds) {
      const cells = result.matrix.filter(c => c.sectorId === sectorId);
      expect(cells).toHaveLength(5);
    }
  });

  it("lastUpdated is a valid ISO date string", async () => {
    setupFetchMocks([85, 80, 12, 28, 18, 28, 4.8, 5.4]);
    const caller = createCaller();
    const result = await caller.getMatrix();

    expect(() => new Date(result.lastUpdated)).not.toThrow();
    expect(new Date(result.lastUpdated).getTime()).not.toBeNaN();
  });
});
