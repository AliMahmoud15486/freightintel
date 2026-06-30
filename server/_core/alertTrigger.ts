/**
 * alertTrigger.ts
 * Checks the current news feed for critical disruptions and sends alert emails
 * to all subscribers if new critical items are found that haven't been sent before.
 *
 * Called:
 *   1. Automatically after each news cache refresh (every 15 minutes)
 *   2. Manually via the tRPC admin procedure `system.triggerAlerts`
 */

import { createHash } from "crypto";
import { NewsItem } from "../routers/news";
import { broadcastAlertEmails } from "./emailAlerts";
import { getAllSubscribers, getSentAlertByKey, insertSentAlert } from "../db";

/**
 * Compute a stable dedup key from a set of critical news items.
 * Uses a SHA-256 hash of the sorted item titles so the same batch
 * never triggers duplicate emails even across server restarts.
 */
function computeAlertKey(criticalItems: NewsItem[]): string {
  const sorted = [...criticalItems]
    .map(i => i.title.trim().toLowerCase())
    .sort()
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 64);
}

/** Exported for unit testing only */
export function computeAlertKeyForTest(titles: string[]): string {
  const sorted = [...titles]
    .map(t => t.trim().toLowerCase())
    .sort()
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 64);
}

export interface AlertTriggerResult {
  triggered: boolean;
  criticalCount: number;
  subscriberCount: number;
  successCount: number;
  alertKey: string;
  reason?: string;
}

/**
 * Main entry point: given the current classified news items, check if there
 * are new critical disruptions and send alert emails if needed.
 */
export async function checkAndSendAlerts(
  newsItems: NewsItem[]
): Promise<AlertTriggerResult> {
  const criticalItems = newsItems.filter(i => i.severity === "critical");

  if (criticalItems.length === 0) {
    return {
      triggered: false,
      criticalCount: 0,
      subscriberCount: 0,
      successCount: 0,
      alertKey: "",
      reason: "No critical disruptions in current news batch",
    };
  }

  const alertKey = computeAlertKey(criticalItems);

  // Check if we already sent an alert for this exact batch
  const alreadySent = await getSentAlertByKey(alertKey);
  if (alreadySent) {
    return {
      triggered: false,
      criticalCount: criticalItems.length,
      subscriberCount: 0,
      successCount: 0,
      alertKey,
      reason: `Alert already sent at ${alreadySent.sentAt.toISOString()}`,
    };
  }

  // Get all subscribers
  const subscribers = await getAllSubscribers();
  if (subscribers.length === 0) {
    return {
      triggered: false,
      criticalCount: criticalItems.length,
      subscriberCount: 0,
      successCount: 0,
      alertKey,
      reason: "No subscribers to notify",
    };
  }

  console.log(
    `[alertTrigger] ${criticalItems.length} critical item(s) — sending to ${subscribers.length} subscriber(s)`
  );

  // Broadcast emails
  const results = await broadcastAlertEmails(
    subscribers.map(s => ({ email: s.email, name: s.name })),
    criticalItems
  );

  const successCount = results.filter(r => r.success).length;

  // Record the sent alert to prevent duplicates
  const summary = criticalItems
    .slice(0, 3)
    .map(i => i.title.slice(0, 80))
    .join(" | ");

  await insertSentAlert({
    alertKey,
    itemCount: criticalItems.length,
    recipientCount: successCount,
    summary,
  });

  console.log(
    `[alertTrigger] Alert sent: ${successCount}/${subscribers.length} delivered`
  );

  return {
    triggered: true,
    criticalCount: criticalItems.length,
    subscriberCount: subscribers.length,
    successCount,
    alertKey,
  };
}
