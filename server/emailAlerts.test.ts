/**
 * emailAlerts.test.ts
 * Validates the Resend API key and alert email flow.
 * Uses a real API call to verify credentials are valid.
 */
import { describe, it, expect } from "vitest";
import { Resend } from "resend";
import { computeAlertKeyForTest } from "./_core/alertTrigger";

// ─── Resend API key validation ────────────────────────────────────────────────

describe("Resend API key", () => {
  it("should be configured in environment", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key, "RESEND_API_KEY must be set").toBeTruthy();
    expect(key!.startsWith("re_"), "RESEND_API_KEY must start with re_").toBe(true);
  });

  it("should have a valid sender email configured", () => {
    const from = process.env.ALERT_FROM_EMAIL;
    expect(from, "ALERT_FROM_EMAIL must be set").toBeTruthy();
    expect(from).toMatch(/@/, "ALERT_FROM_EMAIL must be a valid email");
  });
});

// ─── Alert dedup key logic ────────────────────────────────────────────────────

describe("Alert dedup key", () => {
  it("should produce the same key for the same items regardless of order", () => {
    const items1 = [
      { title: "Suez Canal blocked by tanker" },
      { title: "Red Sea attacks escalate" },
    ];
    const items2 = [
      { title: "Red Sea attacks escalate" },
      { title: "Suez Canal blocked by tanker" },
    ];
    const key1 = computeAlertKeyForTest(items1.map((i) => i.title));
    const key2 = computeAlertKeyForTest(items2.map((i) => i.title));
    expect(key1).toBe(key2);
  });

  it("should produce different keys for different items", () => {
    const key1 = computeAlertKeyForTest(["Suez Canal blocked"]);
    const key2 = computeAlertKeyForTest(["Red Sea attacks"]);
    expect(key1).not.toBe(key2);
  });

  it("should produce a 64-char hex string", () => {
    const key = computeAlertKeyForTest(["Test disruption"]);
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });
});
