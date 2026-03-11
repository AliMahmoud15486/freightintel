/**
 * merchantProfile.ts — tRPC router for Merchant Profile
 *
 * Procedures:
 *   getProfile           — fetch or auto-create the profile for the logged-in user
 *   updateProfile        — update business details
 *   upsertMarginTargets  — save per-category margin targets
 *   upsertCarrierPrefs   — save preferred / avoided carriers and lanes
 *   upsertNotificationPrefs — save notification settings
 *   getMarginHistory     — list monthly snapshots for the user
 *   addMarginSnapshot    — insert a new monthly snapshot (called by cron or manually)
 *
 * All procedures are protected — require authenticated session.
 */
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db";
import { merchantProfiles, marginHistory } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Parse a JSON text column, returning a default if null/invalid */
function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

/** Default margin targets — 30% target / 20% floor for every category */
const DEFAULT_MARGIN_TARGETS = {
  electronics:  { target: 35, floor: 22 },
  apparel:      { target: 40, floor: 25 },
  "home-garden":{ target: 38, floor: 24 },
  toys:         { target: 42, floor: 28 },
  "auto-parts": { target: 30, floor: 18 },
  industrial:   { target: 28, floor: 16 },
};

const DEFAULT_CARRIER_PREFS = {
  preferredCarriers: [] as string[],
  avoidCarriers:     [] as string[],
  preferredLanes:    [] as string[],
};

const DEFAULT_NOTIFICATION_PREFS = {
  emailAlerts:          true,
  criticalOnly:         false,
  weeklyDigest:         true,
  marginDropAlert:      true,
  marginDropThreshold:  5,
};

/** Fetch (or auto-create) the profile row for a user */
async function getOrCreateProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, userId)).limit(1);
  if (rows.length > 0) return rows[0];
  // Auto-create with empty defaults
  await db.insert(merchantProfiles).values({ userId });
  const created = await db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, userId)).limit(1);
  return created[0];
}

