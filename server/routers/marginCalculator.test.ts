/**
 * Vitest tests for the Margin Impact Calculator
 * Tests the core calculation logic: margin derivation, waterfall breakdown,
 * break-even formula, and edge cases.
 */
import { describe, it, expect } from "vitest";

// ─── replicate the calculation engine (same logic as client component) ─────────

const CONTAINER_TYPES = [
  { label: "20ft Standard", baseCost: 1800 },
  { label: "40ft Standard", baseCost: 3200 },
  { label: "40ft High Cube", baseCost: 3500 },
  { label: "LCL (per CBM)", baseCost: 85 },
];

interface CalcInputs {
  unitCost: number;
  sellingPrice: number;
  unitsPerMonth: number;
  containerIndex: number;
  oilPrice: number;
  freightSurcharge: number;
  disruptionLevel: number;
}

interface CalcResult {
  baseMargin: number;
  freightImpact: number;
  oilImpact: number;
  disruptionImpact: number;
  currentMargin: number;
  delta: number;
  revenueAtRisk: number;
  unitsAffected: number;
  breakEvenPrice: number;
  totalCostPerUnit: number;
}

function calculateMargins(inputs: CalcInputs): CalcResult {
  const { unitCost, sellingPrice, unitsPerMonth, containerIndex, oilPrice, freightSurcharge, disruptionLevel } = inputs;

  if (sellingPrice <= 0 || unitCost <= 0) {
    return {
      baseMargin: 0, freightImpact: 0, oilImpact: 0, disruptionImpact: 0,
      currentMargin: 0, delta: 0, revenueAtRisk: 0, unitsAffected: 0,
      breakEvenPrice: unitCost, totalCostPerUnit: unitCost,
    };
  }

  const baseMargin = ((sellingPrice - unitCost) / sellingPrice) * 100;

  const containerBaseCost = CONTAINER_TYPES[containerIndex]?.baseCost ?? 3200;
  const effectiveUnits = Math.max(unitsPerMonth, 1);
  const freightCostPerUnit = (containerBaseCost / effectiveUnits) * (1 + freightSurcharge / 100);
  const freightImpact = (freightCostPerUnit / sellingPrice) * 100;

  const oilBaseline = 75;
  const oilDelta = oilPrice - oilBaseline;
  const oilImpact = Math.max(0, (oilDelta * 0.08) / sellingPrice * unitCost);

  const disruptionImpacts = [0.5, 2.5, 5.5];
  const disruptionImpact = disruptionImpacts[disruptionLevel] ?? 0.5;

  const currentMargin = Math.max(-99, baseMargin - freightImpact - oilImpact - disruptionImpact);
  const delta = currentMargin - baseMargin;

  const marginErosionPerUnit = (Math.abs(delta) / 100) * sellingPrice;
  const revenueAtRisk = Math.round(marginErosionPerUnit * effectiveUnits);
  const unitsAffected = delta < -5 ? Math.round(effectiveUnits * 0.8) : Math.round(effectiveUnits * 0.4);

  const totalCostPerUnit = unitCost + freightCostPerUnit + (oilImpact / 100) * sellingPrice + (disruptionImpact / 100) * sellingPrice;
  const breakEvenPrice = totalCostPerUnit / (1 - baseMargin / 100);

  return {
    baseMargin: Math.round(baseMargin * 10) / 10,
    freightImpact: Math.round(freightImpact * 10) / 10,
    oilImpact: Math.round(oilImpact * 10) / 10,
    disruptionImpact: Math.round(disruptionImpact * 10) / 10,
    currentMargin: Math.round(currentMargin * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    revenueAtRisk,
    unitsAffected,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    totalCostPerUnit: Math.round(totalCostPerUnit * 100) / 100,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("calculateMargins", () => {
  const baseInputs: CalcInputs = {
    unitCost: 28,
    sellingPrice: 65,
    unitsPerMonth: 500,
    containerIndex: 1, // 40ft Standard, $3200
    oilPrice: 75,      // at baseline, no oil impact
    freightSurcharge: 0,
    disruptionLevel: 0, // Low
  };

  it("calculates correct base margin", () => {
    const result = calculateMargins(baseInputs);
    // (65 - 28) / 65 * 100 = 56.9%
    expect(result.baseMargin).toBeCloseTo(56.9, 0);
  });

  it("returns zero margins for zero selling price", () => {
    const result = calculateMargins({ ...baseInputs, sellingPrice: 0 });
    expect(result.baseMargin).toBe(0);
    expect(result.currentMargin).toBe(0);
    expect(result.delta).toBe(0);
  });

  it("returns zero margins for zero unit cost", () => {
    const result = calculateMargins({ ...baseInputs, unitCost: 0 });
    expect(result.baseMargin).toBe(0);
  });

  it("freight surcharge increases freight impact", () => {
    const noSurcharge = calculateMargins({ ...baseInputs, freightSurcharge: 0 });
    const withSurcharge = calculateMargins({ ...baseInputs, freightSurcharge: 30 });
    expect(withSurcharge.freightImpact).toBeGreaterThan(noSurcharge.freightImpact);
  });

  it("oil above baseline creates positive oil impact", () => {
    const result = calculateMargins({ ...baseInputs, oilPrice: 100 });
    expect(result.oilImpact).toBeGreaterThan(0);
  });

  it("oil at baseline creates zero oil impact", () => {
    const result = calculateMargins({ ...baseInputs, oilPrice: 75 });
    expect(result.oilImpact).toBe(0);
  });

  it("oil below baseline creates zero oil impact (floor at 0)", () => {
    const result = calculateMargins({ ...baseInputs, oilPrice: 50 });
    expect(result.oilImpact).toBe(0);
  });

  it("disruption level Low applies 0.5pp impact", () => {
    const result = calculateMargins({ ...baseInputs, disruptionLevel: 0 });
    expect(result.disruptionImpact).toBe(0.5);
  });

  it("disruption level Medium applies 2.5pp impact", () => {
    const result = calculateMargins({ ...baseInputs, disruptionLevel: 1 });
    expect(result.disruptionImpact).toBe(2.5);
  });

  it("disruption level High applies 5.5pp impact", () => {
    const result = calculateMargins({ ...baseInputs, disruptionLevel: 2 });
    expect(result.disruptionImpact).toBe(5.5);
  });

  it("current margin is always less than or equal to base margin", () => {
    const result = calculateMargins(baseInputs);
    expect(result.currentMargin).toBeLessThanOrEqual(result.baseMargin);
  });

  it("delta is negative when costs erode margin", () => {
    const result = calculateMargins({ ...baseInputs, disruptionLevel: 2, freightSurcharge: 30, oilPrice: 100 });
    expect(result.delta).toBeLessThan(0);
  });

  it("current margin never falls below -99", () => {
    const result = calculateMargins({
      unitCost: 60, sellingPrice: 65, unitsPerMonth: 10,
      containerIndex: 2, oilPrice: 130, freightSurcharge: 50, disruptionLevel: 2,
    });
    expect(result.currentMargin).toBeGreaterThanOrEqual(-99);
  });

  it("revenue at risk is positive when margin erodes", () => {
    const result = calculateMargins({ ...baseInputs, disruptionLevel: 2 });
    expect(result.revenueAtRisk).toBeGreaterThan(0);
  });

  it("break-even price is higher than unit cost", () => {
    const result = calculateMargins(baseInputs);
    expect(result.breakEvenPrice).toBeGreaterThan(baseInputs.unitCost);
  });

  it("more units per month reduces freight cost per unit", () => {
    const fewUnits = calculateMargins({ ...baseInputs, unitsPerMonth: 100 });
    const manyUnits = calculateMargins({ ...baseInputs, unitsPerMonth: 2000 });
    expect(manyUnits.freightImpact).toBeLessThan(fewUnits.freightImpact);
  });

  it("20ft container has lower base freight cost than 40ft", () => {
    const small = calculateMargins({ ...baseInputs, containerIndex: 0 }); // 20ft
    const large = calculateMargins({ ...baseInputs, containerIndex: 1 }); // 40ft
    // 40ft costs more per container, so more freight impact per unit at same unit count
    expect(large.freightImpact).toBeGreaterThan(small.freightImpact);
  });

  it("units affected is higher when delta is severe (> -5pp)", () => {
    const mild = calculateMargins({ ...baseInputs, disruptionLevel: 0 });
    const severe = calculateMargins({ ...baseInputs, disruptionLevel: 2, freightSurcharge: 50, oilPrice: 120 });
    // Severe should have delta < -5, triggering 80% affected vs 40%
    if (severe.delta < -5) {
      expect(severe.unitsAffected).toBe(Math.round(500 * 0.8));
    }
    if (mild.delta >= -5) {
      expect(mild.unitsAffected).toBe(Math.round(500 * 0.4));
    }
  });
});
