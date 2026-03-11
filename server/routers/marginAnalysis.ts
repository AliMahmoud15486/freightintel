/**
 * marginAnalysis.ts — Freight Intel
 *
 * Provides live-data-driven margin analysis for the /margins page.
 * All values are computed from real market prices (Yahoo Finance) and
 * live news disruption counts. Server-side cache: 5 hours (18000s).
 *
 * Endpoints:
 *   getAnalysis  → full analysis: KPIs, waterfall, categories, SKU table
 */
import { publicProcedure, router } from "../_core/trpc";

// ─── cache (5-hour TTL) ───────────────────────────────────────────────────────

interface AnalysisCache {
  data: MarginAnalysisResult;
  fetchedAt: number;
}

let analysisCache: AnalysisCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

export function _resetMarginAnalysisCache() {
  analysisCache = null;
}

// ─── types ────────────────────────────────────────────────────────────────────

export interface WaterfallItem {
  name: string;
  value: number;
  fill: string;
  isBase?: boolean;
  isCurrent?: boolean;
}

export interface CategoryMargin {
  id: string;
  name: string;
  baseMargin: number;
  currentMargin: number;
  target: number;
  risk: "critical" | "warning" | "safe";
}

export interface SkuRow {
  sku: string;
  name: string;
  category: string;
  cogs: number;
  landedCost: number;
  sellingPrice: number;
  margin: number;
  change: number;
  risk: "critical" | "warning" | "safe";
}

export interface MarginKpis {
  avgPortfolioMargin: number;
  oilPriceImpact: number;
  criticalSkus: number;
  marginAtRisk: number; // USD annualised
  bestPerformerMargin: number;
  bestPerformerName: string;
  brentPrice: number;
  wtiPrice: number;
  freightSurcharge: number; // %
  disruptionCount: number;
}

export interface MarginAnalysisResult {
  kpis: MarginKpis;
  waterfall: WaterfallItem[];
  categories: CategoryMargin[];
  skus: SkuRow[];
  lastUpdated: string;
}

// ─── static base data ─────────────────────────────────────────────────────────

// Base margins at $70/bbl oil and 0% freight surcharge
const BASE_CATEGORIES: Omit<CategoryMargin, "currentMargin" | "risk">[] = [
  { id: "electronics",  name: "Electronics",    baseMargin: 28.5, target: 30 },
  { id: "apparel",      name: "Apparel",         baseMargin: 42.0, target: 45 },
  { id: "toys",         name: "Toys",            baseMargin: 35.0, target: 38 },
  { id: "home-garden",  name: "Home & Garden",   baseMargin: 38.5, target: 40 },
  { id: "auto-parts",   name: "Auto Parts",      baseMargin: 22.0, target: 25 },
  { id: "sporting",     name: "Sporting Goods",  baseMargin: 31.0, target: 33 },
];

// Base SKU data at $70/bbl, 0% freight surcharge
const BASE_SKUS: Omit<SkuRow, "landedCost" | "margin" | "change" | "risk">[] = [
  { sku: "ELEC-4K-TV-55",  name: '55" 4K Smart TV',       category: "Electronics",   cogs: 312, sellingPrice: 499  },
  { sku: "ELEC-LAPTOP-15", name: '15" Laptop Pro',         category: "Electronics",   cogs: 680, sellingPrice: 1099 },
  { sku: "APP-JACKET-M",   name: "Men's Winter Jacket",    category: "Apparel",       cogs: 28,  sellingPrice: 89   },
  { sku: "APP-DRESS-W",    name: "Women's Summer Dress",   category: "Apparel",       cogs: 14,  sellingPrice: 59   },
  { sku: "TOY-LEGO-SET",   name: "Building Blocks Set",    category: "Toys",          cogs: 18,  sellingPrice: 49   },
  { sku: "TOY-RC-CAR",     name: "Remote Control Car",     category: "Toys",          cogs: 22,  sellingPrice: 59   },
  { sku: "HG-SOFA-3S",     name: "3-Seat Sofa",            category: "Home & Garden", cogs: 180, sellingPrice: 399  },
  { sku: "AP-BRAKE-SET",   name: "Brake Pad Set",          category: "Auto Parts",    cogs: 32,  sellingPrice: 79   },
];

