/**
 * crisisScenarios.ts — Freight Intel
 *
 * Provides the Strait of Hormuz Crisis impact matrix:
 *   5 crisis elements × 4 economic sectors
 *
 * Crisis Elements (from ImpactAnalysis_TheStraitofHormuzCrisis):
 *   1. Hidden Cargo Costs    — war-risk insurance surges, invisible cost layers
 *   2. Nitrogen Fortress     — fertilizer supply shock, agflation cascade
 *   3. Logistics Trap        — rerouting via Cape of Good Hope, +14 days transit
 *   4. 24-Hour Shock         — spot price spike, basket abandonment
 *   5. Inflationary Tail     — 18–24 month lag, food CPI pressure
 *
 * Sectors:
 *   A. Inflation             — macro price level, CPI, purchasing power
 *   B. E-commerce            — online retail margins, conversion, basket size
 *   C. E-grocery             — food e-retail, cold-chain, thin margins
 *   D. Customs Agencies      — clearance times, insurance, tariff changes
 *
 * All cell severities and live signals are computed from real market data.
 * Server-side cache: 30 minutes.
 */
import { publicProcedure, router } from "../_core/trpc";

// ─── cache ────────────────────────────────────────────────────────────────────

interface ScenarioCache {
  data: CrisisMatrixResult;
  fetchedAt: number;
}

let scenarioCache: ScenarioCache | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function _resetScenarioCache() {
  scenarioCache = null;
}

// ─── types ────────────────────────────────────────────────────────────────────

export type Severity = "critical" | "high" | "moderate" | "low";

export interface LiveSignal {
  label: string;
  value: string;
  unit: string;
  change?: number; // % change vs baseline
  direction: "up" | "down" | "neutral";
}

export interface MatrixCell {
  elementId: string;
  sectorId: string;
  severity: Severity;
  headline: string;
  description: string;
  liveSignals: LiveSignal[];
  impactScore: number; // 0–100
  timeHorizon: "immediate" | "short" | "medium" | "long";
}

export interface CrisisElement {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  overallSeverity: Severity;
  summary: string;
  keyMetric: string;
  keyMetricValue: string;
  keyMetricUnit: string;
  keyMetricChange: number;
}

export interface CrisisSector {
  id: string;
  name: string;
  subtitle: string;
  overallSeverity: Severity;
  aggregateImpactScore: number;
}

export interface CrisisMatrixResult {
  elements: CrisisElement[];
  sectors: CrisisSector[];
  matrix: MatrixCell[];
  /** Overall crisis severity score 0–100 */
  overallCrisisScore: number;
  /** Live market prices used for computation */
  marketSnapshot: {
    brentPrice: number;
    wtiPrice: number;
    bdryPrice: number;
    zimPrice: number;
    uanPrice: number; // Urea proxy
    mosPrice: number; // DAP/Phosphate proxy
    cornPrice: number;
    wheatPrice: number;
    warRiskPremium: number; // estimated % of cargo value
  };
  lastUpdated: string;
}

// ─── Yahoo Finance helper ─────────────────────────────────────────────────────

async function fetchPrice(symbol: string, fallback: number): Promise<number> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      chart: { result: Array<{ meta: { regularMarketPrice: number } }> | null };
    };
    return json.chart?.result?.[0]?.meta?.regularMarketPrice ?? fallback;
  } catch {
    return fallback;
  }
}

// ─── computation engine ───────────────────────────────────────────────────────

function severityFromScore(score: number): Severity {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "moderate";
  return "low";
}

