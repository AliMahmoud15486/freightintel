import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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