/**
 * Carrier Recommendation Engine
 *
 * Scores and ranks shipping carriers for a user-specified freight lane.
 * Risk score is computed from four signals:
 *   40% — current disruption severity from ShippingLines live data
 *   30% — number of active news items mentioning the carrier
 *   20% — disruption zone overlap with the lane's zones
 *   10% — static reliability score (seeded per carrier-lane)
 *
 * An LLM call generates a 1–2 sentence plain-English rationale for each carrier.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  freightLanes,
  laneCarriers,
  FreightLane,
  LaneCarrier,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  getNewsCache,
  getShippingLinesCache,
  NewsItem,
  CarrierStatus,
} from "./news";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CarrierScore {
  carrierId: string;
  carrierName: string;
  riskScore: number; // 0–100, lower = safer
  riskLevel: "low" | "medium" | "high" | "critical";
  estimatedTransitDays: number;
  delayDays: number; // additional days due to disruption
  costIndex: number; // 1=cheap, 2=mid, 3=premium
  reliabilityScore: number; // 0–100 static baseline
  rationale: string; // LLM-generated plain-English explanation
  isBestOption: boolean;
  disruptionReasons: string[];
}

export interface RecommendationResult {
  lane: {
    id: number;
    name: string;
    originPort: string;
    destinationPort: string;
    baseTransitDays: number;
  };
  carriers: CarrierScore[];
  generatedAt: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface RecCache {
  result: RecommendationResult;
  fetchedAt: number;
}

const recCache = new Map<string, RecCache>();
const REC_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Per-key singleflight so concurrent callers for the same lane pair share one
// LLM-scored computation instead of each re-running it against a cold cache.
const inflightRec = new Map<string, Promise<RecommendationResult | null>>();

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function severityToDisruptionScore(
  severity: "critical" | "warning" | "none"
): number {
  if (severity === "critical") return 100;
  if (severity === "warning") return 50;
  return 0;
}

function riskLevelFromScore(
  score: number
): "low" | "medium" | "high" | "critical" {
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

// ─── Main scoring function ────────────────────────────────────────────────────

async function scoreCarriersForLane(
  lane: FreightLane,
  carriers: LaneCarrier[]
): Promise<RecommendationResult | null> {
  if (carriers.length === 0) return null;

  // Get live data from existing caches
  const newsItems: NewsItem[] = getNewsCache();
  const shippingLines: CarrierStatus[] = getShippingLinesCache();

  // Parse lane zones
  const laneZones: string[] = (lane.zones ?? "")
    .split(",")
    .map((z: string) => z.trim())
    .filter(Boolean);

  // Score each carrier
  const scored: CarrierScore[] = carriers.map((carrier: LaneCarrier) => {
    // Signal A (40%): Disruption severity from ShippingLines live data
    const liveStatus = shippingLines.find(
      (s: CarrierStatus) =>
        s.id === carrier.carrierId ||
        s.name.toLowerCase() === carrier.carrierName.toLowerCase()
    );
    const severityScore = liveStatus
      ? severityToDisruptionScore(liveStatus.severity)
      : 0;
    const signalA = severityScore * 0.4;

    // Signal B (30%): Count of news items mentioning this carrier
    const carrierMentions = newsItems.filter((item: NewsItem) => {
      const text = `${item.title} ${item.summary}`.toLowerCase();
      return (
        text.includes(carrier.carrierName.toLowerCase()) ||
        text.includes(carrier.carrierId.toLowerCase())
      );
    });
    const mentionScore = Math.min(carrierMentions.length / 3, 1) * 100;
    const signalB = mentionScore * 0.3;

    // Signal C (20%): Zone overlap — does the lane pass through disrupted zones?
    const disruptedZones: string[] = newsItems
      .filter(
        (item: NewsItem) =>
          item.severity === "critical" || item.severity === "warning"
      )
      .flatMap((item: NewsItem) => item.tags ?? [])
      .map((t: string) => t.toLowerCase());

    const zoneOverlapCount = laneZones.filter((zone: string) =>
      disruptedZones.some(
        (dz: string) => dz.includes(zone) || zone.includes(dz)
      )
    ).length;
    const zoneScore =
      laneZones.length > 0
        ? Math.min(zoneOverlapCount / laneZones.length, 1) * 100
        : 0;
    const signalC = zoneScore * 0.2;

    // Signal D (10%): Inverse of static reliability
    const reliabilityRisk = 100 - carrier.reliabilityScore;
    const signalD = reliabilityRisk * 0.1;

    const riskScore = Math.round(signalA + signalB + signalC + signalD);
    const riskLevel = riskLevelFromScore(riskScore);
    const delayDays = delayDaysFromRisk(riskScore, carrier.transitDays);

    const disruptionReasons: string[] = [];
    if (liveStatus?.affected && liveStatus.reason) {
      disruptionReasons.push(liveStatus.reason);
    }
    if (carrierMentions.length > 0) {
      disruptionReasons.push(
        `${carrierMentions.length} recent news item${carrierMentions.length > 1 ? "s" : ""} mention this carrier`
      );
    }
    if (zoneOverlapCount > 0) {
      disruptionReasons.push(
        `Lane passes through ${zoneOverlapCount} disrupted zone${zoneOverlapCount > 1 ? "s" : ""}`
      );
    }

    return {
      carrierId: carrier.carrierId,
      carrierName: carrier.carrierName,
      riskScore,
      riskLevel,
      estimatedTransitDays: carrier.transitDays + delayDays,
      delayDays,
      costIndex: carrier.costIndex,
      reliabilityScore: carrier.reliabilityScore,
      rationale: "",
      isBestOption: false,
      disruptionReasons,
    };
  });

  // Sort: lowest risk first, then fastest transit, then lowest cost
  scored.sort((a, b) => {
    if (a.riskScore !== b.riskScore) return a.riskScore - b.riskScore;
    if (a.estimatedTransitDays !== b.estimatedTransitDays)
      return a.estimatedTransitDays - b.estimatedTransitDays;
    return a.costIndex - b.costIndex;
  });

  if (scored.length > 0) scored[0].isBestOption = true;

  // LLM rationale — generate for all carriers in one call
  const carrierSummaries = scored
    .map(
      c =>
        `${c.carrierName}: riskScore=${c.riskScore}, riskLevel=${c.riskLevel}, transitDays=${c.estimatedTransitDays} (delay +${c.delayDays}d), costIndex=${c.costIndex}, reasons: ${c.disruptionReasons.join("; ") || "none"}`
    )
    .join("\n");

  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a freight intelligence analyst. For each carrier on the lane "${lane.name}", write exactly ONE sentence (max 20 words) explaining their current status and recommendation. Be specific and actionable. Return a JSON object where keys are carrier names and values are the single-sentence rationale strings.`,
        },
        {
          role: "user",
          content: `Lane: ${lane.name} (${lane.originPort} → ${lane.destinationPort})\n\nCarrier data:\n${carrierSummaries}\n\nReturn JSON: {"CarrierName": "one sentence rationale", ...}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "carrier_rationales",
          strict: false,
          schema: {
            type: "object",
            additionalProperties: { type: "string" },
          },
        },
      },
    });

    const rawContent = llmResponse.choices?.[0]?.message?.content ?? "{}";
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const rationales: Record<string, string> = JSON.parse(content);

    for (const c of scored) {
      c.rationale =
        rationales[c.carrierName] ??
        rationales[c.carrierId] ??
        "No disruption data available for this carrier on this lane.";
    }
  } catch {
    // Fallback rationales if LLM fails
    for (const c of scored) {
      if (c.riskLevel === "low") {
        c.rationale = `${c.carrierName} shows no active disruptions on this lane — recommended option.`;
      } else if (c.riskLevel === "medium") {
        c.rationale = `${c.carrierName} has minor disruptions; expect up to ${c.delayDays} additional days.`;
      } else {
        c.rationale = `${c.carrierName} is significantly affected; consider alternatives to avoid delays.`;
      }
    }
  }

  return {
    lane: {
      id: lane.id,
      name: lane.name,
      originPort: lane.originPort,
      destinationPort: lane.destinationPort,
      baseTransitDays: lane.baseTransitDays,
    },
    carriers: scored,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const carrierRecommendationRouter = router({
  /**
   * Returns all available freight lanes for the query form dropdowns.
   */
  getLanes: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { lanes: [], origins: [], destinations: [] };

    const lanes = await db.select().from(freightLanes);
    const origins = Array.from(
      new Set(lanes.map((l: FreightLane) => l.originRegion))
    ).sort() as string[];
    const destinations = Array.from(
      new Set(lanes.map((l: FreightLane) => l.destinationRegion))
    ).sort() as string[];
    return { lanes, origins, destinations };
  }),

  /**
   * Scores and ranks carriers for a given origin + destination region pair.
   */
  recommend: publicProcedure
    .input(
      z.object({
        originRegion: z.string().min(1),
        destinationRegion: z.string().min(1),
        cargoType: z
          .enum(["general", "hazmat", "refrigerated", "bulk", "high-value"])
          .default("general"),
        urgency: z.enum(["standard", "express"]).default("standard"),
        containerSize: z.enum(["20ft", "40ft", "lcl"]).default("40ft"),
        forceRefresh: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = `${input.originRegion}:${input.destinationRegion}`;
      const now = Date.now();

      if (input.forceRefresh) {
        // Force a genuinely fresh computation past any in-flight call.
        inflightRec.delete(cacheKey);
        return refreshRec(
          cacheKey,
          input.originRegion,
          input.destinationRegion
        );
      }

      const cached = recCache.get(cacheKey);
      if (cached && now - cached.fetchedAt < REC_CACHE_TTL_MS) {
        return cached.result; // fresh
      }
      if (cached) {
        // Stale — serve stale instantly and refresh in the background.
        refreshRec(cacheKey, input.originRegion, input.destinationRegion).catch(
          () => {}
        );
        return cached.result;
      }

      // Cold — coalesce concurrent callers for this lane pair onto one compute.
      return refreshRec(cacheKey, input.originRegion, input.destinationRegion);
    }),
});