/** Shape a raw DB row into a clean profile object */
function shapeProfile(row: typeof merchantProfiles.$inferSelect) {
  return {
    id:                  row.id,
    userId:              row.userId,
    businessName:        row.businessName ?? "",
    industry:            row.industry ?? "",
    companySize:         row.companySize ?? "",
    annualImportVolume:  row.annualImportVolume ?? "",
    sourcingRegions:     row.sourcingRegions ? row.sourcingRegions.split(",").map(s => s.trim()).filter(Boolean) : [],
    productCategories:   row.productCategories ? row.productCategories.split(",").map(s => s.trim()).filter(Boolean) : [],
    website:             row.website ?? "",
    bio:                 row.bio ?? "",
    marginTargets:       parseJson(row.marginTargets, DEFAULT_MARGIN_TARGETS),
    carrierPrefs:        parseJson(row.carrierPrefs, DEFAULT_CARRIER_PREFS),
    notificationPrefs:   parseJson(row.notificationPrefs, DEFAULT_NOTIFICATION_PREFS),
    createdAt:           row.createdAt,
    updatedAt:           row.updatedAt,
  };
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const businessDetailsInput = z.object({
  businessName:       z.string().max(255).optional(),
  industry:           z.string().max(128).optional(),
  companySize:        z.string().max(64).optional(),
  annualImportVolume: z.string().max(64).optional(),
  sourcingRegions:    z.array(z.string()).optional(),
  productCategories:  z.array(z.string()).optional(),
  website:            z.string().max(512).optional(),
  bio:                z.string().max(2000).optional(),
});

const marginTargetEntry = z.object({
  target: z.number().min(0).max(100),
  floor:  z.number().min(0).max(100),
});

const marginTargetsInput = z.record(z.string(), marginTargetEntry);

const carrierPrefsInput = z.object({
  preferredCarriers: z.array(z.string()),
  avoidCarriers:     z.array(z.string()),
  preferredLanes:    z.array(z.string()),
});

const notificationPrefsInput = z.object({
  emailAlerts:          z.boolean(),
  criticalOnly:         z.boolean(),
  weeklyDigest:         z.boolean(),
  marginDropAlert:      z.boolean(),
  marginDropThreshold:  z.number().min(1).max(50),
});

const marginSnapshotInput = z.object({
  month:           z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"),
  avgMargin:       z.number().min(0).max(100),
  bestMargin:      z.number().min(0).max(100).optional(),
  worstMargin:     z.number().min(0).max(100).optional(),
  avgBrentPrice:   z.number().min(0).optional(),
  criticalSkuCount:z.number().int().min(0).optional(),
  note:            z.string().max(500).optional(),
});

// ─── router ───────────────────────────────────────────────────────────────────

export const merchantProfileRouter = router({

  /** Fetch (or auto-create) the profile for the current user */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const row = await getOrCreateProfile(ctx.user.id);
    return shapeProfile(row);
  }),

  /** Update business details */
  updateProfile: protectedProcedure
    .input(businessDetailsInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await getOrCreateProfile(ctx.user.id); // ensure row exists
      await db.update(merchantProfiles)
        .set({
          ...(input.businessName       !== undefined && { businessName: input.businessName }),
          ...(input.industry           !== undefined && { industry: input.industry }),
          ...(input.companySize        !== undefined && { companySize: input.companySize }),
          ...(input.annualImportVolume !== undefined && { annualImportVolume: input.annualImportVolume }),
          ...(input.sourcingRegions    !== undefined && { sourcingRegions: input.sourcingRegions.join(", ") }),
          ...(input.productCategories  !== undefined && { productCategories: input.productCategories.join(", ") }),
          ...(input.website            !== undefined && { website: input.website }),
          ...(input.bio                !== undefined && { bio: input.bio }),
        })
        .where(eq(merchantProfiles.userId, ctx.user.id));
      const row = await getOrCreateProfile(ctx.user.id);
      return shapeProfile(row);
    }),

  /** Save per-category margin targets */
  upsertMarginTargets: protectedProcedure
    .input(marginTargetsInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await getOrCreateProfile(ctx.user.id);
      await db.update(merchantProfiles)
        .set({ marginTargets: JSON.stringify(input) })
        .where(eq(merchantProfiles.userId, ctx.user.id));
      return { success: true };
    }),

  /** Save carrier and lane preferences */
  upsertCarrierPrefs: protectedProcedure
    .input(carrierPrefsInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await getOrCreateProfile(ctx.user.id);
      await db.update(merchantProfiles)
        .set({ carrierPrefs: JSON.stringify(input) })
        .where(eq(merchantProfiles.userId, ctx.user.id));
      return { success: true };
    }),

  /** Save notification preferences */
  upsertNotificationPrefs: protectedProcedure
    .input(notificationPrefsInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await getOrCreateProfile(ctx.user.id);
      await db.update(merchantProfiles)
        .set({ notificationPrefs: JSON.stringify(input) })
        .where(eq(merchantProfiles.userId, ctx.user.id));
      return { success: true };
    }),

  /** List monthly margin snapshots for the current user (most recent first) */
  getMarginHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(marginHistory)
      .where(eq(marginHistory.userId, ctx.user.id))
      .orderBy(desc(marginHistory.month))
      .limit(24); // up to 2 years
    return rows;
  }),

  /** Insert a new monthly margin snapshot */
  addMarginSnapshot: protectedProcedure
    .input(marginSnapshotInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Upsert: find existing row for same month, update or insert
      const existing = await db
        .select()
        .from(marginHistory)
        .where(eq(marginHistory.userId, ctx.user.id))
        .limit(100);
      const sameMonth = existing.find((r: typeof marginHistory.$inferSelect) => r.month === input.month);
      if (sameMonth) {
        // Update in place
        await db.update(marginHistory)
          .set({
            avgMargin:        input.avgMargin,
            bestMargin:       input.bestMargin ?? null,
            worstMargin:      input.worstMargin ?? null,
            avgBrentPrice:    input.avgBrentPrice ?? null,
            criticalSkuCount: input.criticalSkuCount ?? 0,
            note:             input.note ?? null,
          })
          .where(eq(marginHistory.id, sameMonth.id));
        return { success: true, action: "updated" as const };
      }
      await db.insert(marginHistory).values({
        userId:           ctx.user.id,
        month:            input.month,
        avgMargin:        input.avgMargin,
        bestMargin:       input.bestMargin ?? null,
        worstMargin:      input.worstMargin ?? null,
        avgBrentPrice:    input.avgBrentPrice ?? null,
        criticalSkuCount: input.criticalSkuCount ?? 0,
        note:             input.note ?? null,
      });
      return { success: true, action: "inserted" as const };
    }),
});
