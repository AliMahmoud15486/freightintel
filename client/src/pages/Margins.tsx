/* Margins.tsx — Freight Intel
 * Design: Dark Intelligence — full margins analysis page
 * Features:
 *   - Live margin summary KPIs (oil price, freight rates, disruption count)
 *   - Margin waterfall chart (cost breakdown — all values live)
 *   - Category margin comparison (adjusted by live freight/oil)
 *   - SKU-level margin tracker (landed costs computed from live rates)
 *   - Margin trend line chart (6-month, from live oil history)
 *   - Margin Impact Calculator (live defaults, 5-hour refresh)
 *
 * All data refreshes every 5 hours (18,000,000 ms).
 */
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import MarginImpactCalculator from "@/components/MarginImpactCalculator";
import NavigationSidebar from "@/components/NavigationSidebar";
import TopHeader from "@/components/TopHeader";
import GlobalPulseBar from "@/components/GlobalPulseBar";
import { useOilHistory } from "@/hooks/useMarketData";
import { trpc } from "@/lib/trpc";

// ─── constants ────────────────────────────────────────────────────────────────

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000; // 5 hours in ms

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatLastUpdated(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// Build waterfall running-total for stacked bar chart
function buildWaterfallBars(items: { name: string; value: number; fill: string; isBase?: boolean; isCurrent?: boolean }[]) {
  let running = 0;
  return items.map((d, i) => {
    if (i === 0) { running = d.value; return { ...d, base: 0, display: d.value }; }
    if (d.isCurrent) return { ...d, base: 0, display: d.value };
    const base = running;
    running += d.value;
    return { ...d, base: d.value < 0 ? running : base, display: Math.abs(d.value) };
  });
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon: Icon, trend, loading,
}: {
  label: string; value: string; sub: string; color: string; icon: any; trend?: "up" | "down"; loading?: boolean;
}) {
  return (
    <div className="ms-panel" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <Icon size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        {loading ? (
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.5rem", color: "rgba(255,255,255,0.2)" }}>—</span>
        ) : (
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.5rem", color, letterSpacing: "0.02em" }}>
            {value}
          </span>
        )}
        {!loading && trend && (
          <span style={{ fontSize: "0.75rem", color: trend === "up" ? "#10b981" : "#ef4444" }}>
            {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          </span>
        )}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>
        {loading ? "Loading live data..." : sub}
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const config = {
    critical: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "CRITICAL" },
    warning:  { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "WARNING" },
    safe:     { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "SAFE" },
  }[risk] ?? { bg: "rgba(107,114,128,0.15)", color: "#6b7280", label: "UNKNOWN" };

  return (
    <span style={{
      background: config.bg, color: config.color,
      fontSize: "0.6rem", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
      letterSpacing: "0.08em", padding: "2px 6px", borderRadius: "3px",
      border: `1px solid ${config.color}30`,
    }}>
      {config.label}
    </span>
  );
}

function LiveBadge({ lastUpdated }: { lastUpdated?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} className="animate-blink" />
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "#10b981" }}>LIVE</span>
      {lastUpdated && (
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: "3px" }}>
          <Clock size={9} /> {formatLastUpdated(lastUpdated)}
        </span>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Margins() {
  const [activeSection, setActiveSection] = useState("margins");
  const [sortField, setSortField] = useState<"margin" | "change" | "name">("change");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterCategory, setFilterCategory] = useState("all");

  // ── Live data — 5-hour refresh ──────────────────────────────────────────────
  const {
    data: analysis,
    isLoading: analysisLoading,
    refetch: refetchAnalysis,
    isFetching: analysisFetching,
  } = trpc.marginAnalysis.getAnalysis.useQuery(undefined, {
    refetchInterval: FIVE_HOURS_MS,
    staleTime: FIVE_HOURS_MS - 60_000, // consider stale 1 min before TTL
    retry: 2,
  });

  // Oil history for the trend chart — 5-hour refresh
  const { data: oilHistory, refetch: refetchOilHistory } = useOilHistory(6);

  // ── Derived data ────────────────────────────────────────────────────────────

  // Waterfall chart with running totals
  const waterfallBars = useMemo(
    () => buildWaterfallBars(analysis?.waterfall ?? []),
    [analysis?.waterfall]
  );

  // Margin trend line from oil history
  const marginTrend = useMemo(
    () => (oilHistory?.data ?? []).map((d) => ({
      month: d.month,
      margin: Math.max(15, 35 - (d.oilCost - 60) * 0.12),
      target: 30,
    })),
    [oilHistory]
  );

  // Sorted + filtered SKU table
  const filteredSkus = useMemo(() => {
    const skus = analysis?.skus ?? [];
    return skus
      .filter((s) => filterCategory === "all" || s.category.toLowerCase().replace(/[^a-z]/g, "-") === filterCategory)
      .sort((a, b) => {
        const mult = sortDir === "asc" ? 1 : -1;
        if (sortField === "margin") return mult * (a.margin - b.margin);
        if (sortField === "change") return mult * (a.change - b.change);
        return mult * a.name.localeCompare(b.name);
      });
  }, [analysis?.skus, filterCategory, sortField, sortDir]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleRefresh = () => {
    refetchAnalysis();
    refetchOilHistory();
  };

  const kpis = analysis?.kpis;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0a0e1a", backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.04) 0%, transparent 50%)" }}>
      <NavigationSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopHeader />
        <GlobalPulseBar />

        {/* Page header */}
        <div style={{
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.3rem",
              color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0,
            }}>
              MARGIN ANALYSIS
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
              Live margin tracking — oil prices, freight rates &amp; disruption impact · Refreshes every 5 hours
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {kpis && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: "4px" }}>
                Brent ${kpis.brentPrice.toFixed(2)} · WTI ${kpis.wtiPrice.toFixed(2)} · Freight +{kpis.freightSurcharge.toFixed(1)}%
              </span>
            )}
            {analysisLoading || analysisFetching ? (
              <RefreshCw size={14} className="animate-spin" style={{ color: "#f97316" }} />
            ) : (
              <LiveBadge lastUpdated={analysis?.lastUpdated} />
            )}
            <button
              onClick={handleRefresh}
              disabled={analysisFetching}
              title="Force refresh all data"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                padding: "5px 10px",
                color: analysisFetching ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)",
                cursor: analysisFetching ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: "0.7rem",
                letterSpacing: "0.06em",
              }}
            >
              <RefreshCw size={11} className={analysisFetching ? "animate-spin" : ""} />
              REFRESH
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          data-scroll-container="main"
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}
        >
          {/* KPI row */}
          <div id="section-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            <KpiCard
              label="Avg Portfolio Margin"
              value={kpis ? `${kpis.avgPortfolioMargin.toFixed(1)}%` : "—"}
              sub="Across all categories"
              color="#3b82f6"
              icon={Package}
              trend="down"
              loading={analysisLoading}
            />
            <KpiCard
              label="Oil Price Impact"
              value={kpis ? `-${Math.abs(kpis.oilPriceImpact).toFixed(1)}%` : "—"}
              sub={kpis ? `Brent at $${kpis.brentPrice.toFixed(2)}/bbl` : "Loading..."}
              color="#f97316"
              icon={TrendingDown}
              trend="down"
              loading={analysisLoading}
            />
            <KpiCard
              label="Critical SKUs"
              value={kpis ? String(kpis.criticalSkus) : "—"}
              sub="Below target margin"
              color="#ef4444"
              icon={AlertTriangle}
              trend="down"
              loading={analysisLoading}
            />
            <KpiCard
              label="Margin at Risk"
              value={kpis ? formatCurrency(kpis.marginAtRisk) : "—"}
              sub="Annualised exposure"
              color="#f59e0b"
              icon={AlertTriangle}
              loading={analysisLoading}
            />
            <KpiCard
              label="Best Performer"
              value={kpis ? `${kpis.bestPerformerMargin.toFixed(1)}%` : "—"}
              sub={kpis ? kpis.bestPerformerName : "Loading..."}
              color="#10b981"
              icon={TrendingUp}
              trend="up"
              loading={analysisLoading}
            />
          </div>

          {/* Main charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

            {/* Waterfall chart */}
            <div className="ms-panel" style={{ padding: "16px" }}>
              <div style={{ marginBottom: "14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <span className="panel-header">MARGIN WATERFALL — COST EROSION BREAKDOWN</span>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                    Base margin vs. current margin after all live cost impacts
                  </p>
                </div>
                {!analysisLoading && <LiveBadge lastUpdated={analysis?.lastUpdated} />}
              </div>
              {analysisLoading ? (
                <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RefreshCw size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={waterfallBars} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "'Inter', sans-serif" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 40]}
                    />
                    <Tooltip
                      formatter={(value: any, _name: string, props: any) => {
                        const item = props.payload;
                        const display = item.value < 0 ? `${item.value}%` : `+${item.value}%`;
                        return [display, (item.name as string)?.replace("\n", " ")];
                      }}
                      contentStyle={{
                        background: "rgba(10,14,26,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.75rem",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                    />
                    <Bar dataKey="base" stackId="a" fill="transparent" />
                    <Bar dataKey="display" stackId="a" radius={[3, 3, 0, 0]}>
                      {waterfallBars.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                    {analysis?.waterfall && (
                      <ReferenceLine
                        y={analysis.waterfall.find((w) => w.isCurrent)?.value ?? 25}
                        stroke="#f97316"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: `Current ${analysis.waterfall.find((w) => w.isCurrent)?.value ?? 25}%`,
                          fill: "#f97316",
                          fontSize: 10,
                          fontFamily: "'Rajdhani', sans-serif",
                        }}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Margin trend over time */}
            <div className="ms-panel" style={{ padding: "16px" }}>
              <div style={{ marginBottom: "14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <span className="panel-header">MARGIN TREND (6 MONTHS)</span>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                    Avg portfolio margin vs. target — derived from live oil prices
                  </p>
                </div>
                {oilHistory && <LiveBadge lastUpdated={oilHistory.lastUpdated} />}
              </div>
              <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
                {[{ color: "#3b82f6", label: "Avg Margin" }, { color: "#f97316", label: "Target 30%", dashed: true }].map((l) => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: 16, height: 2, background: l.color, borderRadius: 1, borderTop: l.dashed ? "2px dashed" : "none", borderColor: l.color }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.45)" }}>{l.label}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={marginTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v as number).toFixed(0)}%`} domain={[15, 38]} />
                  <Tooltip
                    formatter={(v: any) => [`${(v as number).toFixed(1)}%`]}
                    contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontFamily: "'Inter', sans-serif", fontSize: "0.75rem" }}
                  />
                  <ReferenceLine y={30} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1} />
                  <Line type="monotone" dataKey="margin" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category comparison */}
          <div className="ms-panel" style={{ padding: "16px" }}>
            <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span className="panel-header">MARGIN BY CATEGORY</span>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                  Current margin vs. baseline vs. target — adjusted for live freight &amp; oil rates
                </p>
              </div>
              {!analysisLoading && <LiveBadge lastUpdated={analysis?.lastUpdated} />}
            </div>
            {analysisLoading ? (
              <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={analysis?.categories ?? []} layout="vertical" margin={{ top: 0, right: 60, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 50]} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip
                    formatter={(v: any, name: string) => [`${(v as number).toFixed(1)}%`, name === "baseMargin" ? "Baseline" : name === "currentMargin" ? "Current" : "Target"]}
                    contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontFamily: "'Inter', sans-serif", fontSize: "0.75rem" }}
                  />
                  <Bar dataKey="baseMargin" fill="rgba(59,130,246,0.3)" radius={[0, 2, 2, 0]} name="Baseline" />
                  <Bar dataKey="currentMargin" radius={[0, 2, 2, 0]} name="Current">
                    {(analysis?.categories ?? []).map((cat) => (
                      <Cell key={cat.id} fill={cat.risk === "critical" ? "#ef4444" : cat.risk === "warning" ? "#f59e0b" : "#10b981"} />
                    ))}
                  </Bar>
                  <Bar dataKey="target" fill="rgba(249,115,22,0.2)" radius={[0, 2, 2, 0]} name="Target" />
                  <ReferenceLine x={30} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* SKU table */}
          <div className="ms-panel" style={{ padding: "0" }}>
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="panel-header">SKU-LEVEL MARGIN TRACKER</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>
                  {filteredSkus.length} items
                </span>
                {!analysisLoading && <LiveBadge lastUpdated={analysis?.lastUpdated} />}
              </div>
              {/* Category filter */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["all", "electronics", "apparel", "toys", "home-garden", "auto-parts"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    style={{
                      background: filterCategory === cat ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${filterCategory === cat ? "#f97316" : "rgba(255,255,255,0.1)"}`,
                      color: filterCategory === cat ? "#f97316" : "rgba(255,255,255,0.5)",
                      fontSize: "0.62rem",
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {cat === "all" ? "ALL" : cat.replace(/-/g, " ").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {analysisLoading ? (
              <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RefreshCw size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {[
                        { label: "SKU",          field: null,     width: "120px" },
                        { label: "Product Name", field: "name",   width: "auto"  },
                        { label: "Category",     field: null,     width: "120px" },
                        { label: "COGS",         field: null,     width: "80px"  },
                        { label: "Landed Cost",  field: null,     width: "100px" },
                        { label: "Sell Price",   field: null,     width: "90px"  },
                        { label: "Margin %",     field: "margin", width: "90px"  },
                        { label: "vs. Baseline", field: "change", width: "100px" },
                        { label: "Risk",         field: null,     width: "90px"  },
                      ].map(({ label, field, width }) => (
                        <th
                          key={label}
                          onClick={() => field && handleSort(field as any)}
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            letterSpacing: "0.08em",
                            color: "rgba(255,255,255,0.4)",
                            textTransform: "uppercase",
                            cursor: field ? "pointer" : "default",
                            width,
                            whiteSpace: "nowrap",
                            userSelect: "none",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {label}
                            {field && sortField === field && (
                              sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkus.map((sku, i) => (
                      <tr
                        key={sku.sku}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                          transition: "background 0.15s",
                        }}
                        className="hover:bg-white/[0.03]"
                      >
                        <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                          {sku.sku}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                          {sku.name}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                          {sku.category}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                          ${sku.cogs}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#f97316" }}>
                          ${sku.landedCost}
                        </td>
                        <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                          ${sku.sellingPrice}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            color: sku.margin >= 40 ? "#10b981" : sku.margin >= 30 ? "#f59e0b" : "#ef4444",
                          }}>
                            {sku.margin.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.75rem",
                            color: sku.change >= 0 ? "#10b981" : "#ef4444",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}>
                            {sku.change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {sku.change >= 0 ? "+" : ""}{sku.change.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <RiskBadge risk={sku.risk} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Margin Impact Calculator */}
          <div id="section-margin-calculator">
            <MarginImpactCalculator />
          </div>

        </div>
      </div>
    </div>
  );
}
