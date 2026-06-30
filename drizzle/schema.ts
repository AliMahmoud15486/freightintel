import {
  float,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * Subscribers — stores name and email captured from the dashboard sign-up form.
 */
export const subscribers = mysqlTable("subscribers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = typeof subscribers.$inferInsert;

/**
 * SentAlerts — tracks which disruption alert batches have already been emailed
 * to prevent duplicate notifications on the same news cycle.
 * The alertKey is a hash of the critical item titles, so the same batch
 * is never sent twice even if the server restarts.
 */
export const sentAlerts = mysqlTable("sent_alerts", {
  id: int("id").autoincrement().primaryKey(),
  /** SHA-256 hash of sorted critical item titles — used as dedup key */
  alertKey: varchar("alertKey", { length: 64 }).notNull().unique(),
  /** Number of critical items in this batch */
  itemCount: int("itemCount").notNull().default(1),
  /** Number of subscribers successfully emailed */
  recipientCount: int("recipientCount").notNull().default(0),
  /** Short description of the alert batch for admin reference */
  summary: text("summary"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type SentAlert = typeof sentAlerts.$inferSelect;
export type InsertSentAlert = typeof sentAlerts.$inferInsert;

/**
 * FreightLanes — major trade routes used by the Carrier Recommendation Engine.
 * Each lane represents an origin→destination port pair with baseline transit data.
 */
export const freightLanes = mysqlTable("freight_lanes", {
  id: int("id").autoincrement().primaryKey(),
  /** Human-readable lane name, e.g. "Shanghai → Rotterdam" */
  name: varchar("name", { length: 255 }).notNull(),
  /** Origin region key, e.g. "china", "india", "uae" */
  originRegion: varchar("originRegion", { length: 64 }).notNull(),
  /** Destination region key, e.g. "uk", "usa", "germany" */
  destinationRegion: varchar("destinationRegion", { length: 64 }).notNull(),
  /** Origin port name */
  originPort: varchar("originPort", { length: 128 }).notNull(),
  /** Destination port name */
  destinationPort: varchar("destinationPort", { length: 128 }).notNull(),
  /** Baseline transit time in days (no disruption) */
  baseTransitDays: int("baseTransitDays").notNull(),
  /** Relative cost index: 1=low, 2=medium, 3=high */
  costIndex: int("costIndex").notNull().default(2),
  /** Disruption zones this lane passes through, comma-separated */
  zones: varchar("zones", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FreightLane = typeof freightLanes.$inferSelect;
export type InsertFreightLane = typeof freightLanes.$inferInsert;

/**
 * LaneCarriers — junction table mapping freight lanes to the carriers that operate them.
 * Also stores carrier-specific baseline data for that lane.
 */
export const laneCarriers = mysqlTable("lane_carriers", {
  id: int("id").autoincrement().primaryKey(),
  laneId: int("laneId").notNull(),
  /** Carrier ID matching the existing ShippingLines carrier list, e.g. "maersk" */
  carrierId: varchar("carrierId", { length: 64 }).notNull(),
  /** Display name, e.g. "Maersk" */
  carrierName: varchar("carrierName", { length: 128 }).notNull(),
  /** Carrier-specific transit days on this lane (may differ from lane baseline) */
  transitDays: int("transitDays").notNull(),
  /** Relative reliability score 0–100 (static seed, higher = more reliable) */
  reliabilityScore: int("reliabilityScore").notNull().default(70),
  /** Carrier-specific cost index for this lane: 1=cheap, 2=mid, 3=premium */
  costIndex: int("costIndex").notNull().default(2),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LaneCarrier = typeof laneCarriers.$inferSelect;
export type InsertLaneCarrier = typeof laneCarriers.$inferInsert;

/**
 * RiskForecasts — stores LLM-generated 30/60-day disruption probability forecasts per lane.
 * Cached for 30 minutes to avoid excessive LLM calls.
 * Accumulates over time to enable sparkline trend history.
 */
export const riskForecasts = mysqlTable("risk_forecasts", {
  id: int("id").autoincrement().primaryKey(),
  laneId: int("laneId").notNull(),
  laneName: varchar("laneName", { length: 255 }).notNull(),
  /** Probability of significant disruption in next 30 days, 0–100 */
  probability30d: int("probability30d").notNull(),
  /** Probability of significant disruption in next 60 days, 0–100 */
  probability60d: int("probability60d").notNull(),
  /** Whether risk is rising, stable, or falling vs. previous forecast */
  trend: mysqlEnum("trend", ["rising", "stable", "falling"])
    .notNull()
    .default("stable"),
  /** JSON array of key risk factor strings */
  keyRisks: text("keyRisks"),
  /** LLM confidence in this forecast */
  confidence: mysqlEnum("confidence", ["high", "medium", "low"])
    .notNull()
    .default("medium"),
  /** Short summary sentence for the forecast */
  summary: text("summary"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type RiskForecast = typeof riskForecasts.$inferSelect;
export type InsertRiskForecast = typeof riskForecasts.$inferInsert;

/**
 * MerchantProfiles — one row per authenticated user.
 * Stores all editable business profile data as JSON blobs for flexibility.
 */
export const merchantProfiles = mysqlTable("merchant_profiles", {
  id: int("id").autoincrement().primaryKey(),
  /** FK to users.id */
  userId: int("userId").notNull().unique(),
  /** Business display name */
  businessName: varchar("businessName", { length: 255 }),
  /** Industry vertical, e.g. "Electronics", "Apparel" */
  industry: varchar("industry", { length: 128 }),
  /** Company size bracket */
  companySize: varchar("companySize", { length: 64 }),
  /** Annual import volume in USD */
  annualImportVolume: varchar("annualImportVolume", { length: 64 }),
  /** Primary sourcing regions, comma-separated */
  sourcingRegions: text("sourcingRegions"),
  /** Product categories traded, comma-separated */
  productCategories: text("productCategories"),
  /** Website URL */
  website: varchar("website", { length: 512 }),
  /** Business description / bio */
  bio: text("bio"),
  /** JSON: { [categoryId]: { target: number, floor: number } } */
  marginTargets: text("marginTargets"),
  /** JSON: { preferredCarriers: string[], preferredLanes: string[], avoidCarriers: string[] } */
  carrierPrefs: text("carrierPrefs"),
  /** JSON: { emailAlerts: boolean, criticalOnly: boolean, weeklyDigest: boolean, marginDropAlert: boolean, marginDropThreshold: number } */
  notificationPrefs: text("notificationPrefs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MerchantProfile = typeof merchantProfiles.$inferSelect;
export type InsertMerchantProfile = typeof merchantProfiles.$inferInsert;

/**
 * MarginHistory — monthly margin snapshots per user.
 * Used to render the historical margin trend sparkline on the profile page.
 */
export const marginHistory = mysqlTable("margin_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** YYYY-MM label, e.g. "2026-02" */
  month: varchar("month", { length: 7 }).notNull(),
  /** Average portfolio margin % that month */
  avgMargin: float("avgMargin").notNull(),
  /** Best performing category margin % */
  bestMargin: float("bestMargin"),
  /** Worst performing category margin % */
  worstMargin: float("worstMargin"),
  /** Brent crude average that month */
  avgBrentPrice: float("avgBrentPrice"),
  /** Number of critical SKUs that month */
  criticalSkuCount: int("criticalSkuCount").default(0),
  /** Optional note */
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarginHistory = typeof marginHistory.$inferSelect;
export type InsertMarginHistory = typeof marginHistory.$inferInsert;
