/* liveContext.ts — Freight Intel
 *
 * Assembles a compact snapshot of the current live state (prices, disruptions,
 * affected carriers, top risk lanes) that the AI Analyst and Action Playbooks
 * features reason over. Reuses the existing in-memory caches and the shared
 * Yahoo quote cache, so building context is cheap when those are warm.
 */

import {
  fetchAndClassifyNewsPublic,
  getShippingLinesCache,
  aggregateDisruptionLocations,
  type NewsItem,
} from "../routers/news";
import { getQuotePriceOr } from "./yahooQuote";
import { getDb } from "../db";
import { riskForecasts } from "../../drizzle/schema";
import { desc, gte } from "drizzle-orm";

export interface LiveContext {
  generatedAt: string;
  prices: {
    brent: number;
    wti: number;
    natGas: number;
    bdry: number;
    zim: number;
  };
  disruptions: {
    criticalCount: number;
    warningCount: number;
    topItems: Array<{
      title: string;
      severity: NewsItem["severity"];
      summary: string;
      etaImpact?: string;
      costImpact?: string;
      tags: string[];
      affectedCategories: string[];
    }>;
    locations: Array<{ name: string; severity: string }>;
  };
  affectedCarriers: Array<{
    name: string;
    severity: string;
    reason: string;
    affectedRoutes: string[];
  }>;
  topRiskLanes: Array<{
    laneName: string;
    probability30d: number;
    trend: string;
    summary: string;
  }>;
}

async function loadTopRiskLanes(): Promise<LiveContext["topRiskLanes"]> {
  try {
    const db = await getDb();
    if (!db) return [];
    // Look at forecasts generated in the last ~35 min (the 30-min cache window
    // plus slack), newest first, then keep the latest row per lane.
    const cutoff = new Date(Date.now() - 35 * 60 * 1000);
    const rows = await db
      .select()
      .from(riskForecasts)
      .where(gte(riskForecasts.generatedAt, cutoff))
      .orderBy(desc(riskForecasts.generatedAt));

    const seen = new Set<string>();
    const latestPerLane = rows.filter(r => {
      if (seen.has(r.laneName)) return false;
      seen.add(r.laneName);
      return true;
    });

    return latestPerLane
      .sort((a, b) => b.probability30d - a.probability30d)
      .slice(0, 5)
      .map(r => ({
        laneName: r.laneName,
        probability30d: r.probability30d,
        trend: r.trend,
        summary: r.summary ?? "",
      }));
  } catch {
    return [];
  }
}

/** Builds the live-state snapshot both AI features share. */
export async function buildLiveContext(): Promise<LiveContext> {
  const [newsItems, brent, wti, natGas, bdry, zim, topRiskLanes] =
    await Promise.all([
      fetchAndClassifyNewsPublic().catch(() => [] as NewsItem[]),
      getQuotePriceOr("BZ=F", 84.5),
      getQuotePriceOr("CL=F", 80.25),
      getQuotePriceOr("NG=F", 3.12),
      getQuotePriceOr("BDRY", 12.22),
      getQuotePriceOr("ZIM", 28.83),
      loadTopRiskLanes(),
    ]);

  const criticalCount = newsItems.filter(i => i.severity === "critical").length;
  const warningCount = newsItems.filter(i => i.severity === "warning").length;

  // Most relevant items first: critical, then warning, then info.
  const order = { critical: 0, warning: 1, info: 2 } as const;
  const topItems = [...newsItems]
    .sort((a, b) => order[a.severity] - order[b.severity])
    .slice(0, 10)
    .map(i => ({
      title: i.title,
      severity: i.severity,
      summary: i.summary,
      etaImpact: i.etaImpact,
      costImpact: i.costImpact,
      tags: i.tags ?? [],
      affectedCategories: i.affectedCategories ?? [],
    }));

  const locations = aggregateDisruptionLocations(newsItems)
    .slice(0, 12)
    .map(l => ({ name: l.name, severity: l.severity }));

  const affectedCarriers = getShippingLinesCache()
    .filter(c => c.affected)
    .map(c => ({
      name: c.name,
      severity: c.severity,
      reason: c.reason,
      affectedRoutes: c.affectedRoutes,
    }));

  return {
    generatedAt: new Date().toISOString(),
    prices: {
      brent: Math.round(brent * 100) / 100,
      wti: Math.round(wti * 100) / 100,
      natGas: Math.round(natGas * 100) / 100,
      bdry: Math.round(bdry * 100) / 100,
      zim: Math.round(zim * 100) / 100,
    },
    disruptions: { criticalCount, warningCount, topItems, locations },
    affectedCarriers,
    topRiskLanes,
  };
}

/** Renders the snapshot as a compact text block for an LLM prompt. */
export function formatContextForLLM(ctx: LiveContext): string {
  const lines: string[] = [];

  lines.push("=== LIVE MARKET PRICES ===");
  lines.push(
    `Brent crude: $${ctx.prices.brent}/bbl | WTI: $${ctx.prices.wti}/bbl | Nat gas: $${ctx.prices.natGas}/MMBtu`
  );
  lines.push(
    `Dry-bulk freight ETF (BDRY): ${ctx.prices.bdry} | ZIM shipping: ${ctx.prices.zim}`
  );

  lines.push("");
  lines.push("=== ACTIVE DISRUPTIONS ===");
  lines.push(
    `${ctx.disruptions.criticalCount} critical, ${ctx.disruptions.warningCount} warning news signals.`
  );
  if (ctx.disruptions.topItems.length === 0) {
    lines.push("No notable disruption headlines in the current window.");
  } else {
    for (const item of ctx.disruptions.topItems) {
      const impact = [
        item.etaImpact ? `ETA ${item.etaImpact}` : null,
        item.costImpact ? `cost ${item.costImpact}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      const cats = item.affectedCategories.length
        ? ` [${item.affectedCategories.join(", ")}]`
        : "";
      lines.push(
        `- (${item.severity.toUpperCase()}) ${item.title}${impact ? ` — ${impact}` : ""}${cats}`
      );
    }
  }

  if (ctx.disruptions.locations.length > 0) {
    lines.push(
      `Hotspots: ${ctx.disruptions.locations.map(l => `${l.name} (${l.severity})`).join(", ")}`
    );
  }

  if (ctx.affectedCarriers.length > 0) {
    lines.push("");
    lines.push("=== AFFECTED CARRIERS ===");
    for (const c of ctx.affectedCarriers) {
      lines.push(
        `- ${c.name} (${c.severity})${c.affectedRoutes.length ? ` on ${c.affectedRoutes.join(", ")}` : ""}: ${c.reason}`
      );
    }
  }

  if (ctx.topRiskLanes.length > 0) {
    lines.push("");
    lines.push("=== HIGHEST-RISK LANES (30-day disruption probability) ===");
    for (const lane of ctx.topRiskLanes) {
      lines.push(
        `- ${lane.laneName}: ${lane.probability30d}% (${lane.trend})${lane.summary ? ` — ${lane.summary}` : ""}`
      );
    }
  }

  return lines.join("\n");
}