/** Coalesce concurrent computations for one lane pair onto a single run. */
function refreshRec(
  cacheKey: string,
  originRegion: string,
  destinationRegion: string
): Promise<RecommendationResult | null> {
  const existing = inflightRec.get(cacheKey);
  if (existing) return existing;

  const p = computeRec(originRegion, destinationRegion).then(result => {
    if (result) {
      recCache.set(cacheKey, { result, fetchedAt: Date.now() });
    }
    return result;
  });
  inflightRec.set(cacheKey, p);
  void p.finally(() => {
    if (inflightRec.get(cacheKey) === p) inflightRec.delete(cacheKey);
  });
  return p;
}

async function computeRec(
  originRegion: string,
  destinationRegion: string
): Promise<RecommendationResult | null> {
  const db = await getDb();
  if (!db) return null;

  // Find the best matching lane
  const allLanes = await db.select().from(freightLanes);
  const matchingLane = allLanes.find(
    (l: FreightLane) =>
      l.originRegion === originRegion &&
      l.destinationRegion === destinationRegion
  );

  if (!matchingLane) return null;

  const carriers = await db
    .select()
    .from(laneCarriers)
    .where(eq(laneCarriers.laneId, matchingLane.id));

  return scoreCarriersForLane(matchingLane, carriers);
}
