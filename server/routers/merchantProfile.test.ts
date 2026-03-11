/**
 * merchantProfile.test.ts
 *
 * Tests for the merchantProfile tRPC router.
 * Uses vi.mock to stub getDb so no real database connection is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// ─── mock getDb ───────────────────────────────────────────────────────────────

// We keep a mutable store so tests can inspect writes
let mockProfileStore: Record<number, Record<string, unknown>> = {};
let mockHistoryStore: Record<number, unknown[]> = {};

vi.mock("../db", async (importOriginal) => {
  const original = await importOriginal<typeof import("../db")>();

  const makeSelectChain = (userId: number, tableHint: "profile" | "history") => ({
    where: (_cond: unknown) => ({
      limit: (n: number) => {
        if (tableHint === "profile") {
          const rows = Object.values(mockProfileStore);
          return Promise.resolve(rows.slice(0, n));
        }
        // history — also supports limit after where
        const rows = (mockHistoryStore[userId] ?? []) as unknown[];
        return Promise.resolve(rows.slice(0, n));
      },
      orderBy: (_ord: unknown) => ({
        limit: (n: number) => {
          const rows = (mockHistoryStore[userId] ?? []) as unknown[];
          return Promise.resolve(rows.slice(0, n));
        },
      }),
    }),
  });

  return {
    ...original,
    getDb: vi.fn().mockImplementation(() => {
      return {
        select: () => ({
          from: (table: unknown) => {
            // Detect which table by inspecting the drizzle table symbol name
            const tableName = (table as any)?.[Symbol.for("drizzle:Name")] ?? "";
            const isHistory = tableName === "margin_history";
            // We don't know userId at from() time, so return a generic chain
            return {
              where: (_cond: unknown) => ({
                limit: (n: number) => {
                  if (!isHistory) {
                    const rows = Object.values(mockProfileStore);
                    return Promise.resolve(rows.slice(0, n));
                  }
                  const allHistory = Object.values(mockHistoryStore).flat() as unknown[];
                  return Promise.resolve(allHistory.slice(0, n));
                },
                orderBy: (_ord: unknown) => ({
                  limit: (n: number) => {
                    const allHistory = Object.values(mockHistoryStore).flat() as unknown[];
                    return Promise.resolve(allHistory.slice(0, n));
                  },
                }),
              }),
            };
          },
        }),
        insert: (_table: unknown) => ({
          values: (data: Record<string, unknown>) => {
            const userId = data.userId as number;
            if (data.month !== undefined) {
              // marginHistory insert
              if (!mockHistoryStore[userId]) mockHistoryStore[userId] = [];
              (mockHistoryStore[userId] as unknown[]).push({ id: Date.now(), ...data, createdAt: new Date() });
            } else {
              // merchantProfiles insert
              mockProfileStore[userId] = { id: 1, ...data, createdAt: new Date(), updatedAt: new Date() };
            }
            return Promise.resolve();
          },
        }),
        update: (_table: unknown) => ({
          set: (data: Record<string, unknown>) => ({
            where: (_cond: unknown) => {
              const keys = Object.keys(mockProfileStore);
              if (keys.length > 0) {
                mockProfileStore[Number(keys[0])] = { ...mockProfileStore[Number(keys[0])], ...data };
              }
              return Promise.resolve();
            },
          }),
        }),
      };
    }),
  };
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeAuthContext(userId = 42): TrpcContext {
  return {
    user: { id: userId, name: "Test User", email: "test@example.com", role: "user", openId: "oid-42", createdAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("merchantProfile.getProfile", () => {
  beforeEach(() => {
    mockProfileStore = {};
    mockHistoryStore = {};
  });

  it("returns a profile object with all expected fields", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    const profile = await caller.merchantProfile.getProfile();

    expect(profile).toBeDefined();
    expect(typeof profile.userId).toBe("number");
    expect(Array.isArray(profile.sourcingRegions)).toBe(true);
    expect(Array.isArray(profile.productCategories)).toBe(true);
    expect(typeof profile.marginTargets).toBe("object");
    expect(typeof profile.carrierPrefs).toBe("object");
    expect(typeof profile.notificationPrefs).toBe("object");
  });

  it("returns default margin targets with target and floor keys", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    const profile = await caller.merchantProfile.getProfile();
    const targets = profile.marginTargets as Record<string, { target: number; floor: number }>;

    expect(targets).toBeDefined();
    // Default targets should have at least one category
    const keys = Object.keys(targets);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(typeof targets[key].target).toBe("number");
      expect(typeof targets[key].floor).toBe("number");
    }
  });

  it("returns default notification prefs with emailAlerts boolean", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    const profile = await caller.merchantProfile.getProfile();
    const notifs = profile.notificationPrefs as { emailAlerts: boolean; marginDropThreshold: number };

    expect(typeof notifs.emailAlerts).toBe("boolean");
    expect(typeof notifs.marginDropThreshold).toBe("number");
    expect(notifs.marginDropThreshold).toBeGreaterThan(0);
  });
});

describe("merchantProfile.upsertMarginTargets", () => {
  beforeEach(() => {
    mockProfileStore = {};
    mockHistoryStore = {};
  });

  it("accepts valid margin targets and returns success", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    const result = await caller.merchantProfile.upsertMarginTargets({
      electronics: { target: 35, floor: 22 },
      apparel:     { target: 40, floor: 25 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects targets with values outside 0–100", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    await expect(
      caller.merchantProfile.upsertMarginTargets({
        electronics: { target: 150, floor: 22 }, // invalid
      })
    ).rejects.toThrow();
  });
});

describe("merchantProfile.upsertCarrierPrefs", () => {
  beforeEach(() => {
    mockProfileStore = {};
    mockHistoryStore = {};
  });

  it("accepts valid carrier preferences and returns success", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    const result = await caller.merchantProfile.upsertCarrierPrefs({
      preferredCarriers: ["Maersk", "MSC"],
      avoidCarriers:     ["ZIM"],
      preferredLanes:    ["Shanghai → Rotterdam"],
    });
    expect(result.success).toBe(true);
  });
});

describe("merchantProfile.upsertNotificationPrefs", () => {
  beforeEach(() => {
    mockProfileStore = {};
    mockHistoryStore = {};
  });

  it("accepts valid notification prefs and returns success", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    const result = await caller.merchantProfile.upsertNotificationPrefs({
      emailAlerts:          true,
      criticalOnly:         false,
      weeklyDigest:         true,
      marginDropAlert:      true,
      marginDropThreshold:  5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects threshold outside 1–50", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    await expect(
      caller.merchantProfile.upsertNotificationPrefs({
        emailAlerts: true, criticalOnly: false, weeklyDigest: true,
        marginDropAlert: true, marginDropThreshold: 0, // invalid
      })
    ).rejects.toThrow();
  });
});

describe("merchantProfile.getMarginHistory", () => {
  beforeEach(() => {
    mockProfileStore = {};
    mockHistoryStore = {};
  });

  it("returns an array (empty when no snapshots)", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    const history = await caller.merchantProfile.getMarginHistory();
    expect(Array.isArray(history)).toBe(true);
  });
});

describe("merchantProfile.addMarginSnapshot", () => {
  beforeEach(() => {
    mockProfileStore = {};
    mockHistoryStore = {};
  });

  it("accepts a valid snapshot and returns success", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    const result = await caller.merchantProfile.addMarginSnapshot({
      month:            "2026-03",
      avgMargin:        28.5,
      bestMargin:       42.1,
      worstMargin:      18.3,
      avgBrentPrice:    85.0,
      criticalSkuCount: 2,
      note:             "Test snapshot",
    });
    expect(result.success).toBe(true);
    expect(["inserted", "updated"]).toContain(result.action);
  });

  it("rejects invalid month format", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    await expect(
      caller.merchantProfile.addMarginSnapshot({
        month:     "March 2026", // invalid format
        avgMargin: 28.5,
      })
    ).rejects.toThrow();
  });

  it("rejects avgMargin outside 0–100", async () => {
    const caller = appRouter.createCaller(makeAuthContext());
    await expect(
      caller.merchantProfile.addMarginSnapshot({
        month:     "2026-03",
        avgMargin: 120, // invalid
      })
    ).rejects.toThrow();
  });
});
