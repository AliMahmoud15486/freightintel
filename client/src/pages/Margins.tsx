/* Margins.tsx — Margin Sentinel
 * Design: Dark Intelligence — full margins analysis page
 * Features:
 *   - Live margin summary KPIs (using real oil prices)
 *   - Margin waterfall chart (cost breakdown per category)
 *   - SKU-level margin tracker table
 *   - Category margin comparison bar chart
 *   - Margin trend line chart (6-month)
 */
import { useState } from "react";
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
import { TrendingDown, TrendingUp, AlertTriangle, Package, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import NavigationSidebar from "@/components/NavigationSidebar";
import TopHeader from "@/components/TopHeader";
import GlobalPulseBar from "@/components/GlobalPulseBar";
import { useCurrentPrices, useOilHistory } from "@/hooks/useMarketData";

// ─── static data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "electronics", name: "Electronics", baseMargin: 28.5, currentMargin: 24.3, target: 30, risk: "critical" },
  { id: "apparel", name: "Apparel", baseMargin: 42.0, currentMargin: 38.7, target: 45, risk: "warning" },
  { id: "toys", name: "Toys", baseMargin: 35.0, currentMargin: 29.8, target: 38, risk: "critical" },
  { id: "home-garden", name: "Home & Garden", baseMargin: 38.5, currentMargin: 36.1, target: 40, risk: "warning" },
  { id: "auto-parts", name: "Auto Parts", baseMargin: 22.0, currentMargin: 21.4, target: 25, risk: "safe" },
  { id: "sporting", name: "Sporting Goods", baseMargin: 31.0, currentMargin: 30.2, target: 33, risk: "safe" },
];

const SKU_DATA = [
  { sku: "ELEC-4K-TV-55", name: '55" 4K Smart TV', category: "Electronics", cogs: 312, landedCost: 389, sellingPrice: 499, margin: 22.0, change: -4.2, risk: "critical" },
  { sku: "ELEC-LAPTOP-15", name: "15\" Laptop Pro", category: "Electronics", cogs: 680, landedCost: 812, sellingPrice: 1099, margin: 26.1, change: -2.8, risk: "warning" },
  { sku: "APP-JACKET-M", name: "Men's Winter Jacket", category: "Apparel", cogs: 28, landedCost: 42, sellingPrice: 89, margin: 52.8, change: +1.2, risk: "safe" },
  { sku: "APP-DRESS-W", name: "Women's Summer Dress", category: "Apparel", cogs: 14, landedCost: 22, sellingPrice: 59, margin: 62.7, change: +0.8, risk: "safe" },
  { sku: "TOY-LEGO-SET", name: "Building Blocks Set", category: "Toys", cogs: 18, landedCost: 28, sellingPrice: 49, margin: 42.9, change: -3.5, risk: "warning" },
  { sku: "TOY-RC-CAR", name: "Remote Control Car", category: "Toys", cogs: 22, landedCost: 38, sellingPrice: 59, margin: 35.6, change: -5.1, risk: "critical" },
  { sku: "HG-SOFA-3S", name: "3-Seat Sofa", category: "Home & Garden", cogs: 180, landedCost: 245, sellingPrice: 399, margin: 38.6, change: -1.8, risk: "warning" },
  { sku: "AP-BRAKE-SET", name: "Brake Pad Set", category: "Auto Parts", cogs: 32, landedCost: 41, sellingPrice: 79, margin: 48.1, change: +0.5, risk: "safe" },
];

// Waterfall chart data — margin erosion breakdown
const waterfallData = [
  { name: "Base\nMargin", value: 35.0, fill: "#3b82f6", isBase: true },
  { name: "Freight\nCost", value: -3.2, fill: "#ef4444" },
  { name: "Oil\nSurcharge", value: -1.8, fill: "#f97316" },
  { name: "Port\nDelays", value: -1.4, fill: "#f59e0b" },
  { name: "Raw\nMaterials", value: -2.1, fill: "#ef4444" },
  { name: "Currency\nFX", value: -0.6, fill: "#8b5cf6" },
  { name: "Duties &\nTariffs", value: -0.9, fill: "#6b7280" },
  { name: "Current\nMargin", value: 25.0, fill: "#10b981", isCurrent: true },
];

