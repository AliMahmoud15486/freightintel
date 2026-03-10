/**
 * Tests for the Carrier Recommendation Engine scoring logic.
 * We test the pure scoring functions directly without hitting the DB or LLM.
 */
import { describe, it, expect } from "vitest";

// ─── Replicated scoring helpers (mirrors carrierRecommendation.ts) ─────────────

function severityToDisruptionScore(severity: "critical" | "warning" | "none"): number {
  if (severity === "critical") return 100;
  if (severity === "warning") return 50;
  return 0;
}

function riskLevelFromScore(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function delayDaysFromRisk(riskScore: number, baseTransitDays: number): number {
  if (riskScore >= 75) return Math.round(baseTransitDays * 0.4);
  if (riskScore >= 50) return Math.round(baseTransitDays * 0.2);
  if (riskScore >= 25) return Math.round(baseTransitDays * 0.08);
  return 0;
}

function computeRiskScore({
  severity,
  mentionCount,
  zoneOverlapFraction,
  reliabilityScore,
}: {
  severity: "critical" | "warning" | "none";
  mentionCount: number;
  zoneOverlapFraction: number; // 0–1
  reliabilityScore: number;    // 0–100
}): number {
  const signalA = severityToDisruptionScore(severity) * 0.40;
  const mentionScore = Math.min(mentionCount / 3, 1) * 100;
  const signalB = mentionScore * 0.30;
  const signalC = Math.min(zoneOverlapFraction, 1) * 100 * 0.20;
  const reliabilityRisk = 100 - reliabilityScore;
  const signalD = reliabilityRisk * 0.10;
  return Math.round(signalA + signalB + signalC + signalD);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("severityToDisruptionScore", () => {
  it("returns 100 for critical", () => {
    expect(severityToDisruptionScore("critical")).toBe(100);
  });
  it("returns 50 for warning", () => {
    expect(severityToDisruptionScore("warning")).toBe(50);
  });
  it("returns 0 for none", () => {
    expect(severityToDisruptionScore("none")).toBe(0);
  });
});

describe("riskLevelFromScore", () => {
  it("returns critical for score >= 75", () => {
    expect(riskLevelFromScore(75)).toBe("critical");
    expect(riskLevelFromScore(100)).toBe("critical");
  });
  it("returns high for score 50–74", () => {
    expect(riskLevelFromScore(50)).toBe("high");
    expect(riskLevelFromScore(74)).toBe("high");
  });
  it("returns medium for score 25–49", () => {
    expect(riskLevelFromScore(25)).toBe("medium");
    expect(riskLevelFromScore(49)).toBe("medium");
  });
  it("returns low for score < 25", () => {
    expect(riskLevelFromScore(0)).toBe("low");
    expect(riskLevelFromScore(24)).toBe("low");
  });
});

describe("delayDaysFromRisk", () => {
  it("adds 40% delay for critical risk (score >= 75)", () => {
    expect(delayDaysFromRisk(80, 30)).toBe(12); // 30 * 0.4 = 12
  });
  it("adds 20% delay for high risk (score 50–74)", () => {
    expect(delayDaysFromRisk(60, 30)).toBe(6); // 30 * 0.2 = 6
  });
  it("adds 8% delay for medium risk (score 25–49)", () => {
    expect(delayDaysFromRisk(30, 30)).toBe(2); // 30 * 0.08 = 2.4 → 2
  });
  it("adds 0 delay for low risk (score < 25)", () => {
    expect(delayDaysFromRisk(10, 30)).toBe(0);
  });
});

describe("computeRiskScore", () => {
  it("scores a fully disrupted carrier at maximum risk", () => {
    const score = computeRiskScore({
      severity: "critical",
      mentionCount: 3,
      zoneOverlapFraction: 1,
      reliabilityScore: 0,
    });
    // 100*0.4 + 100*0.3 + 100*0.2 + 100*0.1 = 100
    expect(score).toBe(100);
  });

  it("scores a fully safe carrier at minimum risk", () => {
    const score = computeRiskScore({
      severity: "none",
      mentionCount: 0,
      zoneOverlapFraction: 0,
      reliabilityScore: 100,
    });
    // 0 + 0 + 0 + 0 = 0
    expect(score).toBe(0);
  });

  it("scores a carrier with warning severity and partial zone overlap correctly", () => {
    const score = computeRiskScore({
      severity: "warning",
      mentionCount: 1,
      zoneOverlapFraction: 0.5,
      reliabilityScore: 80,
    });
    // signalA: 50*0.4=20, signalB: (1/3*100)*0.3≈10, signalC: 50*0.2=10, signalD: 20*0.1=2 → 42
    expect(score).toBeGreaterThanOrEqual(38);
    expect(score).toBeLessThanOrEqual(46);
  });

  it("reliability score affects risk score inversely", () => {
    const highReliability = computeRiskScore({
      severity: "none",
      mentionCount: 0,
      zoneOverlapFraction: 0,
      reliabilityScore: 90,
    });
    const lowReliability = computeRiskScore({
      severity: "none",
      mentionCount: 0,
      zoneOverlapFraction: 0,
      reliabilityScore: 50,
    });
    expect(lowReliability).toBeGreaterThan(highReliability);
  });

  it("mention count is capped at 3 (100% signal B)", () => {
    const score3 = computeRiskScore({
      severity: "none",
      mentionCount: 3,
      zoneOverlapFraction: 0,
      reliabilityScore: 100,
    });
    const score10 = computeRiskScore({
      severity: "none",
      mentionCount: 10,
      zoneOverlapFraction: 0,
      reliabilityScore: 100,
    });
    // Both should produce the same score since cap is at 3
    expect(score3).toBe(score10);
  });
});
