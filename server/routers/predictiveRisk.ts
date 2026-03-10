/**
 * Predictive Risk Scoring Engine
 *
 * Generates 30-day and 60-day disruption probability forecasts for each freight lane.
 * Uses LLM reasoning over live signals:
 *   - Current news severity and topics
 *   - Active disruption zones from the map
 *   - Carrier disruption status
 *   - Seasonal patterns (month of year)
 *   - Lane zone exposure (Red Sea, Suez, Hormuz, Pacific, etc.)
 *
 * Forecasts are stored in the risk_forecasts table with a 30-minute cache.
 * Historical rows accumulate to enable sparkline trend display.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { freightLanes, riskForecasts, FreightLane, RiskForecast } from "../../drizzle/schema";
import { desc, eq, gte } from "drizzle-orm";
import { getNewsCache, getShippingLinesCache } from "./news";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LaneForecast {
  laneId: number;
  laneName: string;
  originPort: string;
  destinationPort: string;
  zones: string[];
  probability30d: number;       // 0–100
  probability60d: number;       // 0–100
  trend: "rising" | "stable" | "falling";
  keyRisks: string[];
  confidence: "high" | "medium" | "low";
  summary: string;
  generatedAt: string;
  // Sparkline: last 7 forecasts (oldest first)
  sparkline: number[];
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const FORECAST_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ─── Seasonal risk adjustment ─────────────────────────────────────────────────

function seasonalRiskBonus(month: number, zones: string[]): number {
  // Red Sea / Suez: elevated risk year-round during current conflict
  const hasRedSea = zones.some(z => z.includes("red_sea") || z.includes("suez") || z.includes("hormuz"));
  // Pacific: typhoon season June–November adds transit risk
  const hasPacific = zones.some(z => z.includes("pacific"));
  // Atlantic: hurricane season June–November
  const hasAtlantic = zones.some(z => z.includes("atlantic"));

  let bonus = 0;
  if (hasRedSea) bonus += 15; // ongoing geopolitical conflict premium
  if (hasPacific && month >= 6 && month <= 11) bonus += 8;
  if (hasAtlantic && month >= 6 && month <= 11) bonus += 5;
  return Math.min(bonus, 30);
}

// ─── Build context for LLM ────────────────────────────────────────────────────

function buildForecastContext(lane: FreightLane): string {
  const newsItems = getNewsCache();
  const shippingLines = getShippingLinesCache();
  const zones = (lane.zones ?? "").split(",").map(z => z.trim()).filter(Boolean);
  const month = new Date().getMonth() + 1;
  const monthName = new Date().toLocaleString("en-US", { month: "long" });

  // Relevant news (items whose tags or content mention lane zones)
  const relevantNews = newsItems
    .filter(item => {
      const text = `${item.title} ${item.summary} ${(item.tags ?? []).join(" ")}`.toLowerCase();
      return zones.some(z => text.includes(z.replace(/_/g, " "))) ||
        text.includes(lane.originPort.toLowerCase()) ||
        text.includes(lane.destinationPort.toLowerCase());
    })
    .slice(0, 5);

  const criticalNews = newsItems.filter(i => i.severity === "critical").slice(0, 5);
  const warningNews = newsItems.filter(i => i.severity === "warning").slice(0, 3);

  // Affected carriers on this lane
  const laneCarrierIds = ["maersk", "msc", "cmacgm", "hapag", "cosco", "evergreen", "one", "yangming"];
  const affectedCarriers = shippingLines
    .filter(c => c.affected && laneCarrierIds.includes(c.id))
    .map(c => `${c.name} (${c.severity}: ${c.reason})`);

  const seasonal = seasonalRiskBonus(month, zones);

  return `
Lane: ${lane.name}
Route: ${lane.originPort} → ${lane.destinationPort}
Zones traversed: ${zones.join(", ") || "open ocean"}
Current month: ${monthName} (month ${month})
Seasonal risk bonus: +${seasonal} points

Critical news (${criticalNews.length} items):
${criticalNews.map(i => `- [CRITICAL] ${i.title} | ETA: ${i.etaImpact ?? "unknown"} | Cost: ${i.costImpact ?? "unknown"}`).join("\n") || "None"}

Warning news (${warningNews.length} items):
${warningNews.map(i => `- [WARNING] ${i.title}`).join("\n") || "None"}

Lane-relevant news (${relevantNews.length} items):
${relevantNews.map(i => `- [${i.severity.toUpperCase()}] ${i.title}`).join("\n") || "None"}

Affected carriers operating this lane (${affectedCarriers.length}):
${affectedCarriers.join("\n") || "None currently affected"}

Total active disruptions: ${newsItems.filter(i => i.severity === "critical").length} critical, ${newsItems.filter(i => i.severity === "warning").length} warning
`.trim();
}

// ─── LLM forecast for a single lane ──────────────────────────────────────────

async function generateLaneForecast(lane: FreightLane): Promise<{
  probability30d: number;
  probability60d: number;
  trend: "rising" | "stable" | "falling";
  keyRisks: string[];
  confidence: "high" | "medium" | "low";
  summary: string;
}> {
  const context = buildForecastContext(lane);
  const zones = (lane.zones ?? "").split(",").map(z => z.trim()).filter(Boolean);
  const seasonal = seasonalRiskBonus(new Date().getMonth() + 1, zones);

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a freight risk analyst specialising in geopolitical and supply chain disruption forecasting. 
Given current market signals, estimate the probability (0-100) that the specified freight lane will experience a SIGNIFICANT disruption (>5 day delay or >15% cost increase) in the next 30 days and 60 days.

Be realistic and calibrated:
- 0-20: Very low risk, no significant signals
- 20-40: Low risk, minor signals present
- 40-60: Moderate risk, clear warning signals
- 60-80: High risk, active disruptions or strong indicators
- 80-100: Critical risk, severe ongoing disruption

The 60-day probability should generally be higher than 30-day (more time = more exposure).
Seasonal adjustment already applied: +${seasonal} baseline points for this lane.

Return valid JSON only.`,
        },
        {
          role: "user",
          content: `${context}

Return a JSON object with exactly these fields:
{
  "probability30d": <integer 0-100>,
  "probability60d": <integer 0-100>,
  "trend": <"rising"|"stable"|"falling">,
  "keyRisks": [<up to 4 short risk factor strings, max 10 words each>],
  "confidence": <"high"|"medium"|"low">,
  "summary": <one sentence max 25 words explaining the forecast>
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lane_forecast",
          strict: true,
          schema: {
            type: "object",
            properties: {
              probability30d: { type: "integer" },
              probability60d: { type: "integer" },
              trend: { type: "string", enum: ["rising", "stable", "falling"] },
              keyRisks: { type: "array", items: { type: "string" } },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              summary: { type: "string" },
            },
            required: ["probability30d", "probability60d", "trend", "keyRisks", "confidence", "summary"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content ?? "{}";
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const parsed = JSON.parse(content);

    // Clamp probabilities to 0–100 and apply seasonal floor
    const p30 = Math.max(seasonal, Math.min(100, Math.round(parsed.probability30d ?? 30)));
    const p60 = Math.max(p30, Math.min(100, Math.round(parsed.probability60d ?? p30 + 10)));

    return {
      probability30d: p30,
      probability60d: p60,
      trend: (["rising", "stable", "falling"].includes(parsed.trend) ? parsed.trend : "stable") as "rising" | "stable" | "falling",
      keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks.slice(0, 4) : [],
      confidence: (["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium") as "high" | "medium" | "low",
      summary: typeof parsed.summary === "string" ? parsed.summary : `Risk forecast for ${lane.name}.`,
    };
  } catch (err) {
    console.warn(`[predictiveRisk] LLM forecast failed for ${lane.name}:`, err);
    // Fallback: derive from live signals
    const newsItems = getNewsCache();
    const criticalCount = newsItems.filter(i => i.severity === "critical").length;
    const p30 = Math.min(100, seasonal + criticalCount * 8);
    return {
      probability30d: p30,
      probability60d: Math.min(100, p30 + 10),
      trend: "stable",
      keyRisks: criticalCount > 0 ? [`${criticalCount} active critical disruptions`] : ["No current signals"],
      confidence: "low",
      summary: `Forecast based on ${criticalCount} active disruptions. LLM unavailable.`,
    };
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getRecentForecast(laneId: number): Promise<RiskForecast | null> {
  const db = await getDb();
  if (!db) return null;

  const cutoff = new Date(Date.now() - FORECAST_CACHE_TTL_MS);
  const rows = await db
    .select()
    .from(riskForecasts)
    .where(eq(riskForecasts.laneId, laneId))
    .orderBy(desc(riskForecasts.generatedAt))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];
  if (new Date(row.generatedAt) < cutoff) return null;
  return row;
}

async function saveForecast(laneId: number, laneName: string, forecast: {
  probability30d: number;
  probability60d: number;
  trend: "rising" | "stable" | "falling";
  keyRisks: string[];
  confidence: "high" | "medium" | "low";
  summary: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(riskForecasts).values({
    laneId,
    laneName,
    probability30d: forecast.probability30d,
    probability60d: forecast.probability60d,
    trend: forecast.trend,
    keyRisks: JSON.stringify(forecast.keyRisks),
    confidence: forecast.confidence,
    summary: forecast.summary,
  });
}

async function getSparkline(laneId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(riskForecasts)
    .where(eq(riskForecasts.laneId, laneId))
    .orderBy(desc(riskForecasts.generatedAt))
    .limit(7);

  return rows.reverse().map(r => r.probability30d);
}

// ─── Compute full LaneForecast ────────────────────────────────────────────────

async function computeForecast(lane: FreightLane, forceRefresh = false): Promise<LaneForecast> {
  const zones = (lane.zones ?? "").split(",").map(z => z.trim()).filter(Boolean);

  // Try DB cache first
  if (!forceRefresh) {
    const cached = await getRecentForecast(lane.id);
    if (cached) {
      const sparkline = await getSparkline(lane.id);
      return {
        laneId: lane.id,
        laneName: lane.name,
        originPort: lane.originPort,
        destinationPort: lane.destinationPort,
        zones,
        probability30d: cached.probability30d,
        probability60d: cached.probability60d,
        trend: cached.trend,
        keyRisks: JSON.parse(cached.keyRisks ?? "[]"),
        confidence: cached.confidence,
        summary: cached.summary ?? "",
        generatedAt: cached.generatedAt.toISOString(),
        sparkline,
      };
    }
  }

  // Generate new forecast
  const forecast = await generateLaneForecast(lane);
  await saveForecast(lane.id, lane.name, forecast);
  const sparkline = await getSparkline(lane.id);

  return {
    laneId: lane.id,
    laneName: lane.name,
    originPort: lane.originPort,
    destinationPort: lane.destinationPort,
    zones,
    ...forecast,
    generatedAt: new Date().toISOString(),
    sparkline,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const predictiveRiskRouter = router({
  /**
   * Returns forecasts for all 20 lanes, sorted by 30d probability descending.
   * Uses DB cache (30 min TTL). forceRefresh bypasses cache.
   */
  getAllForecasts: publicProcedure
    .input(z.object({ forceRefresh: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { forecasts: [], generatedAt: new Date().toISOString() };

      const lanes = await db.select().from(freightLanes);
      const forceRefresh = input?.forceRefresh ?? false;

      // Process in batches of 5 to avoid LLM rate limits
      const results: LaneForecast[] = [];
      const batchSize = 5;
      for (let i = 0; i < lanes.length; i += batchSize) {
        const batch = lanes.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((lane: FreightLane) => computeForecast(lane, forceRefresh))
        );
        results.push(...batchResults);
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < lanes.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Sort by 30d probability descending
      results.sort((a, b) => b.probability30d - a.probability30d);

      return {
        forecasts: results,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Returns forecast for a single lane by ID.
   */
  getForecast: publicProcedure
    .input(z.object({
      laneId: z.number().int().positive(),
      forceRefresh: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db.select().from(freightLanes).where(eq(freightLanes.id, input.laneId));
      if (rows.length === 0) return null;

      return computeForecast(rows[0], input.forceRefresh);
    }),
});
