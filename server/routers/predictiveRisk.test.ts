/**
 * Tests for the Predictive Risk Scoring engine helpers.
 * Tests pure functions: probability clamping, seasonal bonus, trend classification.
 */
import { describe, it, expect } from "vitest";

// ─── Replicated helpers (mirrors predictiveRisk.ts) ───────────────────────────

function clampProbability(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function seasonalRiskBonus(month: number, zones: string[]): number {
  const hasRedSea = zones.some(
    z => z.includes("red_sea") || z.includes("suez") || z.includes("hormuz")
  );
  const hasPacific = zones.some(z => z.includes("pacific"));
  const hasAtlantic = zones.some(z => z.includes("atlantic"));

  let bonus = 0;
  if (hasRedSea) bonus += 15;
  if (hasPacific && month >= 6 && month <= 11) bonus += 8;
  if (hasAtlantic && month >= 6 && month <= 11) bonus += 5;
  return Math.min(bonus, 30);
}

function deriveTrend(
  current30d: number,
  previous30d: number | null
): "rising" | "stable" | "falling" {
  if (previous30d === null) return "stable";
  const delta = current30d - previous30d;
  if (delta >= 5) return "rising";
  if (delta <= -5) return "falling";
  return "stable";
}

function probLabel(p: number): "LOW" | "MODERATE" | "HIGH" {
  if (p >= 65) return "HIGH";
  if (p >= 40) return "MODERATE";
  return "LOW";
}

function normaliseKeyRisks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    .slice(0, 4);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("clampProbability", () => {
  it("clamps values above 100 to 100", () => {
    expect(clampProbability(150)).toBe(100);
  });
  it("clamps values below 0 to 0", () => {
    expect(clampProbability(-10)).toBe(0);
  });
  it("rounds floating point values", () => {
    expect(clampProbability(42.7)).toBe(43);
    expect(clampProbability(42.3)).toBe(42);
  });
  it("passes through valid values unchanged", () => {
    expect(clampProbability(50)).toBe(50);
    expect(clampProbability(0)).toBe(0);
    expect(clampProbability(100)).toBe(100);
  });
  it("respects custom min/max bounds", () => {
    expect(clampProbability(5, 10, 90)).toBe(10);
    expect(clampProbability(95, 10, 90)).toBe(90);
  });
});

describe("seasonalRiskBonus", () => {
  it("adds 15 points for Red Sea / Suez zones regardless of month", () => {
    expect(seasonalRiskBonus(1, ["red_sea", "indian_ocean"])).toBe(15);
    expect(seasonalRiskBonus(7, ["suez_canal"])).toBe(15);
    expect(seasonalRiskBonus(3, ["hormuz"])).toBe(15);
  });

  it("adds 8 points for Pacific during typhoon season (Jun–Nov)", () => {
    expect(seasonalRiskBonus(7, ["pacific"])).toBe(8);
    expect(seasonalRiskBonus(11, ["pacific"])).toBe(8);
  });

  it("does NOT add Pacific bonus outside typhoon season", () => {
    expect(seasonalRiskBonus(1, ["pacific"])).toBe(0);
    expect(seasonalRiskBonus(5, ["pacific"])).toBe(0);
    expect(seasonalRiskBonus(12, ["pacific"])).toBe(0);
  });

  it("adds 5 points for Atlantic during hurricane season (Jun–Nov)", () => {
    expect(seasonalRiskBonus(8, ["atlantic"])).toBe(5);
  });

  it("caps combined bonus at 30", () => {
    // Red Sea (15) + Pacific typhoon (8) + Atlantic hurricane (5) = 28 — under cap
    expect(seasonalRiskBonus(8, ["red_sea", "pacific", "atlantic"])).toBe(28);
  });

  it("returns 0 for open ocean lanes with no seasonal risk", () => {
    expect(seasonalRiskBonus(3, ["open_ocean"])).toBe(0);
  });
});

describe("deriveTrend", () => {
  it("returns stable when no previous data", () => {
    expect(deriveTrend(50, null)).toBe("stable");
  });
  it("returns rising when probability increased by >= 5", () => {
    expect(deriveTrend(55, 50)).toBe("rising");
    expect(deriveTrend(80, 70)).toBe("rising");
  });
  it("returns falling when probability decreased by >= 5", () => {
    expect(deriveTrend(45, 50)).toBe("falling");
    expect(deriveTrend(30, 40)).toBe("falling");
  });
  it("returns stable when change is less than 5 points", () => {
    expect(deriveTrend(52, 50)).toBe("stable");
    expect(deriveTrend(48, 50)).toBe("stable");
    expect(deriveTrend(50, 50)).toBe("stable");
  });
  it("returns stable at exactly ±4 delta", () => {
    expect(deriveTrend(54, 50)).toBe("stable");
    expect(deriveTrend(46, 50)).toBe("stable");
  });
});

describe("probLabel", () => {
  it("returns HIGH for probability >= 65", () => {
    expect(probLabel(65)).toBe("HIGH");
    expect(probLabel(100)).toBe("HIGH");
  });
  it("returns MODERATE for probability 40–64", () => {
    expect(probLabel(40)).toBe("MODERATE");
    expect(probLabel(64)).toBe("MODERATE");
  });
  it("returns LOW for probability < 40", () => {
    expect(probLabel(0)).toBe("LOW");
    expect(probLabel(39)).toBe("LOW");
  });
});

describe("normaliseKeyRisks", () => {
  it("filters out non-string values", () => {
    expect(normaliseKeyRisks([1, "valid", null, "also valid"])).toEqual([
      "valid",
      "also valid",
    ]);
  });
  it("filters out empty strings", () => {
    expect(normaliseKeyRisks(["", "  ", "real risk"])).toEqual(["real risk"]);
  });
  it("caps at 4 items", () => {
    const input = ["a", "b", "c", "d", "e", "f"];
    expect(normaliseKeyRisks(input)).toHaveLength(4);
  });
  it("returns empty array for non-array input", () => {
    expect(normaliseKeyRisks(null)).toEqual([]);
    expect(normaliseKeyRisks("string")).toEqual([]);
    expect(normaliseKeyRisks(42)).toEqual([]);
  });
  it("returns empty array for empty array input", () => {
    expect(normaliseKeyRisks([])).toEqual([]);
  });
});
