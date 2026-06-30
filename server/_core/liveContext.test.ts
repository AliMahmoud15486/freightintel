/**
 * liveContext.test.ts
 * Tests the deterministic LLM-context formatting.
 */
import { describe, it, expect } from "vitest";
import { formatContextForLLM, type LiveContext } from "./liveContext";

const baseCtx: LiveContext = {
  generatedAt: "2026-06-30T00:00:00.000Z",
  prices: { brent: 84.5, wti: 80.25, natGas: 3.12, bdry: 12.22, zim: 28.83 },
  disruptions: {
    criticalCount: 2,
    warningCount: 1,
    topItems: [
      {
        title: "Tanker incident near Hormuz",
        severity: "critical",
        summary: "Vessel disabled",
        etaImpact: "+10 days",
        costImpact: "+8%",
        tags: ["#Shipping"],
        affectedCategories: ["Electronics"],
      },
    ],
    locations: [{ name: "Strait of Hormuz", severity: "critical" }],
  },
  affectedCarriers: [
    {
      name: "Maersk",
      severity: "critical",
      reason: "Gulf route disruption",
      affectedRoutes: ["Asia–Europe"],
    },
  ],
  topRiskLanes: [
    {
      laneName: "Shanghai → Rotterdam",
      probability30d: 72,
      trend: "rising",
      summary: "Red Sea reroute",
    },
  ],
};

describe("formatContextForLLM", () => {
  it("includes prices, disruption counts, carriers and risk lanes", () => {
    const text = formatContextForLLM(baseCtx);
    expect(text).toContain("Brent crude: $84.5/bbl");
    expect(text).toContain("2 critical, 1 warning");
    expect(text).toContain("Tanker incident near Hormuz");
    expect(text).toContain("ETA +10 days");
    expect(text).toContain("Electronics");
    expect(text).toContain("Maersk");
    expect(text).toContain("Shanghai → Rotterdam");
    expect(text).toContain("72%");
  });

  it("handles an all-quiet context without throwing", () => {
    const quiet: LiveContext = {
      ...baseCtx,
      disruptions: {
        criticalCount: 0,
        warningCount: 0,
        topItems: [],
        locations: [],
      },
      affectedCarriers: [],
      topRiskLanes: [],
    };
    const text = formatContextForLLM(quiet);
    expect(text).toContain("0 critical, 0 warning");
    expect(text).toContain("No notable disruption headlines");
    expect(text).not.toContain("AFFECTED CARRIERS");
  });
});