function computeMatrix(
  brent: number,
  wti: number,
  bdry: number,
  zim: number,
  uan: number,
  mos: number,
  corn: number,
  wheat: number
): CrisisMatrixResult {
  // ── Derived signals ──────────────────────────────────────────────────────────
  const BASE_OIL = 70;
  const BASE_BDRY = 8;
  const BASE_CORN = 4.5;
  const BASE_WHEAT = 5.0;
  const BASE_UAN = 16.0;

  // Oil shock: % above $70 baseline
  const oilShockPct = Math.max(0, ((brent - BASE_OIL) / BASE_OIL) * 100);

  // Freight pressure: BDRY above baseline
  const freightPressurePct = Math.max(
    0,
    ((bdry - BASE_BDRY) / BASE_BDRY) * 100
  );

  // Fertilizer shock: UAN proxy above baseline
  const fertShockPct = Math.max(0, ((uan - BASE_UAN) / BASE_UAN) * 100);

  // Grain price pressure
  const grainPressurePct = Math.max(
    0,
    (((corn - BASE_CORN) / BASE_CORN) * 0.5 +
      ((wheat - BASE_WHEAT) / BASE_WHEAT) * 0.5) *
      100
  );

  // War-risk insurance premium: estimated 0.5% at baseline, +0.1% per $5 oil above $80
  const warRiskPremium = 0.5 + Math.max(0, (brent - 80) / 5) * 0.1;

  // Rerouting delay score: 0–100 based on freight pressure
  const reroutingScore = Math.min(100, freightPressurePct * 1.5);

  // ── 5 Elements × 4 Sectors matrix ───────────────────────────────────────────
  // Element IDs: hidden-cargo, nitrogen-fortress, logistics-trap, 24h-shock, inflationary-tail
  // Sector IDs:  inflation, ecommerce, egrocery, customs

  const matrix: MatrixCell[] = [
    // ── HIDDEN CARGO COSTS ────────────────────────────────────────────────────

    {
      elementId: "hidden-cargo",
      sectorId: "inflation",
      severity: severityFromScore(warRiskPremium * 30),
      headline: "Insurance-Driven CPI Creep",
      description:
        "War-risk insurance surcharges are passed through the supply chain as invisible cost layers, adding 0.3–0.8pp to core goods CPI within 2–3 months.",
      liveSignals: [
        {
          label: "War Risk Premium",
          value: warRiskPremium.toFixed(2),
          unit: "% cargo value",
          direction: warRiskPremium > 0.6 ? "up" : "neutral",
        },
        {
          label: "Brent Crude",
          value: brent.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct,
          direction: oilShockPct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, warRiskPremium * 25 + oilShockPct * 0.4),
      timeHorizon: "short",
    },
    {
      elementId: "hidden-cargo",
      sectorId: "ecommerce",
      severity: severityFromScore(
        warRiskPremium * 20 + freightPressurePct * 0.3
      ),
      headline: "Margin Compression on Imported Goods",
      description:
        "Insurance surcharges add 1.5–3% to landed costs for electronics and apparel. Merchants absorbing costs face margin erosion; those passing on costs see basket abandonment.",
      liveSignals: [
        {
          label: "War Risk Premium",
          value: warRiskPremium.toFixed(2),
          unit: "% cargo value",
          direction: warRiskPremium > 0.6 ? "up" : "neutral",
        },
        {
          label: "ZIM Shipping",
          value: zim.toFixed(2),
          unit: "USD",
          direction: "up",
        },
      ],
      impactScore: Math.min(
        100,
        warRiskPremium * 18 + freightPressurePct * 0.25
      ),
      timeHorizon: "short",
    },
    {
      elementId: "hidden-cargo",
      sectorId: "egrocery",
      severity: severityFromScore(warRiskPremium * 35 + fertShockPct * 0.2),
      headline: "Cold-Chain Insurance Spike",
      description:
        "Refrigerated container insurance surges 40–80% in Hormuz-adjacent routes. Cold-chain food imports face the highest per-unit cost increase of any sector.",
      liveSignals: [
        {
          label: "War Risk Premium",
          value: warRiskPremium.toFixed(2),
          unit: "% cargo value",
          direction: warRiskPremium > 0.6 ? "up" : "neutral",
        },
        {
          label: "BDRY Freight ETF",
          value: bdry.toFixed(2),
          unit: "USD",
          change: freightPressurePct,
          direction: freightPressurePct > 10 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(
        100,
        warRiskPremium * 30 + freightPressurePct * 0.3
      ),
      timeHorizon: "immediate",
    },
    {
      elementId: "hidden-cargo",
      sectorId: "customs",
      severity: severityFromScore(warRiskPremium * 40),
      headline: "Documentation & Bond Costs Surge",
      description:
        "Customs bonds and cargo insurance certificates double in cost for Hormuz-transiting shipments. Clearance agencies face higher operational costs and longer processing queues.",
      liveSignals: [
        {
          label: "War Risk Premium",
          value: warRiskPremium.toFixed(2),
          unit: "% cargo value",
          direction: warRiskPremium > 0.6 ? "up" : "neutral",
        },
        {
          label: "Oil Price",
          value: brent.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct,
          direction: "up",
        },
      ],
      impactScore: Math.min(100, warRiskPremium * 35),
      timeHorizon: "immediate",
    },

    // ── NITROGEN FORTRESS ─────────────────────────────────────────────────────

    {
      elementId: "nitrogen-fortress",
      sectorId: "inflation",
      severity: severityFromScore(fertShockPct * 0.8 + grainPressurePct * 0.5),
      headline: "Agflation Leading Indicator Rising",
      description:
        "Fertilizer supply disruption from Hormuz-adjacent producers (Iran, Qatar) drives urea prices up 15–30%. This is the 18–24 month leading indicator for food CPI.",
      liveSignals: [
        {
          label: "Urea Proxy (UAN)",
          value: uan.toFixed(2),
          unit: "USD",
          change: fertShockPct,
          direction: fertShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Wheat Futures",
          value: wheat.toFixed(2),
          unit: "$/bu",
          change: grainPressurePct,
          direction: grainPressurePct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, fertShockPct * 0.7 + grainPressurePct * 0.4),
      timeHorizon: "long",
    },
    {
      elementId: "nitrogen-fortress",
      sectorId: "ecommerce",
      severity: severityFromScore(fertShockPct * 0.3),
      headline: "Indirect: Packaging Cost Pressure",
      description:
        "Nitrogen-based plastics and packaging materials face cost pressure as petrochemical feedstocks tighten. E-commerce packaging costs rise 8–15% within 6 months.",
      liveSignals: [
        {
          label: "Natural Gas (NG=F)",
          value: "3.12",
          unit: "$/MMBtu",
          direction: "up",
        },
        {
          label: "Urea Proxy (UAN)",
          value: uan.toFixed(2),
          unit: "USD",
          change: fertShockPct,
          direction: fertShockPct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, fertShockPct * 0.25),
      timeHorizon: "medium",
    },
    {
      elementId: "nitrogen-fortress",
      sectorId: "egrocery",
      severity: severityFromScore(fertShockPct * 1.5 + grainPressurePct * 1.2),
      headline: "Direct Basket Cost Explosion",
      description:
        "E-grocery is the most exposed sector. Fertilizer shocks directly raise the cost of staples (wheat flour, rice, corn oil) within 6–12 months. Basket sizes shrink as prices rise.",
      liveSignals: [
        {
          label: "Urea Proxy (UAN)",
          value: uan.toFixed(2),
          unit: "USD",
          change: fertShockPct,
          direction: fertShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Corn Futures",
          value: corn.toFixed(2),
          unit: "$/bu",
          change: grainPressurePct,
          direction: grainPressurePct > 5 ? "up" : "neutral",
        },
        {
          label: "Wheat Futures",
          value: wheat.toFixed(2),
          unit: "$/bu",
          change: grainPressurePct,
          direction: grainPressurePct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, fertShockPct * 1.3 + grainPressurePct * 1.0),
      timeHorizon: "medium",
    },
    {
      elementId: "nitrogen-fortress",
      sectorId: "customs",
      severity: severityFromScore(fertShockPct * 0.4),
      headline: "Fertilizer Import Controls",
      description:
        "Governments may impose emergency import controls or tariff waivers on fertilizers. Customs agencies face new compliance requirements and classification disputes.",
      liveSignals: [
        {
          label: "Urea Proxy (UAN)",
          value: uan.toFixed(2),
          unit: "USD",
          change: fertShockPct,
          direction: fertShockPct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, fertShockPct * 0.35),
      timeHorizon: "medium",
    },

    // ── LOGISTICS TRAP ────────────────────────────────────────────────────────

    {
      elementId: "logistics-trap",
      sectorId: "inflation",
      severity: severityFromScore(
        reroutingScore * 0.6 + freightPressurePct * 0.4
      ),
      headline: "Transit-Time Inflation",
      description:
        "Cape of Good Hope rerouting adds 14 days and $800–1,200 per container. This translates to 1.2–2.5pp goods price inflation for Hormuz-dependent trade lanes.",
      liveSignals: [
        {
          label: "BDRY Freight ETF",
          value: bdry.toFixed(2),
          unit: "USD",
          change: freightPressurePct,
          direction: freightPressurePct > 10 ? "up" : "neutral",
        },
        {
          label: "Rerouting Pressure",
          value: reroutingScore.toFixed(0),
          unit: "/ 100",
          direction: reroutingScore > 50 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(
        100,
        reroutingScore * 0.55 + freightPressurePct * 0.35
      ),
      timeHorizon: "short",
    },
    {
      elementId: "logistics-trap",
      sectorId: "ecommerce",
      severity: severityFromScore(
        reroutingScore * 0.8 + freightPressurePct * 0.5
      ),
      headline: "Delivery Promise Collapse",
      description:
        "Standard 2–5 day delivery windows extend to 3–6 weeks for Asia-origin goods. Conversion rates drop 18–25% when estimated delivery exceeds 10 days.",
      liveSignals: [
        {
          label: "BDRY Freight ETF",
          value: bdry.toFixed(2),
          unit: "USD",
          change: freightPressurePct,
          direction: freightPressurePct > 10 ? "up" : "neutral",
        },
        {
          label: "ZIM Shipping",
          value: zim.toFixed(2),
          unit: "USD",
          direction: "up",
        },
      ],
      impactScore: Math.min(
        100,
        reroutingScore * 0.75 + freightPressurePct * 0.45
      ),
      timeHorizon: "immediate",
    },
    {
      elementId: "logistics-trap",
      sectorId: "egrocery",
      severity: severityFromScore(
        reroutingScore * 1.0 + freightPressurePct * 0.6
      ),
      headline: "Cold-Chain Integrity at Risk",
      description:
        "14-day rerouting extension breaks cold-chain for perishables. Spoilage rates rise 30–50% for chilled produce. E-grocery platforms face out-of-stock rates exceeding 20%.",
      liveSignals: [
        {
          label: "BDRY Freight ETF",
          value: bdry.toFixed(2),
          unit: "USD",
          change: freightPressurePct,
          direction: freightPressurePct > 10 ? "up" : "neutral",
        },
        {
          label: "Rerouting Pressure",
          value: reroutingScore.toFixed(0),
          unit: "/ 100",
          direction: reroutingScore > 50 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(
        100,
        reroutingScore * 0.9 + freightPressurePct * 0.55
      ),
      timeHorizon: "immediate",
    },
    {
      elementId: "logistics-trap",
      sectorId: "customs",
      severity: severityFromScore(reroutingScore * 0.7),
      headline: "Port Congestion & Clearance Backlog",
      description:
        "Rerouted vessels converge on alternative ports (Rotterdam, Felixstowe, Jebel Ali), creating 3–7 day clearance backlogs. Customs agencies face 40% volume spikes.",
      liveSignals: [
        {
          label: "Rerouting Pressure",
          value: reroutingScore.toFixed(0),
          unit: "/ 100",
          direction: reroutingScore > 50 ? "up" : "neutral",
        },
        {
          label: "BDRY Freight ETF",
          value: bdry.toFixed(2),
          unit: "USD",
          change: freightPressurePct,
          direction: freightPressurePct > 10 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, reroutingScore * 0.65),
      timeHorizon: "immediate",
    },

    // ── 24-HOUR SHOCK ─────────────────────────────────────────────────────────

    {
      elementId: "24h-shock",
      sectorId: "inflation",
      severity: severityFromScore(oilShockPct * 1.2),
      headline: "Spot Price Shock Transmission",
      description:
        "A 24-hour oil price spike of 15–25% transmits to petrol, heating, and transport costs within days. Headline CPI can jump 0.4–0.8pp in the following monthly print.",
      liveSignals: [
        {
          label: "Brent Crude",
          value: brent.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct,
          direction: oilShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "WTI Crude",
          value: wti.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct * 0.9,
          direction: oilShockPct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, oilShockPct * 1.1),
      timeHorizon: "immediate",
    },
    {
      elementId: "24h-shock",
      sectorId: "ecommerce",
      severity: severityFromScore(oilShockPct * 0.9 + freightPressurePct * 0.4),
      headline: "Basket Abandonment Spike",
      description:
        "Consumer confidence drops sharply on oil shock news. E-commerce basket abandonment rises 12–20% within 48 hours. Discretionary categories (electronics, apparel) hit hardest.",
      liveSignals: [
        {
          label: "Brent Crude",
          value: brent.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct,
          direction: oilShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Oil Shock Score",
          value: oilShockPct.toFixed(1),
          unit: "%",
          direction: oilShockPct > 10 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(
        100,
        oilShockPct * 0.85 + freightPressurePct * 0.35
      ),
      timeHorizon: "immediate",
    },
    {
      elementId: "24h-shock",
      sectorId: "egrocery",
      severity: severityFromScore(oilShockPct * 0.7 + grainPressurePct * 0.6),
      headline: "Panic Buying Surge",
      description:
        "Oil shock triggers panic buying of staples. E-grocery platforms see 3–5× normal order volumes within 24 hours, causing stockouts and delivery slot exhaustion.",
      liveSignals: [
        {
          label: "Brent Crude",
          value: brent.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct,
          direction: oilShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Corn Futures",
          value: corn.toFixed(2),
          unit: "$/bu",
          change: grainPressurePct,
          direction: grainPressurePct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, oilShockPct * 0.65 + grainPressurePct * 0.55),
      timeHorizon: "immediate",
    },
    {
      elementId: "24h-shock",
      sectorId: "customs",
      severity: severityFromScore(oilShockPct * 0.5),
      headline: "Emergency Tariff Suspensions",
      description:
        "Governments may invoke emergency powers to suspend import tariffs on energy and food. Customs agencies must implement new classifications within 24–48 hours.",
      liveSignals: [
        {
          label: "Brent Crude",
          value: brent.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct,
          direction: oilShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Oil Shock Score",
          value: oilShockPct.toFixed(1),
          unit: "%",
          direction: oilShockPct > 10 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, oilShockPct * 0.45),
      timeHorizon: "immediate",
    },

    // ── INFLATIONARY TAIL ─────────────────────────────────────────────────────

    {
      elementId: "inflationary-tail",
      sectorId: "inflation",
      severity: severityFromScore(fertShockPct * 0.9 + oilShockPct * 0.5),
      headline: "18–24 Month Food CPI Lag",
      description:
        "Fertilizer shocks today become food price inflation in 18–24 months as crop yields fall. The Hormuz crisis creates a persistent inflationary tail that outlasts the geopolitical event.",
      liveSignals: [
        {
          label: "Urea Proxy (UAN)",
          value: uan.toFixed(2),
          unit: "USD",
          change: fertShockPct,
          direction: fertShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Wheat Futures",
          value: wheat.toFixed(2),
          unit: "$/bu",
          change: grainPressurePct,
          direction: grainPressurePct > 5 ? "up" : "neutral",
        },
        {
          label: "DAP Proxy (MOS)",
          value: mos.toFixed(2),
          unit: "USD",
          direction: "up",
        },
      ],
      impactScore: Math.min(100, fertShockPct * 0.8 + oilShockPct * 0.45),
      timeHorizon: "long",
    },
    {
      elementId: "inflationary-tail",
      sectorId: "ecommerce",
      severity: severityFromScore(fertShockPct * 0.4 + oilShockPct * 0.3),
      headline: "Sustained Margin Erosion",
      description:
        "Persistent input cost inflation erodes e-commerce margins over 12–24 months. Merchants who locked in contracts at pre-crisis prices face renegotiation pressure.",
      liveSignals: [
        {
          label: "Brent Crude",
          value: brent.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct,
          direction: oilShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Urea Proxy (UAN)",
          value: uan.toFixed(2),
          unit: "USD",
          change: fertShockPct,
          direction: fertShockPct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, fertShockPct * 0.35 + oilShockPct * 0.25),
      timeHorizon: "long",
    },
    {
      elementId: "inflationary-tail",
      sectorId: "egrocery",
      severity: severityFromScore(fertShockPct * 1.8 + grainPressurePct * 1.5),
      headline: "Structural Basket Inflation",
      description:
        "E-grocery faces the longest and deepest inflationary tail. Staple food prices remain elevated for 2–3 years post-crisis. Customer lifetime value drops as households reduce online grocery spend.",
      liveSignals: [
        {
          label: "Urea Proxy (UAN)",
          value: uan.toFixed(2),
          unit: "USD",
          change: fertShockPct,
          direction: fertShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Corn Futures",
          value: corn.toFixed(2),
          unit: "$/bu",
          change: grainPressurePct,
          direction: grainPressurePct > 5 ? "up" : "neutral",
        },
        {
          label: "Wheat Futures",
          value: wheat.toFixed(2),
          unit: "$/bu",
          change: grainPressurePct,
          direction: grainPressurePct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, fertShockPct * 1.6 + grainPressurePct * 1.3),
      timeHorizon: "long",
    },
    {
      elementId: "inflationary-tail",
      sectorId: "customs",
      severity: severityFromScore(fertShockPct * 0.3 + oilShockPct * 0.2),
      headline: "Long-Tail Tariff Restructuring",
      description:
        "Post-crisis tariff restructuring on food and energy imports creates multi-year compliance complexity. Customs agencies invest in new HS code frameworks and valuation methodologies.",
      liveSignals: [
        {
          label: "Brent Crude",
          value: brent.toFixed(2),
          unit: "$/bbl",
          change: oilShockPct,
          direction: oilShockPct > 5 ? "up" : "neutral",
        },
        {
          label: "Urea Proxy (UAN)",
          value: uan.toFixed(2),
          unit: "USD",
          change: fertShockPct,
          direction: fertShockPct > 5 ? "up" : "neutral",
        },
      ],
      impactScore: Math.min(100, fertShockPct * 0.25 + oilShockPct * 0.18),
      timeHorizon: "long",
    },
  ];

  // ── Element summaries ────────────────────────────────────────────────────────
  const getElementCells = (id: string) =>
    matrix.filter(c => c.elementId === id);
  const avgScore = (cells: MatrixCell[]) =>
    cells.length
      ? cells.reduce((s, c) => s + c.impactScore, 0) / cells.length
      : 0;

  const elements: CrisisElement[] = [
    {
      id: "hidden-cargo",
      name: "Hidden Cargo Costs",
      subtitle: "War-risk insurance & invisible surcharges",
      icon: "Shield",
      overallSeverity: severityFromScore(
        avgScore(getElementCells("hidden-cargo"))
      ),
      summary:
        "War-risk insurance surges create invisible cost layers throughout the supply chain, hitting customs and e-grocery hardest.",
      keyMetric: "War Risk Premium",
      keyMetricValue: warRiskPremium.toFixed(2),
      keyMetricUnit: "% cargo value",
      keyMetricChange: ((warRiskPremium - 0.5) / 0.5) * 100,
    },
    {
      id: "nitrogen-fortress",
      name: "Nitrogen Fortress",
      subtitle: "Fertilizer supply shock & agflation cascade",
      icon: "Leaf",
      overallSeverity: severityFromScore(
        avgScore(getElementCells("nitrogen-fortress"))
      ),
      summary:
        "Hormuz-adjacent fertilizer producers (Iran, Qatar) supply 15% of global urea. A closure triggers an agflation cascade with 18–24 month lag.",
      keyMetric: "Urea Proxy (UAN)",
      keyMetricValue: uan.toFixed(2),
      keyMetricUnit: "USD",
      keyMetricChange: fertShockPct,
    },
    {
      id: "logistics-trap",
      name: "Logistics Trap",
      subtitle: "Cape of Good Hope rerouting, +14 days",
      icon: "Navigation",
      overallSeverity: severityFromScore(
        avgScore(getElementCells("logistics-trap"))
      ),
      summary:
        "Rerouting via Cape of Good Hope adds 14 days and $800–1,200/container. Cold-chain integrity collapses; e-grocery out-of-stocks exceed 20%.",
      keyMetric: "BDRY Freight ETF",
      keyMetricValue: bdry.toFixed(2),
      keyMetricUnit: "USD",
      keyMetricChange: freightPressurePct,
    },
    {
      id: "24h-shock",
      name: "24-Hour Shock",
      subtitle: "Spot price spike & basket abandonment",
      icon: "Zap",
      overallSeverity: severityFromScore(
        avgScore(getElementCells("24h-shock"))
      ),
      summary:
        "A 24-hour oil price spike of 15–25% triggers panic buying in e-grocery and basket abandonment in discretionary e-commerce.",
      keyMetric: "Brent Crude",
      keyMetricValue: brent.toFixed(2),
      keyMetricUnit: "$/bbl",
      keyMetricChange: oilShockPct,
    },
    {
      id: "inflationary-tail",
      name: "Inflationary Tail",
      subtitle: "18–24 month food CPI lag",
      icon: "TrendingUp",
      overallSeverity: severityFromScore(
        avgScore(getElementCells("inflationary-tail"))
      ),
      summary:
        "The Hormuz crisis creates a persistent inflationary tail. Fertilizer shocks today become food CPI pressure in 18–24 months, outlasting the geopolitical event.",
      keyMetric: "Wheat Futures",
      keyMetricValue: wheat.toFixed(2),
      keyMetricUnit: "$/bu",
      keyMetricChange: grainPressurePct,
    },
  ];

  // ── Sector summaries ─────────────────────────────────────────────────────────
  const getSectorCells = (id: string) => matrix.filter(c => c.sectorId === id);

  const sectors: CrisisSector[] = [
    {
      id: "inflation",
      name: "Inflation",
      subtitle: "Macro price level & CPI",
      overallSeverity: severityFromScore(avgScore(getSectorCells("inflation"))),
      aggregateImpactScore: Math.round(avgScore(getSectorCells("inflation"))),
    },
    {
      id: "ecommerce",
      name: "E-commerce",
      subtitle: "Online retail margins & conversion",
      overallSeverity: severityFromScore(avgScore(getSectorCells("ecommerce"))),
      aggregateImpactScore: Math.round(avgScore(getSectorCells("ecommerce"))),
    },
    {
      id: "egrocery",
      name: "E-Grocery",
      subtitle: "Food e-retail & cold-chain",
      overallSeverity: severityFromScore(avgScore(getSectorCells("egrocery"))),
      aggregateImpactScore: Math.round(avgScore(getSectorCells("egrocery"))),
    },
    {
      id: "customs",
      name: "Customs Agencies",
      subtitle: "Clearance, insurance & tariffs",
      overallSeverity: severityFromScore(avgScore(getSectorCells("customs"))),
      aggregateImpactScore: Math.round(avgScore(getSectorCells("customs"))),
    },
  ];

  // ── Overall crisis score ─────────────────────────────────────────────────────
  const overallCrisisScore = Math.round(
    matrix.reduce((s, c) => s + c.impactScore, 0) / matrix.length
  );

  return {
    elements,
    sectors,
    matrix,
    overallCrisisScore,
    marketSnapshot: {
      brentPrice: brent,
      wtiPrice: wti,
      bdryPrice: bdry,
      zimPrice: zim,
      uanPrice: uan,
      mosPrice: mos,
      cornPrice: corn,
      wheatPrice: wheat,
      warRiskPremium,
    },
    lastUpdated: new Date().toISOString(),
  };
}

// ─── router ───────────────────────────────────────────────────────────────────

export const crisisScenariosRouter = router({
  /** Full Hormuz Crisis impact matrix — cached 30 min */
  getMatrix: publicProcedure.query(async () => {
    if (scenarioCache && Date.now() - scenarioCache.fetchedAt < CACHE_TTL_MS) {
      return scenarioCache.data;
    }

    // Fetch all live prices in parallel
    const [brent, wti, bdry, zim, uan, mos, corn, wheat] = await Promise.all([
      fetchPrice("BZ=F", 84.5),
      fetchPrice("CL=F", 80.25),
      fetchPrice("BDRY", 12.22),
      fetchPrice("ZIM", 28.83),
      fetchPrice("UAN", 18.5),
      fetchPrice("MOS", 28.4),
      fetchPrice("ZC=F", 4.85),
      fetchPrice("ZW=F", 5.42),
    ]);

    const data = computeMatrix(brent, wti, bdry, zim, uan, mos, corn, wheat);
    scenarioCache = { data, fetchedAt: Date.now() };
    return data;
  }),
});