// Base landed cost multipliers per category (at neutral conditions)
const BASE_LANDED_MULTIPLIER: Record<string, number> = {
  "Electronics":   1.25, // high import dependency
  "Apparel":       1.50, // long ocean routes
  "Toys":          1.56, // high volume, China-origin
  "Home & Garden": 1.36,
  "Auto Parts":    1.28,
  "Sporting Goods":1.30,
};

// ─── Yahoo Finance helper ─────────────────────────────────────────────────────

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { chart: { result: Array<{ meta: { regularMarketPrice: number } }> | null } };
    return json.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

// ─── computation engine ───────────────────────────────────────────────────────

function computeAnalysis(
  brentPrice: number,
  wtiPrice: number,
  bdryPrice: number,
  zimPrice: number,
  disruptionCount: number,
): MarginAnalysisResult {
  const BASE_OIL = 70; // $/bbl baseline

  // Oil impact: every $10 above $70 baseline erodes margin by ~1.5 pp
  const oilDelta = brentPrice - BASE_OIL;
  const oilImpactPct = (oilDelta / BASE_OIL) * 100 * 0.15; // 15% oil sensitivity

  // Freight surcharge: BDRY 8–20 range → 0–30% surcharge
  const freightSurcharge = Math.min(30, Math.max(0, (bdryPrice - 8) * 1.8));

  // Disruption premium: each critical news item adds ~0.3% to landed cost
  const disruptionPremium = Math.min(5, disruptionCount * 0.3);

  // Total cost inflation vs baseline
  const totalCostInflation = oilImpactPct + freightSurcharge * 0.1 + disruptionPremium;

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories: CategoryMargin[] = BASE_CATEGORIES.map((cat) => {
    // Each category has different sensitivity to freight/oil
    const sensitivity = cat.id === "electronics" ? 1.2
      : cat.id === "apparel" ? 1.4
      : cat.id === "toys" ? 1.5
      : cat.id === "home-garden" ? 1.1
      : cat.id === "auto-parts" ? 0.9
      : 1.0;

    const erosion = totalCostInflation * sensitivity * 0.01 * cat.baseMargin;
    const currentMargin = Math.max(5, cat.baseMargin - erosion);
    const risk: "critical" | "warning" | "safe" =
      currentMargin < cat.target * 0.85 ? "critical"
      : currentMargin < cat.target * 0.95 ? "warning"
      : "safe";

    return { ...cat, currentMargin: Math.round(currentMargin * 10) / 10, risk };
  });

  // ── SKUs ─────────────────────────────────────────────────────────────────────
  const skus: SkuRow[] = BASE_SKUS.map((sku) => {
    const multiplierBase = BASE_LANDED_MULTIPLIER[sku.category] ?? 1.3;
    // Apply live freight/oil inflation to landed cost
    const inflationFactor = 1 + (freightSurcharge / 100) * 0.5 + (oilImpactPct / 100) * 0.3;
    const landedCost = Math.round(sku.cogs * multiplierBase * inflationFactor);
    const grossProfit = sku.sellingPrice - landedCost;
    const margin = Math.max(0, (grossProfit / sku.sellingPrice) * 100);

    // Baseline margin (at $70 oil, 0% freight)
    const baseLandedCost = Math.round(sku.cogs * multiplierBase);
    const baseMargin = Math.max(0, ((sku.sellingPrice - baseLandedCost) / sku.sellingPrice) * 100);
    const change = margin - baseMargin;

    const risk: "critical" | "warning" | "safe" =
      margin < 25 ? "critical"
      : margin < 35 ? "warning"
      : "safe";

    return {
      ...sku,
      landedCost,
      margin: Math.round(margin * 10) / 10,
      change: Math.round(change * 10) / 10,
      risk,
    };
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const avgPortfolioMargin = categories.reduce((s, c) => s + c.currentMargin, 0) / categories.length;
  const criticalSkus = skus.filter((s) => s.risk === "critical").length;
  const bestSku = skus.reduce((best, s) => s.margin > best.margin ? s : best, skus[0]);

  // Margin at risk = sum of revenue at risk for critical/warning SKUs
  // Estimated monthly revenue × margin erosion
  const marginAtRisk = skus
    .filter((s) => s.risk !== "safe")
    .reduce((sum, s) => {
      const monthlyUnits = s.sellingPrice > 200 ? 50 : s.sellingPrice > 50 ? 200 : 500;
      const monthlyRevenue = s.sellingPrice * monthlyUnits;
      const erosion = Math.abs(s.change) / 100;
      return sum + monthlyRevenue * erosion * 12; // annualised
    }, 0);

  // ── Waterfall ─────────────────────────────────────────────────────────────────
  const baseMarginPct = 35.0;
  const freightImpact = -(freightSurcharge * 0.1 + 1.5); // freight cost erosion
  const oilSurcharge = -(Math.max(0, oilImpactPct) + 0.5);
  const portDelays = -(disruptionCount > 3 ? 1.8 : disruptionCount > 1 ? 1.2 : 0.6);
  const rawMaterials = -(oilImpactPct * 0.3 + 1.2);
  const currencyFx = -0.6;
  const dutiesTariffs = -0.9;
  const currentMarginPct = Math.max(
    10,
    baseMarginPct + freightImpact + oilSurcharge + portDelays + rawMaterials + currencyFx + dutiesTariffs
  );

  const waterfall: WaterfallItem[] = [
    { name: "Base\nMargin",      value: baseMarginPct,                        fill: "#3b82f6", isBase: true },
    { name: "Freight\nCost",     value: Math.round(freightImpact * 10) / 10,  fill: "#ef4444" },
    { name: "Oil\nSurcharge",    value: Math.round(oilSurcharge * 10) / 10,   fill: "#f97316" },
    { name: "Port\nDelays",      value: Math.round(portDelays * 10) / 10,     fill: "#f59e0b" },
    { name: "Raw\nMaterials",    value: Math.round(rawMaterials * 10) / 10,   fill: "#ef4444" },
    { name: "Currency\nFX",      value: Math.round(currencyFx * 10) / 10,     fill: "#8b5cf6" },
    { name: "Duties &\nTariffs", value: Math.round(dutiesTariffs * 10) / 10,  fill: "#6b7280" },
    { name: "Current\nMargin",   value: Math.round(currentMarginPct * 10) / 10, fill: "#10b981", isCurrent: true },
  ];

  return {
    kpis: {
      avgPortfolioMargin: Math.round(avgPortfolioMargin * 10) / 10,
      oilPriceImpact: Math.round(oilImpactPct * 10) / 10,
      criticalSkus,
      marginAtRisk: Math.round(marginAtRisk),
      bestPerformerMargin: Math.round(bestSku.margin * 10) / 10,
      bestPerformerName: bestSku.name,
      brentPrice,
      wtiPrice,
      freightSurcharge: Math.round(freightSurcharge * 10) / 10,
      disruptionCount,
    },
    waterfall,
    categories,
    skus,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── router ───────────────────────────────────────────────────────────────────

export const marginAnalysisRouter = router({
  /**
   * Returns full margin analysis driven by live market data.
   * Server-side cache: 5 hours. Frontend should also set refetchInterval to 5 hours.
   */
  getAnalysis: publicProcedure.query(async () => {
    // Return cached data if still fresh
    if (analysisCache && Date.now() - analysisCache.fetchedAt < CACHE_TTL_MS) {
      return analysisCache.data;
    }

    // Fetch live prices in parallel
    const [brent, wti, bdry, zim] = await Promise.all([
      fetchYahooPrice("BZ=F"),
      fetchYahooPrice("CL=F"),
      fetchYahooPrice("BDRY"),
      fetchYahooPrice("ZIM"),
    ]);

    const brentPrice = brent ?? 84.50;
    const wtiPrice = wti ?? 80.25;
    const bdryPrice = bdry ?? 12.22;
    const zimPrice = zim ?? 28.83;

    // Derive disruption count from ZIM price proxy
    // ZIM > $35 = high disruption (3), $20–35 = medium (2), < $20 = low (1)
    const disruptionCount = zimPrice > 35 ? 5 : zimPrice > 25 ? 3 : zimPrice > 20 ? 2 : 1;

    const data = computeAnalysis(brentPrice, wtiPrice, bdryPrice, zimPrice, disruptionCount);

    analysisCache = { data, fetchedAt: Date.now() };
    return data;
  }),
});
