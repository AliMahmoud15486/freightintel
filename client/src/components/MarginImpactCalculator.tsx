/**
 * Margin Impact Calculator
 *
 * Interactive panel where merchants input product details and see how
 * current freight costs, oil prices, and disruptions erode their margins.
 * All calculations are client-side for instant feedback.
 * Live defaults are fetched from the marginCalculator.getDefaults tRPC procedure.
 * AI insight is fetched from marginCalculator.getInsight.
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Lightbulb, RefreshCw, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp } from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Electronics",
  "Apparel & Footwear",
  "Home & Furniture",
  "Toys & Games",
  "Health & Beauty",
  "Automotive Parts",
  "Food & Beverage",
  "Industrial Equipment",
  "Sporting Goods",
  "Jewellery & Accessories",
];

const ORIGINS = [
  "China",
  "Vietnam",
  "Bangladesh",
  "India",
  "Turkey",
  "Mexico",
  "Indonesia",
  "Thailand",
  "South Korea",
  "Germany",
];

const CONTAINER_TYPES = [
  { label: "20ft Standard", baseCost: 1800 },
  { label: "40ft Standard", baseCost: 3200 },
  { label: "40ft High Cube", baseCost: 3500 },
  { label: "LCL (per CBM)", baseCost: 85 },
];

const DISRUPTION_LABELS = ["Low", "Medium", "High"];
const DISRUPTION_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

// ─── calculation engine (pure, client-side) ───────────────────────────────────

interface CalcInputs {
  unitCost: number;
  sellingPrice: number;
  unitsPerMonth: number;
  containerIndex: number;
  oilPrice: number;
  freightSurcharge: number; // 0–50
  disruptionLevel: number;  // 0=Low, 1=Medium, 2=High
}

interface CalcResult {
  baseMargin: number;
  freightImpact: number;
  oilImpact: number;
  disruptionImpact: number;
  currentMargin: number;
  delta: number;
  revenueAtRisk: number;
  unitsAffected: number;
  breakEvenPrice: number;
  totalCostPerUnit: number;
}

function calculateMargins(inputs: CalcInputs): CalcResult {
  const { unitCost, sellingPrice, unitsPerMonth, containerIndex, oilPrice, freightSurcharge, disruptionLevel } = inputs;

  if (sellingPrice <= 0 || unitCost <= 0) {
    return {
      baseMargin: 0, freightImpact: 0, oilImpact: 0, disruptionImpact: 0,
      currentMargin: 0, delta: 0, revenueAtRisk: 0, unitsAffected: 0,
      breakEvenPrice: unitCost, totalCostPerUnit: unitCost,
    };
  }

  const baseMargin = ((sellingPrice - unitCost) / sellingPrice) * 100;

  // Freight cost per unit (container cost / units per month, adjusted by surcharge)
  const containerBaseCost = CONTAINER_TYPES[containerIndex]?.baseCost ?? 3200;
  const effectiveUnits = Math.max(unitsPerMonth, 1);
  const freightCostPerUnit = (containerBaseCost / effectiveUnits) * (1 + freightSurcharge / 100);
  const freightImpact = (freightCostPerUnit / sellingPrice) * 100;

  // Oil surcharge: $1 oil change → ~0.08% margin impact per unit
  const oilBaseline = 75; // baseline oil price
  const oilDelta = oilPrice - oilBaseline;
  const oilImpact = Math.max(0, (oilDelta * 0.08) / sellingPrice * unitCost);

  // Disruption impact: Low=0.5%, Medium=2.5%, High=5.5% margin erosion
  const disruptionImpacts = [0.5, 2.5, 5.5];
  const disruptionImpact = disruptionImpacts[disruptionLevel] ?? 0.5;

  const currentMargin = Math.max(-99, baseMargin - freightImpact - oilImpact - disruptionImpact);
  const delta = currentMargin - baseMargin;

  // Monthly financials
  const marginErosionPerUnit = (Math.abs(delta) / 100) * sellingPrice;
  const revenueAtRisk = Math.round(marginErosionPerUnit * effectiveUnits);
  const unitsAffected = delta < -5 ? Math.round(effectiveUnits * 0.8) : Math.round(effectiveUnits * 0.4);

  // Break-even: selling price needed to maintain base margin given new costs
  const totalCostPerUnit = unitCost + freightCostPerUnit + (oilImpact / 100) * sellingPrice + (disruptionImpact / 100) * sellingPrice;
  const breakEvenPrice = totalCostPerUnit / (1 - baseMargin / 100);

  return {
    baseMargin: Math.round(baseMargin * 10) / 10,
    freightImpact: Math.round(freightImpact * 10) / 10,
    oilImpact: Math.round(oilImpact * 10) / 10,
    disruptionImpact: Math.round(disruptionImpact * 10) / 10,
    currentMargin: Math.round(currentMargin * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    revenueAtRisk,
    unitsAffected,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    totalCostPerUnit: Math.round(totalCostPerUnit * 100) / 100,
  };
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${color}33`,
      borderRadius: 8,
      padding: "12px 16px",
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.6rem", color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function WaterfallBar({ label, value, color, baseWidth, isTotal }: {
  label: string; value: number; color: string; baseWidth: number; isTotal?: boolean;
}) {
  const width = Math.min(100, Math.abs(value) * baseWidth);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ width: 130, fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.65)", textAlign: "right", flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: isTotal ? 14 : 10, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${width}%`,
          background: color,
          borderRadius: 3,
          transition: "width 0.4s ease",
          boxShadow: `0 0 6px ${color}66`,
        }} />
      </div>
      <div style={{ width: 48, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: "0.75rem", color, textAlign: "right", flexShrink: 0 }}>
        {value > 0 ? "+" : ""}{value.toFixed(1)}%
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function MarginImpactCalculator() {
  const [expanded, setExpanded] = useState(true);

  // Form state
  const [productName, setProductName] = useState("My Product");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [unitCost, setUnitCost] = useState(28);
  const [sellingPrice, setSellingPrice] = useState(65);
  const [origin, setOrigin] = useState(ORIGINS[0]);
  const [containerIndex, setContainerIndex] = useState(1);
  const [unitsPerMonth, setUnitsPerMonth] = useState(500);

  // Slider state (will be overridden by live defaults)
  const [oilPrice, setOilPrice] = useState(82);
  const [freightSurcharge, setFreightSurcharge] = useState(15);
  const [disruptionLevel, setDisruptionLevel] = useState(1);

  // AI insight state
  const [insightQuery, setInsightQuery] = useState<{
    productName: string; category: string; baseMargin: number; currentMargin: number;
    delta: number; revenueAtRisk: number; oilPrice: number; freightSurcharge: number;
    disruptionLevel: number; origin: string;
  } | null>(null);

  // Fetch live defaults
  const { data: defaults } = trpc.marginCalculator.getDefaults.useQuery(undefined, {
    refetchInterval: 5 * 60 * 60 * 1000, // 5 hours
    staleTime: 5 * 60 * 60 * 1000 - 60_000, // stale 1 min before TTL
    refetchOnWindowFocus: false,
  });

  // Apply live defaults once loaded
  useEffect(() => {
    if (defaults) {
      setOilPrice(defaults.oilPrice);
      setFreightSurcharge(defaults.freightSurcharge);
      setDisruptionLevel(defaults.disruptionLevel);
    }
  }, [defaults]);

  // Client-side calculation (instant, no server round-trip)
  const result = useMemo(() => calculateMargins({
    unitCost, sellingPrice, unitsPerMonth, containerIndex,
    oilPrice, freightSurcharge, disruptionLevel,
  }), [unitCost, sellingPrice, unitsPerMonth, containerIndex, oilPrice, freightSurcharge, disruptionLevel]);

  // AI insight (only fetched when user explicitly requests it)
  const { data: insightData, isFetching: insightLoading } = trpc.marginCalculator.getInsight.useQuery(
    insightQuery ?? {
      productName: "My Product", category: "Electronics", baseMargin: 0, currentMargin: 0,
      delta: 0, revenueAtRisk: 0, oilPrice: 82, freightSurcharge: 15, disruptionLevel: 1, origin: "China",
    },
    { enabled: insightQuery !== null, staleTime: 0 }
  );

  const requestInsight = useCallback(() => {
    setInsightQuery({
      productName, category, baseMargin: result.baseMargin, currentMargin: result.currentMargin,
      delta: result.delta, revenueAtRisk: result.revenueAtRisk,
      oilPrice, freightSurcharge, disruptionLevel, origin,
    });
  }, [productName, category, result, oilPrice, freightSurcharge, disruptionLevel, origin]);

  // Colour helpers
  const deltaColor = result.delta >= 0 ? "#22c55e" : result.delta > -5 ? "#f59e0b" : "#ef4444";
  const currentMarginColor = result.currentMargin >= 30 ? "#22c55e" : result.currentMargin >= 15 ? "#f59e0b" : "#ef4444";

  // Waterfall base width (how many % per pixel)
  const waterfallBase = result.baseMargin > 0 ? 100 / result.baseMargin : 2;

  const selectStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.75rem",
    padding: "6px 10px",
    width: "100%",
    outline: "none",
  };

  const inputStyle = {
    ...selectStyle,
    appearance: "none" as const,
  };

  const labelStyle = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.65rem",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    marginBottom: 4,
    display: "block",
  };

  return (
    <div style={{
      background: "rgba(10,14,26,0.85)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      margin: "0 0 24px 0",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: "pointer", userSelect: "none",
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.9)" }}>
            MARGIN IMPACT CALCULATOR
          </span>
          <span style={{
            background: "#22c55e22", border: "1px solid #22c55e55",
            borderRadius: 4, padding: "1px 7px",
            fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "#22c55e", letterSpacing: "0.08em",
          }}>
            LIVE
          </span>
          {defaults && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>
              Oil ${defaults.oilPrice} · Freight +{defaults.freightSurcharge}% · Disruption {DISRUPTION_LABELS[defaults.disruptionLevel]}
            </span>
          )}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)" }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div style={{ display: "flex", gap: 0 }}>
          {/* ── LEFT: Input Panel ── */}
          <div style={{
            width: 300, flexShrink: 0, padding: "20px",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Product Name</label>
              <input
                style={inputStyle}
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Running Shoes"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Category</label>
              <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Unit Cost ($)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={unitCost}
                  onChange={e => setUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Selling Price ($)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={sellingPrice}
                  onChange={e => setSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Origin Country</label>
              <select style={selectStyle} value={origin} onChange={e => setOrigin(e.target.value)}>
                {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Container</label>
                <select style={selectStyle} value={containerIndex} onChange={e => setContainerIndex(parseInt(e.target.value))}>
                  {CONTAINER_TYPES.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Units / Month</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  value={unitsPerMonth}
                  onChange={e => setUnitsPerMonth(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>

            {/* Scenario Sliders */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                SCENARIO SLIDERS
              </div>

              {/* Oil Price */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Oil Price (WTI)</label>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.75rem", color: "#f59e0b" }}>
                    ${oilPrice}/bbl
                  </span>
                </div>
                <input
                  type="range" min={55} max={130} step={1}
                  value={oilPrice}
                  onChange={e => setOilPrice(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#f59e0b" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", color: "rgba(255,255,255,0.25)" }}>
                  <span>$55</span><span>$130</span>
                </div>
              </div>

              {/* Freight Surcharge */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Freight Surcharge</label>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.75rem", color: "#60a5fa" }}>
                    +{freightSurcharge}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={50} step={1}
                  value={freightSurcharge}
                  onChange={e => setFreightSurcharge(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#60a5fa" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: "0.58rem", color: "rgba(255,255,255,0.25)" }}>
                  <span>0%</span><span>50%</span>
                </div>
              </div>

              {/* Disruption Level */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Disruption Severity</label>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.75rem", color: DISRUPTION_COLORS[disruptionLevel] }}>
                    {DISRUPTION_LABELS[disruptionLevel]}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {DISRUPTION_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setDisruptionLevel(i)}
                      style={{
                        flex: 1,
                        padding: "5px 0",
                        borderRadius: 5,
                        border: `1px solid ${disruptionLevel === i ? DISRUPTION_COLORS[i] : "rgba(255,255,255,0.1)"}`,
                        background: disruptionLevel === i ? `${DISRUPTION_COLORS[i]}22` : "transparent",
                        color: disruptionLevel === i ? DISRUPTION_COLORS[i] : "rgba(255,255,255,0.4)",
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Results Panel ── */}
          <div style={{ flex: 1, padding: "20px", minWidth: 0 }}>
            {/* KPI Cards */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <KpiCard
                label="Base Margin"
                value={`${result.baseMargin.toFixed(1)}%`}
                sub="Before logistics costs"
                color="rgba(255,255,255,0.7)"
              />
              <KpiCard
                label="Current Margin"
                value={`${result.currentMargin.toFixed(1)}%`}
                sub="After all cost factors"
                color={currentMarginColor}
              />
              <KpiCard
                label="Margin Delta"
                value={`${result.delta >= 0 ? "+" : ""}${result.delta.toFixed(1)}pp`}
                sub={result.delta >= 0 ? "Margin holding" : "Margin erosion"}
                color={deltaColor}
              />
            </div>

            {/* Waterfall Chart */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              padding: "14px 16px",
              marginBottom: 16,
            }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                COST EROSION WATERFALL
              </div>
              <WaterfallBar label="Base Margin" value={result.baseMargin} color="rgba(255,255,255,0.6)" baseWidth={waterfallBase} isTotal />
              <WaterfallBar label="Freight Cost" value={-result.freightImpact} color="#ef4444" baseWidth={waterfallBase} />
              <WaterfallBar label="Oil Surcharge" value={-result.oilImpact} color="#f59e0b" baseWidth={waterfallBase} />
              <WaterfallBar label="Disruption" value={-result.disruptionImpact} color="#a855f7" baseWidth={waterfallBase} />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 0" }} />
              <WaterfallBar label="Current Margin" value={result.currentMargin} color={currentMarginColor} baseWidth={waterfallBase} isTotal />
            </div>

            {/* Monthly Impact Summary */}
            <div style={{
              display: "flex", gap: 12, marginBottom: 16,
            }}>
              {[
                { label: "Revenue at Risk", value: `$${result.revenueAtRisk.toLocaleString()}`, icon: <TrendingDown size={14} color="#ef4444" />, color: "#ef4444" },
                { label: "Units Affected", value: result.unitsAffected.toLocaleString(), icon: <Minus size={14} color="#f59e0b" />, color: "#f59e0b" },
                { label: "Break-even Price", value: `$${result.breakEvenPrice.toFixed(2)}`, icon: <TrendingUp size={14} color="#60a5fa" />, color: "#60a5fa" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  {icon}
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.1rem", color }}>
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Insight Strip */}
            <div style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <Lightbulb size={15} color="#818cf8" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {insightQuery === null ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                      Click to get an AI-powered recommendation for this scenario
                    </span>
                    <button
                      onClick={requestInsight}
                      style={{
                        background: "rgba(99,102,241,0.2)",
                        border: "1px solid rgba(99,102,241,0.4)",
                        borderRadius: 5,
                        color: "#818cf8",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.65rem",
                        padding: "3px 10px",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Get Insight
                    </button>
                  </div>
                ) : insightLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <RefreshCw size={12} color="#818cf8" style={{ animation: "spin 1s linear infinite" }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                      Analysing your scenario…
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.5, flex: 1 }}>
                      {insightData?.insight ?? "No insight available for this scenario."}
                    </span>
                    <button
                      onClick={() => setInsightQuery(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.3)",
                        cursor: "pointer",
                        padding: 0,
                        flexShrink: 0,
                        fontSize: "0.65rem",
                      }}
                      title="Refresh insight"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=range] { height: 4px; cursor: pointer; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
      `}</style>
    </div>
  );
}
