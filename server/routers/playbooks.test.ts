/**
 * playbooks.test.ts
 * Tests for the deterministic normalization of LLM playbook output.
 */
import { describe, it, expect } from "vitest";
import { normalizePlaybooks } from "./playbooks";

describe("normalizePlaybooks", () => {
  it("accepts a bare array or a { playbooks } wrapper", () => {
    const action = {
      type: "switch_carrier",
      description: "Move to Hapag-Lloyd",
      estimatedImpact: "+$0.30/unit, -9 days",
    };
    const pb = {
      trigger: "Red Sea diversions",
      affectedArea: "Asia–Europe",
      severity: "critical",
      actions: [action],
      rationale: "Suez reroute adds transit time.",
      confidence: "high",
    };

    expect(normalizePlaybooks([pb])).toHaveLength(1);
    expect(normalizePlaybooks({ playbooks: [pb] })).toHaveLength(1);
  });

  it("assigns stable ids and preserves valid fields", () => {
    const [result] = normalizePlaybooks([
      {
        trigger: "Hormuz tanker incident",
        affectedArea: "Gulf routes",
        severity: "critical",
        actions: [
          {
            type: "reroute",
            description: "Route via Cape of Good Hope",
            estimatedImpact: "+14 days",
          },
        ],
        rationale: "Strait risk elevated.",
        confidence: "medium",
      },
    ]);

    expect(result.id).toBe("pb-0");
    expect(result.trigger).toBe("Hormuz tanker incident");
    expect(result.severity).toBe("critical");
    expect(result.actions[0].type).toBe("reroute");
    expect(result.confidence).toBe("medium");
  });

  it("defaults invalid enum values to safe fallbacks", () => {
    const [result] = normalizePlaybooks([
      {
        trigger: "Port congestion",
        affectedArea: "US West Coast",
        severity: "catastrophic", // invalid
        actions: [
          { type: "teleport", description: "Do a thing", estimatedImpact: "" }, // invalid type
        ],
        confidence: "absolute", // invalid
      },
    ]);

    expect(result.severity).toBe("warning");
    expect(result.actions[0].type).toBe("monitor");
    expect(result.confidence).toBe("medium");
  });

  it("drops playbooks without a trigger or without any valid action", () => {
    const result = normalizePlaybooks([
      { trigger: "", actions: [{ type: "reprice", description: "x" }] },
      { trigger: "No actions", actions: [] },
      {
        trigger: "Actions with empty descriptions",
        actions: [{ type: "reprice", description: "   " }],
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it("caps actions at 4 and playbooks at 8", () => {
    const manyActions = Array.from({ length: 10 }, (_, i) => ({
      type: "monitor",
      description: `action ${i}`,
      estimatedImpact: "",
    }));
    const [one] = normalizePlaybooks([
      { trigger: "t", actions: manyActions, severity: "info" },
    ]);
    expect(one.actions).toHaveLength(4);

    const manyPlaybooks = Array.from({ length: 12 }, (_, i) => ({
      trigger: `trigger ${i}`,
      actions: [{ type: "monitor", description: "watch" }],
    }));
    expect(normalizePlaybooks(manyPlaybooks)).toHaveLength(8);
  });

  it("returns an empty array for non-array, non-wrapper input", () => {
    expect(normalizePlaybooks(null)).toEqual([]);
    expect(normalizePlaybooks(undefined)).toEqual([]);
    expect(normalizePlaybooks("oops")).toEqual([]);
    expect(normalizePlaybooks({})).toEqual([]);
  });
});