// Build waterfall running total
let running = 0;
const waterfallWithBase = waterfallData.map((d, i) => {
  if (i === 0) { running = d.value; return { ...d, base: 0, display: d.value }; }
  if (d.isCurrent) return { ...d, base: 0, display: d.value };
  const base = running;
  running += d.value;
  return { ...d, base: d.value < 0 ? running : base, display: Math.abs(d.value) };
});

// ─── sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon: Icon, trend }: {
  label: string; value: string; sub: string; color: string; icon: any; trend?: "up" | "down";
}) {
  return (
    <div
      className="ms-panel"
      style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "4px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <Icon size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.5rem", color, letterSpacing: "0.02em" }}>
          {value}
        </span>
        {trend && (
          <span style={{ fontSize: "0.75rem", color: trend === "up" ? "#10b981" : "#ef4444" }}>
            {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          </span>
        )}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>
        {sub}
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const config = {
    critical: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "CRITICAL" },
    warning: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "WARNING" },
    safe: { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "SAFE" },
  }[risk] ?? { bg: "rgba(107,114,128,0.15)", color: "#6b7280", label: "UNKNOWN" };

  return (
    <span
      style={{
        background: config.bg,
        color: config.color,
        fontSize: "0.6rem",
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        letterSpacing: "0.08em",
        padding: "2px 6px",
        borderRadius: "3px",
        border: `1px solid ${config.color}30`,
      }}
    >
      {config.label}
    </span>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Margins() {
  const [activeSection, setActiveSection] = useState("margins");
  const [sortField, setSortField] = useState<"margin" | "change" | "name">("change");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterCategory, setFilterCategory] = useState("all");

  const { data: currentPrices, isLoading: pricesLoading } = useCurrentPrices();
  const { data: oilHistory } = useOilHistory(6);

  // Compute live margin impact from real oil prices
  const oilImpact = currentPrices
    ? ((currentPrices.brentPrice - 70) / 70) * 100 * 0.15 // 15% oil sensitivity
    : 0;

  const liveAvgMargin = (25.0 - oilImpact).toFixed(1);
  const liveOilImpact = oilImpact.toFixed(1);

  // Sort and filter SKU data
  const filteredSkus = SKU_DATA
    .filter((s) => filterCategory === "all" || s.category.toLowerCase().replace(/[^a-z]/g, "-") === filterCategory)
    .sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      if (sortField === "margin") return mult * (a.margin - b.margin);
      if (sortField === "change") return mult * (a.change - b.change);
      return mult * a.name.localeCompare(b.name);
    });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  // Margin trend line from oil history (simulated margin = 35 - oil_sensitivity)
  const marginTrend = oilHistory?.data.map((d) => ({
    month: d.month,
    margin: Math.max(15, 35 - (d.oilCost - 60) * 0.12),
    target: 30,
  })) ?? [];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0a0e1a", backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.04) 0%, transparent 50%)" }}>
      <NavigationSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopHeader alertCount={2} />
        <GlobalPulseBar />

        {/* Page header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "1.3rem",
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              MARGIN ANALYSIS
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
              Live margin tracking with real-time oil price impact — {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {pricesLoading ? (
              <RefreshCw size={14} className="animate-spin" style={{ color: "#f97316" }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} className="animate-blink" />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "#10b981" }}>
                  Live prices active
                </span>
              </div>
            )}
            {currentPrices && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: "4px" }}>
                Brent ${currentPrices.brentPrice.toFixed(2)} · WTI ${currentPrices.wtiPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            <KpiCard label="Avg Portfolio Margin" value={`${liveAvgMargin}%`} sub="Across all categories" color="#3b82f6" icon={Package} trend="down" />
            <KpiCard label="Oil Price Impact" value={`-${liveOilImpact}%`} sub={`Brent at $${currentPrices?.brentPrice.toFixed(2) ?? "—"}`} color="#f97316" icon={TrendingDown} trend="down" />
            <KpiCard label="Critical SKUs" value="4" sub="Below target margin" color="#ef4444" icon={AlertTriangle} trend="down" />
            <KpiCard label="Margin at Risk" value="$2.4M" sub="Annualized exposure" color="#f59e0b" icon={AlertTriangle} />
            <KpiCard label="Best Performer" value="62.7%" sub="Women's Summer Dress" color="#10b981" icon={TrendingUp} trend="up" />
          </div>

          {/* Main charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

            {/* Waterfall chart */}
            <div className="ms-panel" style={{ padding: "16px" }}>
              <div style={{ marginBottom: "14px" }}>
                <span className="panel-header">MARGIN WATERFALL — COST EROSION BREAKDOWN</span>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                  Base margin vs. current margin after all cost impacts
                </p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={waterfallWithBase} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
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
                    formatter={(value: any, name: string, props: any) => {
                      const item = props.payload;
                      const display = item.value < 0 ? `${item.value}%` : `+${item.value}%`;
                      return [display, item.name?.replace("\n", " ")];
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
                  {/* Invisible base bar for waterfall effect */}
                  <Bar dataKey="base" stackId="a" fill="transparent" />
                  <Bar dataKey="display" stackId="a" radius={[3, 3, 0, 0]}>
                    {waterfallWithBase.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ReferenceLine y={25} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Current 25%", fill: "#f97316", fontSize: 10, fontFamily: "'Rajdhani', sans-serif" }} />
                </BarChart>
              </ResponsiveContainer>
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
                {oilHistory && (
                  <span style={{ fontSize: "0.55rem", color: "#10b981", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, letterSpacing: "0.1em", background: "rgba(16,185,129,0.12)", padding: "2px 6px", borderRadius: "3px" }}>
                    LIVE
                  </span>
                )}
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
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[15, 38]} />
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
                  Current margin vs. baseline vs. target — all categories
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={CATEGORIES} layout="vertical" margin={{ top: 0, right: 60, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 50]} />
                <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  formatter={(v: any, name: string) => [`${(v as number).toFixed(1)}%`, name === "baseMargin" ? "Baseline" : name === "currentMargin" ? "Current" : "Target"]}
                  contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontFamily: "'Inter', sans-serif", fontSize: "0.75rem" }}
                />
                <Bar dataKey="baseMargin" fill="rgba(59,130,246,0.3)" radius={[0, 2, 2, 0]} name="Baseline" />
                <Bar dataKey="currentMargin" radius={[0, 2, 2, 0]} name="Current">
                  {CATEGORIES.map((cat) => (
                    <Cell key={cat.id} fill={cat.risk === "critical" ? "#ef4444" : cat.risk === "warning" ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
                <Bar dataKey="target" fill="rgba(249,115,22,0.2)" radius={[0, 2, 2, 0]} name="Target" />
                <ReferenceLine x={30} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* SKU table */}
          <div className="ms-panel" style={{ padding: "0" }}>
            {/* Table header */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span className="panel-header">SKU-LEVEL MARGIN TRACKER</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginLeft: "10px" }}>
                  {filteredSkus.length} items
                </span>
              </div>
              {/* Category filter */}
              <div style={{ display: "flex", gap: "6px" }}>
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
                    {cat === "all" ? "ALL" : cat.replace("-", " ").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {[
                      { label: "SKU", field: null, width: "120px" },
                      { label: "Product Name", field: "name", width: "auto" },
                      { label: "Category", field: null, width: "120px" },
                      { label: "COGS", field: null, width: "80px" },
                      { label: "Landed Cost", field: null, width: "100px" },
                      { label: "Sell Price", field: null, width: "90px" },
                      { label: "Margin %", field: "margin", width: "90px" },
                      { label: "vs. Baseline", field: "change", width: "100px" },
                      { label: "Risk", field: null, width: "90px" },
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
          </div>
        </div>
      </div>
    </div>
  );
}
