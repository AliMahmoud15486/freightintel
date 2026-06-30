/* analyst.ts — Freight Intel
 *
 * AI Supply-Chain Analyst:
 *   - briefing: an auto-generated daily brief over the current live state.
 *   - ask:      a grounded Q&A endpoint answering merchant questions using the
 *               same live context (prices, disruptions, carriers, risk lanes).
 *
 * Both are grounded in buildLiveContext() so answers reflect real signals.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { buildLiveContext, formatContextForLLM } from "../_core/liveContext";

// ─── Briefing types + cache ──────────────────────────────────────────────────

export interface DailyBriefing {
  headline: string;
  summary: string;
  keyPoints: string[];
  watchItems: string[];
  overallRisk: "low" | "elevated" | "high";
  criticalCount: number;
  warningCount: number;
  generatedAt: string;
}

interface BriefingCache {
  data: DailyBriefing;
  fetchedAt: number;
}

let briefingCache: BriefingCache | null = null;
const BRIEFING_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let inflightBriefing: Promise<DailyBriefing> | null = null;

export function _resetAnalystCache() {
  briefingCache = null;
  inflightBriefing = null;
}

function normalizeRisk(value: unknown): DailyBriefing["overallRisk"] {
  return value === "high" || value === "elevated" || value === "low"
    ? value
    : "elevated";
}

function toStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map(v => v.trim())
    .slice(0, max);
}

async function buildBriefing(): Promise<DailyBriefing> {
  const ctx = await buildLiveContext();
  const contextBlock = formatContextForLLM(ctx);

  const prompt = `You are the lead supply-chain analyst for a retail margin-intelligence platform. Using ONLY the live data below, write a concise morning brief for e-commerce merchants.

${contextBlock}

Respond with ONLY a valid JSON object (no markdown) with this exact shape:
{
  "headline": "punchy one-line headline (max 90 chars)",
  "summary": "2-3 sentence plain-English overview of what matters today for retail margins",
  "keyPoints": ["3-5 short bullet strings, each a concrete observation tied to the data"],
  "watchItems": ["2-4 short strings naming things to watch in the next 24-72h"],
  "overallRisk": "low | elevated | high"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a concise, data-grounded supply-chain analyst. Respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" } as never,
    });

    const raw = response?.choices?.[0]?.message?.content ?? "{}";
    const content = typeof raw === "string" ? raw : JSON.stringify(raw);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = /\{[\s\S]*\}/.exec(content);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return {
      headline:
        typeof parsed.headline === "string" && parsed.headline.trim()
          ? parsed.headline.trim().slice(0, 120)
          : "Supply-chain conditions update",
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Live market and disruption signals are summarized below.",
      keyPoints: toStringArray(parsed.keyPoints, 5),
      watchItems: toStringArray(parsed.watchItems, 4),
      overallRisk: normalizeRisk(parsed.overallRisk),
      criticalCount: ctx.disruptions.criticalCount,
      warningCount: ctx.disruptions.warningCount,
      generatedAt: ctx.generatedAt,
    };
  } catch {
    // LLM unavailable — return a deterministic fallback from the raw context.
    const overall: DailyBriefing["overallRisk"] =
      ctx.disruptions.criticalCount >= 3
        ? "high"
        : ctx.disruptions.criticalCount >= 1
          ? "elevated"
          : "low";
    return {
      headline: `${ctx.disruptions.criticalCount} critical supply-chain signals active`,
      summary: `Brent is $${ctx.prices.brent}/bbl with ${ctx.disruptions.criticalCount} critical and ${ctx.disruptions.warningCount} warning disruption signals. AI summary is temporarily unavailable.`,
      keyPoints: ctx.disruptions.topItems
        .slice(0, 4)
        .map(i => `${i.severity.toUpperCase()}: ${i.title}`),
      watchItems: ctx.topRiskLanes
        .slice(0, 3)
        .map(l => `${l.laneName} — ${l.probability30d}% 30-day risk`),
      overallRisk: overall,
      criticalCount: ctx.disruptions.criticalCount,
      warningCount: ctx.disruptions.warningCount,
      generatedAt: ctx.generatedAt,
    };
  }
}

/** Coalesce concurrent refreshes onto a single in-flight build (singleflight). */
function refreshBriefing(): Promise<DailyBriefing> {
  if (!inflightBriefing) {
    const p = buildBriefing().then(data => {
      briefingCache = { data, fetchedAt: Date.now() };
      return data;
    });
    inflightBriefing = p;
    void p.finally(() => {
      if (inflightBriefing === p) inflightBriefing = null;
    });
  }
  return inflightBriefing;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const analystRouter = router({
  /** Auto-generated daily brief over the current live state (cached 6h, SWR). */
  briefing: publicProcedure
    .input(z.object({ forceRefresh: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const now = Date.now();
      const forceRefresh = input?.forceRefresh ?? false;

      if (forceRefresh) {
        inflightBriefing = null;
        return refreshBriefing();
      }
      if (briefingCache && now - briefingCache.fetchedAt < BRIEFING_TTL_MS) {
        return briefingCache.data; // fresh
      }
      if (briefingCache) {
        refreshBriefing().catch(() => {}); // stale: serve now, refresh in bg
        return briefingCache.data;
      }
      return refreshBriefing(); // cold
    }),

  /** Grounded Q&A — answers a merchant question using the live context. */
  ask: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(1000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(4000),
            })
          )
          .max(10)
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const ctx = await buildLiveContext();
      const contextBlock = formatContextForLLM(ctx);

      const systemPrompt = `You are the AI supply-chain analyst for a retail margin-intelligence platform. Answer the merchant's question clearly and concisely (max ~150 words), grounded in the LIVE DATA below. Prefer concrete numbers from the data. If the data does not cover the question, say so briefly rather than inventing figures. Do not use markdown headings.

${contextBlock}`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.history ?? []).map(m => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content: input.question },
      ];

      try {
        const response = await invokeLLM({ messages });
        const content = response.choices?.[0]?.message?.content;
        const answer = typeof content === "string" ? content.trim() : "";
        return {
          answer:
            answer ||
            "I couldn't generate an answer just now. Please try again.",
          generatedAt: ctx.generatedAt,
        };
      } catch {
        return {
          answer:
            "The analyst is temporarily unavailable. Please try again in a moment.",
          generatedAt: ctx.generatedAt,
        };
      }
    }),
});
