/**
 * Margin Impact Calculator router
 *
 * getDefaults  → returns live oil price, freight change %, disruption level
 *                to pre-fill the calculator sliders with today's real conditions
 * getInsight   → LLM-generated 1-line recommendation based on the calculation result
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart: { result: Array<{ meta: { regularMarketPrice: number } }> | null };
    };
    return json.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

// ─── router ───────────────────────────────────────────────────────────────────

export const marginCalculatorRouter = router({
  /**
   * Returns live defaults for the calculator sliders:
   * - oilPrice: live WTI crude ($/bbl)
   * - freightSurcharge: derived from BDRY + ZIM daily change (0–50 scale)
   * - disruptionLevel: 0=Low, 1=Medium, 2=High (derived from news disruption count)
   */
  getDefaults: publicProcedure.query(async () => {
    const [wti, bdry, zim] = await Promise.all([
      fetchYahooPrice("CL=F"),
      fetchYahooPrice("BDRY"),
      fetchYahooPrice("ZIM"),
    ]);

    const oilPrice = wti ?? 82.0;

    // Freight surcharge: map BDRY price to a 0–50% surcharge scale
    // BDRY typically trades 8–20; below 10 = low freight, above 16 = high freight
    const bdryPrice = bdry ?? 12.0;
    const freightSurcharge = Math.min(
      50,
      Math.max(0, Math.round((bdryPrice - 8) * 2.5))
    );

    // ZIM price proxy for disruption: below $20 = low, $20–35 = medium, above $35 = high
    const zimPrice = zim ?? 25.0;
    const disruptionLevel = zimPrice > 35 ? 2 : zimPrice > 20 ? 1 : 0;

    return {
      oilPrice: Math.round(oilPrice * 100) / 100,
      freightSurcharge,
      disruptionLevel,
      lastUpdated: new Date().toISOString(),
    };
  }),

  /**
   * LLM-generated 1-line insight for the current calculation.
   * Input: the full calculation result so the LLM can reason about it.
   */
  getInsight: publicProcedure
    .input(
      z.object({
        productName: z.string(),
        category: z.string(),
        baseMargin: z.number(),
        currentMargin: z.number(),
        delta: z.number(),
        revenueAtRisk: z.number(),
        oilPrice: z.number(),
        freightSurcharge: z.number(),
        disruptionLevel: z.number(), // 0=Low, 1=Medium, 2=High
        origin: z.string(),
      })
    )
    .query(async ({ input }) => {
      const disruptionLabel =
        ["Low", "Medium", "High"][input.disruptionLevel] ?? "Medium";
      const prompt = `You are a supply chain margin analyst. A merchant is selling "${input.productName}" (${input.category}) sourced from ${input.origin}.

Current conditions:
- Base margin: ${input.baseMargin.toFixed(1)}%
- Current margin after freight/oil/disruption: ${input.currentMargin.toFixed(1)}%
- Margin erosion: ${Math.abs(input.delta).toFixed(1)} percentage points
- Revenue at risk this month: $${input.revenueAtRisk.toLocaleString()}
- Oil price: $${input.oilPrice}/bbl
- Freight surcharge: ${input.freightSurcharge}%
- Disruption severity: ${disruptionLabel}

Write a single, concise, actionable sentence (max 180 characters) advising the merchant on the most impactful action they can take right now to protect their margin. Be specific — mention the product category, origin, or a concrete action.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a concise supply chain margin analyst. Respond with a single sentence only.",
            },
            { role: "user", content: prompt },
          ],
        });
        const content = response.choices?.[0]?.message?.content;
        const text = typeof content === "string" ? content.trim() : "";
        return { insight: text || null };
      } catch {
        return { insight: null };
      }
    }),
});
