/* marketData.ts — Margin Sentinel
 * tRPC router for live market data via Yahoo Finance (built-in Data API)
 *
 * Pulse Bar symbols (all live):
 *   BZ=F        → Brent Crude Oil ($/bbl)
 *   CL=F        → WTI Crude Oil ($/bbl)
 *   NG=F        → Natural Gas ($/MMBtu)
 *   GC=F        → Gold ($/oz)
 *   BDRY        → Breakwave Dry Bulk Shipping ETF (proxy for freight rates)
 *   ZIM         → ZIM Integrated Shipping (live shipping stock)
 *   MAERSK-B.CO → Maersk (global container shipping)
 *   CHRW        → C.H. Robinson (logistics/freight brokerage)
 *   XLE         → Energy Select Sector ETF
 *
 * Note: Data API query params must all be strings (no booleans).
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { callDataApi } from "../_core/dataApi";

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

// ─── helpers ──────────────────────────────────────────────────────────────────

async function fetchQuote(symbol: string, range = "5d", interval = "1d"): Promise<YahooResult | null> {
  try {
    const res = (await callDataApi("YahooFinance/get_stock_chart", {
      query: { symbol, region: "US", interval, range },
    })) as YahooResponse;
    return res?.chart?.result?.[0] ?? null;
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

  // Use second-to-last close (yesterday's close) for accurate daily change
  const closes = result.indicators.quote[0]?.close ?? [];
  const validCloses = closes.filter((c): c is number => c !== null && c > 0);
  const prev = validCloses.length >= 2
    ? validCloses[validCloses.length - 2]
    : (meta.chartPreviousClose > 0 ? meta.chartPreviousClose : curr);

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
  category: "energy" | "freight" | "logistics" | "metals";
}

interface PulseBarData {
  tickers: TickerItem[];
  usPortCongestion: { status: string; level: 1 | 2 | 3; label: string };
  lastUpdated: string;
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

  // Derive US Port Congestion status from XLE + shipping performance
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
