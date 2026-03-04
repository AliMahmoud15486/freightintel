import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertSubscriber, InsertUser, subscribers, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

/**
 * Insert a new subscriber. Returns the inserted row id.
 * Throws if the email already exists (duplicate key).
 */
export async function insertSubscriber(data: InsertSubscriber): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(subscribers).values(data);
  return { id: (result[0] as any).insertId as number };
}

/**
 * Check if an email is already registered as a subscriber.
 */
export async function getSubscriberByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Return all subscribers (for admin use).
 */
export async function getAllSubscribers() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(subscribers).orderBy(subscribers.createdAt);
}

// ─── Sent Alerts helpers ──────────────────────────────────────────────────────

import { sentAlerts, InsertSentAlert } from "../drizzle/schema";

/**
 * Check if an alert with this key has already been sent.
 */
export async function getSentAlertByKey(alertKey: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(sentAlerts).where(eq(sentAlerts.alertKey, alertKey)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Record that an alert batch was sent.
 */
export async function insertSentAlert(data: InsertSentAlert): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(sentAlerts).values(data);
}

/**
 * Return the most recent sent alerts (for admin view).
 */
export async function getRecentSentAlerts(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(sentAlerts).orderBy(sentAlerts.sentAt).limit(limit);
}
