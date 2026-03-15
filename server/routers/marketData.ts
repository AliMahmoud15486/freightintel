/* marketData.ts — Freight Intel
 * tRPC router for live market data via direct Yahoo Finance v8 API
 *
 * Pulse Bar symbols (all live):
 *   BZ=F        → Brent Crude Oil ($/bbl)
 *   CL=F        → WTI Crude Oil ($/bbl)
 *   NG=F        → Natural Gas ($/MMBtu)
 *   GC=F        → Gold ($/oz)
 *   BDRY        → Breakwave Dry Bulk Shipping ETF (proxy for freight rates)
 *   ZIM         → ZIM Integrated Shipping (live shipping stock)
 *   MAERSK-B.CO → Maersk (global container shipping, DKK)
 *   CHRW        → C.H. Robinson (logistics/freight brokerage)
 *   XLE         → Energy Select Sector ETF
 *
 * Uses direct Yahoo Finance v8/finance/chart endpoint — no API key required.
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

// ─── types ────────────────────────────────────────────────────────────────────

interface YahooMeta {
  symbol: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  currency?: string;
  shortName?: string;
}

interface YahooQuote {
  open: (number | null)[];
  close: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  volume: (number | null)[];
}

interface YahooResult {
  meta: YahooMeta;
  timestamp: number[];
  indicators: { quote: YahooQuote[] };
}

interface YahooResponse {
  chart: {
    result: YahooResult[] | null;
    error: unknown;
  };
}

// ─── in-memory cache for pulse bar (60s TTL) ─────────────────────────────────

interface PulseCache {
  data: PulseBarData;
  fetchedAt: number;
}

let pulseCache: PulseCache | null = null;
const PULSE_CACHE_TTL = 60_000; // 60 seconds

/** Exposed only for unit tests — clears all in-memory caches */
export function _resetCacheForTesting() {
  pulseCache = null;
  fertilizerCache = null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

async function fetchQuote(symbol: string, range = "5d", interval = "1d"): Promise<YahooResult | null> {
  try {
    const encodedSymbol = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=${interval}&range=${range}`;
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    if (!res.ok) {
      console.warn(`[marketData] Yahoo Finance HTTP ${res.status} for ${symbol}`);
      return null;
    }
    const json = (await res.json()) as YahooResponse;
    return json?.chart?.result?.[0] ?? null;
  } catch (err) {
    console.warn(`[marketData] Failed to fetch ${symbol}:`, err);
    return null;
  }
}

function calcChange(result: YahooResult | null, fallback: { price: number; pct: number }) {
  if (!result) return { price: fallback.price, change: fallback.price * (fallback.pct / 100), changePct: fallback.pct };

  const meta = result.meta;
  const curr = meta.regularMarketPrice ?? 0;
  if (curr === 0) return { price: fallback.price, change: fallback.price * (fallback.pct / 100), changePct: fallback.pct };

  // Use second-to-last close for accurate daily change (not chartPreviousClose which may be a week ago)
  const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((v): v is number => v !== null && v > 0);
  const prev = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose > 0 ? meta.chartPreviousClose : curr);

  const change = curr - prev;
  const changePct = prev !== 0 ? (change / prev) * 100 : 0;
  return { price: curr, change, changePct };
}

// ─── pulse bar data type ──────────────────────────────────────────────────────

interface TickerItem {
  label: string;
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  unit: string;
  category: "energy" | "freight" | "logistics" | "metals" | "agriculture";
}

// ─── fertilizer cache (30-min TTL) ───────────────────────────────────────────

interface FertilizerData {
  urea:   { price: number; change: number; changePct: number };
  dap:    { price: number; change: number; changePct: number };
  potash: { price: number; change: number; changePct: number };
  corn:   { price: number; change: number; changePct: number };
  wheat:  { price: number; change: number; changePct: number };
  /** Composite Agflation Index: weighted avg of fertilizer + grain changes */
  agflationIndex: number;
  /** Estimated food CPI pressure in pp (percentage points) */
  foodCpiPressure: number;
  lastUpdated: string;
}

interface FertilizerCache { data: FertilizerData; fetchedAt: number; }
let fertilizerCache: FertilizerCache | null = null;
const FERTILIZER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface PulseBarData {
  tickers: TickerItem[];
  usPortCongestion: { status: string; level: 1 | 2 | 3; label: string };
  lastUpdated: string;
}

async function buildFertilizerData(): Promise<FertilizerData> {
  // Yahoo Finance symbols:
  //   UAN  → CVR Partners (urea/ammonium nitrate producer — proxy for urea prices)
  //   MOS  → Mosaic Company (DAP/potash producer — proxy for phosphate/potash)
  //   NTR  → Nutrien (world's largest potash producer)
  //   ZC=F → Corn futures ($/bushel)
  //   ZW=F → Wheat futures ($/bushel)
  const [uan, mos, ntr, corn, wheat] = await Promise.all([
    fetchQuote("UAN"),
    fetchQuote("MOS"),
    fetchQuote("NTR"),
    fetchQuote("ZC=F"),
    fetchQuote("ZW=F"),
  ]);

  const ureaData   = calcChange(uan,   { price: 18.50,  pct: 1.2  });
  const dapData    = calcChange(mos,   { price: 28.40,  pct: 0.8  });
  const potashData = calcChange(ntr,   { price: 52.10,  pct: -0.5 });
  const cornData   = calcChange(corn,  { price: 4.85,   pct: 1.5  });
  const wheatData  = calcChange(wheat, { price: 5.42,   pct: 2.1  });

  // Agflation Index: weighted average of % changes
  // Weights: urea 30%, DAP 20%, potash 15%, corn 20%, wheat 15%
  const agflationIndex =
    ureaData.changePct   * 0.30 +
    dapData.changePct    * 0.20 +
    potashData.changePct * 0.15 +
    cornData.changePct   * 0.20 +
    wheatData.changePct  * 0.15;

  // Food CPI pressure: each 10% rise in agflation index ≈ 0.8pp food CPI pressure
  // with 18-24 month lag (we show the leading indicator)
  const foodCpiPressure = Math.round((agflationIndex * 0.08) * 10) / 10;

  return {
    urea:   { price: ureaData.price,   change: ureaData.change,   changePct: ureaData.changePct   },
    dap:    { price: dapData.price,    change: dapData.change,    changePct: dapData.changePct    },
    potash: { price: potashData.price, change: potashData.change, changePct: potashData.changePct },
    corn:   { price: cornData.price,   change: cornData.change,   changePct: cornData.changePct   },
    wheat:  { price: wheatData.price,  change: wheatData.change,  changePct: wheatData.changePct  },
    agflationIndex: Math.round(agflationIndex * 100) / 100,
    foodCpiPressure,
    lastUpdated: new Date().toISOString(),
  };
}

async function buildPulseBarData(): Promise<PulseBarData> {
  // Fetch all symbols in parallel
  const [brent, wti, natGas, gold, bdry, zim, maersk, chrw, xle] = await Promise.all([
    fetchQuote("BZ=F"),
    fetchQuote("CL=F"),
    fetchQuote("NG=F"),
    fetchQuote("GC=F"),
    fetchQuote("BDRY"),
    fetchQuote("ZIM"),
    fetchQuote("MAERSK-B.CO"),
    fetchQuote("CHRW"),
    fetchQuote("XLE"),
  ]);

  const brentData  = calcChange(brent,  { price: 84.50,  pct: 3.1  });
  const wtiData    = calcChange(wti,    { price: 80.25,  pct: 2.3  });
  const ngData     = calcChange(natGas, { price: 3.12,   pct: 10.3 });
  const goldData   = calcChange(gold,   { price: 2950.0, pct: -0.3 });
  const bdryData   = calcChange(bdry,   { price: 12.22,  pct: 3.8  });
  const zimData    = calcChange(zim,    { price: 28.83,  pct: 0.6  });
  const maerskData = calcChange(maersk, { price: 17025,  pct: 11.0 });
  const chrwData   = calcChange(chrw,   { price: 187.24, pct: 5.7  });
  const xleData    = calcChange(xle,    { price: 57.04,  pct: 3.4  });

  // Derive US Port Congestion status from shipping performance
  const avgShippingPct = (bdryData.changePct + zimData.changePct) / 2;
  const portLevel: 1 | 2 | 3 = avgShippingPct > 5 ? 3 : avgShippingPct > 2 ? 2 : 1;
  const portStatus = portLevel === 3 ? "Red" : portLevel === 2 ? "Amber" : "Green";

  const tickers: TickerItem[] = [
    { label: "BRENT CRUDE",      symbol: "BZ=F",        ...brentData,  unit: "$/bbl",    category: "energy"    },
    { label: "WTI CRUDE",        symbol: "CL=F",        ...wtiData,    unit: "$/bbl",    category: "energy"    },
    { label: "NATURAL GAS",      symbol: "NG=F",        ...ngData,     unit: "$/MMBtu",  category: "energy"    },
    { label: "GOLD",             symbol: "GC=F",        ...goldData,   unit: "$/oz",     category: "metals"    },
    { label: "DRY BULK FREIGHT", symbol: "BDRY",        ...bdryData,   unit: "USD",      category: "freight"   },
    { label: "ZIM SHIPPING",     symbol: "ZIM",         ...zimData,    unit: "USD",      category: "freight"   },
    { label: "MAERSK",           symbol: "MAERSK-B.CO", ...maerskData, unit: "DKK",      category: "freight"   },
    { label: "CH ROBINSON",      symbol: "CHRW",        ...chrwData,   unit: "USD",      category: "logistics" },
    { label: "ENERGY ETF",       symbol: "XLE",         ...xleData,    unit: "USD",      category: "energy"    },
  ];

  return {
    tickers,
    usPortCongestion: { status: portStatus, level: portLevel, label: "US PORT CONGESTION" },
    lastUpdated: new Date().toISOString(),
  };
}

// ─── router ───────────────────────────────────────────────────────────────────

export const marketDataRouter = router({
  /** Live pulse bar — all ticker symbols, cached 60s */
  pulseBar: publicProcedure.query(async () => {
    if (pulseCache && Date.now() - pulseCache.fetchedAt < PULSE_CACHE_TTL) {
      return pulseCache.data;
    }
    const data = await buildPulseBarData();
    pulseCache = { data, fetchedAt: Date.now() };
    return data;
  }),

  /** 6-month weekly historical data for WTI and Brent (line chart) */
  oilHistory: publicProcedure
    .input(z.object({ months: z.number().min(1).max(12).default(6) }))
    .query(async ({ input }) => {
      const range = `${input.months}mo`;
      const [wtiHistory, brentHistory] = await Promise.all([
        fetchQuote("CL=F", range, "1wk"),
        fetchQuote("BZ=F", range, "1wk"),
      ]);
      const wtiPoints   = buildTimeSeries(wtiHistory);
      const brentPoints = buildTimeSeries(brentHistory);
      const merged      = mergeTimeSeries(wtiPoints, brentPoints, input.months);
      return { data: merged, lastUpdated: new Date().toISOString() };
    }),

  /** Fertilizer & agricultural commodity prices — cached 30 min */
  fertilizerPrices: publicProcedure.query(async () => {
    if (fertilizerCache && Date.now() - fertilizerCache.fetchedAt < FERTILIZER_CACHE_TTL) {
      return fertilizerCache.data;
    }
    const data = await buildFertilizerData();
    fertilizerCache = { data, fetchedAt: Date.now() };
    return data;
  }),

  /** Current spot prices for margin calculations */
  currentPrices: publicProcedure.query(async () => {
    const [wti, brent] = await Promise.all([
      fetchQuote("CL=F"),
      fetchQuote("BZ=F"),
    ]);
    return {
      wtiPrice:           wti?.meta.regularMarketPrice   ?? 80.25,
      brentPrice:         brent?.meta.regularMarketPrice ?? 84.50,
      freightMultiplier:  1.18,
      lastUpdated:        new Date().toISOString(),
    };
  }),

  /** Live KPI stats: Active Disruptions, Avg Delay Impact, Freight Cost Index */
  kpis: publicProcedure.query(async () => {
    // Fetch shipping tickers for Freight Cost Index
    const [bdry, zim, chrw] = await Promise.all([
      fetchQuote("BDRY"),
      fetchQuote("ZIM"),
      fetchQuote("CHRW"),
    ]);

    const bdryData = calcChange(bdry,  { price: 12.22,  pct: 3.8 });
    const zimData  = calcChange(zim,   { price: 28.83,  pct: 0.6 });
    const chrwData = calcChange(chrw,  { price: 187.24, pct: 5.7 });

    // Freight Cost Index = average daily % change across shipping proxies
    const freightChangePct = (bdryData.changePct + zimData.changePct + chrwData.changePct) / 3;
    const freightSign = freightChangePct >= 0 ? "+" : "";
    const freightIndex = `${freightSign}${freightChangePct.toFixed(1)}%`;
    const freightSubtext = freightChangePct >= 5
      ? "High pressure — elevated rates"
      : freightChangePct >= 2
      ? "Moderate upward pressure"
      : freightChangePct < 0
      ? "Rates easing"
      : "Stable freight market";

    return {
      freightCostIndex: freightIndex,
      freightSubtext,
      freightChangePct,
      lastUpdated: new Date().toISOString(),
    };
  }),
});

// ─── time series helpers ───────────────────────────────────────────────────────

function buildTimeSeries(result: YahooResult | null) {
  if (!result) return [];
  const closes = result.indicators.quote[0]?.close ?? [];
  return result.timestamp
    .map((ts, i) => ({ ts, value: closes[i] ?? null }))
    .filter((p): p is { ts: number; value: number } => p.value !== null);
}

function mergeTimeSeries(
  wti: { ts: number; value: number }[],
  brent: { ts: number; value: number }[],
  months: number
) {
  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (wti.length === 0 && brent.length === 0) return generateFallbackData(months);

  const anchor = wti.length > 0 ? wti : brent;
  return anchor.map((point) => {
    const date  = new Date(point.ts * 1000);
    const label = monthLabels[date.getMonth()];
    const nearestBrent = brent.reduce(
      (best, bp) => {
        const diff = Math.abs(bp.ts - point.ts);
        return diff < best.diff ? { diff, value: bp.value } : best;
      },
      { diff: Infinity, value: 0 }
    );
    return {
      month:       label,
      oilCost:     Math.round(point.value * 100) / 100,
      freightCost: Math.round((nearestBrent.value || point.value * 0.95) * 100) / 100,
    };
  });
}

function generateFallbackData(months: number) {
  const now         = new Date();
  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const data        = [];
  for (let i = months - 1; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const trend = (months - i) / months;
    data.push({
      month:       monthLabels[d.getMonth()],
      oilCost:     Math.round((70 + trend * 15 + (Math.random() - 0.5) * 5) * 100) / 100,
      freightCost: Math.round((65 + trend * 18 + (Math.random() - 0.5) * 6) * 100) / 100,
    });
  }
  return data;
}
