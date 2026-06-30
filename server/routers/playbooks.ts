/* playbooks.ts — Freight Intel
 *
 * Prescriptive Action Playbooks: turns the current live disruption picture into
 * concrete, quantified mitigation recommendations a merchant can act on
 * (switch carrier, pre-buy inventory, reprice, reroute, hedge fuel).
 *
 * Grounded in buildLiveContext(); cached 30 min with singleflight + SWR.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { buildLiveContext, formatContextForLLM } from "../_core/liveContext";

// ─── Types + cache ───────────────────────────────────────────────────────────

const ACTION_TYPES = [
  "switch_carrier",
  "pre_buy",
  "reprice",
  "reroute",
  "hedge",
  "monitor",
] as const;
type ActionType = (typeof ACTION_TYPES)[number];

export interface PlaybookAction {
  type: ActionType;
  description: string;
  estimatedImpact: string; // e.g. "+$0.40/unit, -9 days" or "protects ~2.1pp margin"
}

export interface Playbook {
  id: string;
  trigger: string; // the disruption / signal driving this
  affectedArea: string; // lane, category, or region affected
  severity: "critical" | "warning" | "info";
  actions: PlaybookAction[];
  rationale: string;
  confidence: "high" | "medium" | "low";
}

export interface PlaybooksResult {
  playbooks: Playbook[];
  disruptionCount: number;
  generatedAt: string;
}

interface PlaybooksCache {
  data: PlaybooksResult;
  fetchedAt: number;
}

let playbooksCache: PlaybooksCache | null = null;
const PLAYBOOKS_TTL_MS = 30 * 60 * 1000; // 30 minutes
let inflightPlaybooks: Promise<PlaybooksResult> | null = null;

export function _resetPlaybooksCache() {
  playbooksCache = null;
  inflightPlaybooks = null;
}

// ─── Normalization helpers ───────────────────────────────────────────────────

function normalizeActionType(value: unknown): ActionType {
  return ACTION_TYPES.includes(value as ActionType)
    ? (value as ActionType)
    : "monitor";
}

function normalizeSeverity(value: unknown): Playbook["severity"] {
  return value === "critical" || value === "warning" || value === "info"
    ? value
    : "warning";
}

function normalizeConfidence(value: unknown): Playbook["confidence"] {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function normalizeActions(value: unknown): PlaybookAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map(a => ({
      type: normalizeActionType(a.type),
      description:
        typeof a.description === "string" ? a.description.trim() : "",
      estimatedImpact:
        typeof a.estimatedImpact === "string" ? a.estimatedImpact.trim() : "",
    }))
    .filter(a => a.description.length > 0)
    .slice(0, 4);
}

/** Validates and normalizes the raw LLM output into typed playbooks. */
export function normalizePlaybooks(parsed: unknown): Playbook[] {
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { playbooks?: unknown })?.playbooks)
      ? (parsed as { playbooks: unknown[] }).playbooks
      : [];

  return arr
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p, i) => ({
      id: `pb-${i}`,
      trigger: typeof p.trigger === "string" ? p.trigger.trim() : "",
      affectedArea:
        typeof p.affectedArea === "string" ? p.affectedArea.trim() : "",
      severity: normalizeSeverity(p.severity),
      actions: normalizeActions(p.actions),
      rationale: typeof p.rationale === "string" ? p.rationale.trim() : "",
      confidence: normalizeConfidence(p.confidence),
    }))
    .filter(p => p.trigger.length > 0 && p.actions.length > 0)
    .slice(0, 8);
}

async function buildPlaybooks(): Promise<PlaybooksResult> {
  const ctx = await buildLiveContext();
  const contextBlock = formatContextForLLM(ctx);
  const disruptionCount =
    ctx.disruptions.criticalCount + ctx.disruptions.warningCount;

  // Nothing to mitigate — skip the LLM call entirely.
  if (disruptionCount === 0 && ctx.affectedCarriers.length === 0) {
    return { playbooks: [], disruptionCount, generatedAt: ctx.generatedAt };
  }

  const prompt = `You are a supply-chain risk advisor for e-commerce merchants. Using ONLY the live data below, produce prescriptive mitigation playbooks for the most material disruptions affecting retail import margins.

${contextBlock}

For each material disruption, output a playbook with concrete actions. Allowed action types: ${ACTION_TYPES.join(", ")}.
Quantify impact wherever the data allows (e.g. "switch to a less-affected carrier: +$0.30/unit but -9 days", "pre-buy 6 weeks of inventory to avoid a 14-day delay", "reprice +2% to protect ~2pp margin").

Respond with ONLY a valid JSON object (no markdown):
{
  "playbooks": [
    {
      "trigger": "the disruption/signal driving this (short)",
      "affectedArea": "lane, category, or region affected",
      "severity": "critical | warning | info",
      "actions": [
        { "type": "one of the allowed types", "description": "concrete action", "estimatedImpact": "quantified where possible" }
      ],
      "rationale": "1-2 sentence why",
      "confidence": "high | medium | low"
    }
  ]
}
Return at most 6 playbooks, ranked most material first.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a prescriptive supply-chain risk advisor. Respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" } as never,
    });

    const raw = response?.choices?.[0]?.message?.content ?? "{}";
    const content = typeof raw === "string" ? raw : JSON.stringify(raw);
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = /\{[\s\S]*\}/.exec(content);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return {
      playbooks: normalizePlaybooks(parsed),
      disruptionCount,
      generatedAt: ctx.generatedAt,
    };
  } catch {
    return { playbooks: [], disruptionCount, generatedAt: ctx.generatedAt };
  }
}

/** Coalesce concurrent refreshes onto a single in-flight build (singleflight). */
function refreshPlaybooks(): Promise<PlaybooksResult> {
  if (!inflightPlaybooks) {
    const p = buildPlaybooks().then(data => {
      playbooksCache = { data, fetchedAt: Date.now() };
      return data;
    });
    inflightPlaybooks = p;
    void p.finally(() => {
      if (inflightPlaybooks === p) inflightPlaybooks = null;
    });
  }
  return inflightPlaybooks;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const playbooksRouter = router({
  /** Prescriptive mitigation playbooks for current disruptions (cached 30m, SWR). */
  get: publicProcedure
    .input(z.object({ forceRefresh: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const now = Date.now();
      const forceRefresh = input?.forceRefresh ?? false;

      if (forceRefresh) {
        inflightPlaybooks = null;
        return refreshPlaybooks();
      }
      if (playbooksCache && now - playbooksCache.fetchedAt < PLAYBOOKS_TTL_MS) {
        return playbooksCache.data; // fresh
      }
      if (playbooksCache) {
        refreshPlaybooks().catch(() => {}); // stale: serve now, refresh in bg
        return playbooksCache.data;
      }
      return refreshPlaybooks(); // cold
    }),
});
