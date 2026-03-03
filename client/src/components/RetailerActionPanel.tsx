/* RetailerActionPanel — Margin Sentinel
 * Design: Dark Intelligence — right sidebar panel
 * Sections: My Watchlist, Alerts, Landing Cost Calculator
 */
import { useState, useEffect } from "react";
import { MoreHorizontal, X, Plus, AlertTriangle, Calculator, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface WatchlistItem {
  id: string;
  name: string;
  risk: "high" | "medium" | "low";
  change: string;
}

const initialWatchlist: WatchlistItem[] = [
  { id: "1", name: "Electronics", risk: "high", change: "+4.2%" },
  { id: "2", name: "Apparel", risk: "medium", change: "+2.8%" },
  { id: "3", name: "Toys", risk: "high", change: "+3.5%" },
];

const ORIGINS = [
  { value: "china", label: "China (Shanghai)" },
  { value: "vietnam", label: "Vietnam (Ho Chi Minh)" },
  { value: "india", label: "India (Mumbai)" },
  { value: "germany", label: "Germany (Hamburg)" },
  { value: "mexico", label: "Mexico (Veracruz)" },
];

const BASE_COSTS: Record<string, number> = {
  china: 180,
  vietnam: 165,
  india: 155,
  germany: 210,
  mexico: 140,
};

const DISRUPTION_MULTIPLIERS: Record<string, number> = {
  china: 1.24,
  vietnam: 1.18,
  india: 1.15,
  germany: 1.22,
  mexico: 1.12,
};

export default function RetailerActionPanel() {
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [alertCount] = useState(2);

  // Calculator state
  const [calcItem, setCalcItem] = useState("Electronics Item");
  const [calcOrigin, setCalcOrigin] = useState("china");
  const [calcDate, setCalcDate] = useState("2022-09-20");
  const [calcResult, setCalcResult] = useState<{
    landedCost: number;
    marginChange: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateCost = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const base = BASE_COSTS[calcOrigin] || 180;
      const multiplier = DISRUPTION_MULTIPLIERS[calcOrigin] || 1.2;
      const landedCost = Math.round(base * multiplier * 10) / 10;
      const marginChange = -((multiplier - 1) * 5.5);
      setCalcResult({ landedCost, marginChange: Math.round(marginChange * 10) / 10 });
      setIsCalculating(false);
    }, 800);
  };

  const removeWatchlistItem = (id: string) => {
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
  };

  const addWatchlistItem = () => {
    toast.info("Add category — coming soon");
  };

  const getRiskColor = (risk: string) => {
    if (risk === "high") return "#ef4444";
    if (risk === "medium") return "#f59e0b";
    return "#10b981";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
      }}
    >
      {/* === MY WATCHLIST === */}
      <div className="ms-panel">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span className="panel-header">RETAILER ACTION PANEL</span>
          <button
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        <div style={{ padding: "10px 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span className="section-label">MY WATCHLIST</span>
            <button
              onClick={addWatchlistItem}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "0.65rem",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {watchlist.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "5px",
                  padding: "7px 10px",
                  transition: "background 0.15s",
                }}
                className="hover:bg-white/[0.07]"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: getRiskColor(item.risk),
                      boxShadow: `0 0 5px ${getRiskColor(item.risk)}`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.72rem",
                      color: "#f97316",
                    }}
                  >
                    {item.change}
                  </span>
                  <button
                    onClick={() => removeWatchlistItem(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.2)",
                      cursor: "pointer",
                      padding: "0",
                      display: "flex",
                    }}
                    className="hover:text-white/50"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts section */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span className="section-label">ALERTS</span>
            <button
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}
            >
              <MoreHorizontal size={14} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "6px",
              padding: "8px 10px",
              cursor: "pointer",
            }}
            onClick={() => toast.error(`${alertCount} Critical Margin Risks detected — review required`, { duration: 4000 })}
          >
            <span className="alert-badge">{alertCount}</span>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: "0.82rem",
                color: "#ef4444",
                letterSpacing: "0.02em",
              }}
            >
              {alertCount} Critical Margin Risks
            </span>
          </div>
        </div>
      </div>

      {/* === LANDING COST CALCULATOR === */}
      <div className="ms-panel" style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calculator size={14} style={{ color: "#f97316" }} />
            <span className="panel-header">LANDING COST CALCULATOR</span>
          </div>
          <button
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "12px 14px" }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "12px",
            }}
          >
            Interactive information
          </div>

          {/* Item input */}
          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Item
            </label>
            <input
              type="text"
              value={calcItem}
              onChange={(e) => setCalcItem(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "5px",
                padding: "7px 10px",
                color: "rgba(255,255,255,0.8)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.78rem",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(249,115,22,0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          {/* Origin select */}
          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Origin
            </label>
            <select
              value={calcOrigin}
              onChange={(e) => setCalcOrigin(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "5px",
                padding: "7px 10px",
                color: "rgba(255,255,255,0.8)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.78rem",
                outline: "none",
                cursor: "pointer",
                appearance: "none",
              }}
            >
              {ORIGINS.map((o) => (
                <option key={o.value} value={o.value} style={{ background: "#111827" }}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ship date */}
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
              }}
            >
              Ship Date
            </label>
            <input
              type="date"
              value={calcDate}
              onChange={(e) => setCalcDate(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "5px",
                padding: "7px 10px",
                color: "rgba(255,255,255,0.8)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.78rem",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>

          {/* Calculate button */}
          <button
            onClick={calculateCost}
            disabled={isCalculating}
            style={{
              width: "100%",
              background: isCalculating
                ? "rgba(249,115,22,0.3)"
                : "linear-gradient(135deg, #f97316, #ea580c)",
              border: "none",
              borderRadius: "5px",
              padding: "9px",
              color: "white",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.82rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: isCalculating ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              boxShadow: isCalculating ? "none" : "0 0 12px rgba(249,115,22,0.3)",
              marginBottom: "12px",
            }}
          >
            {isCalculating ? "CALCULATING..." : "CALCULATE LANDED COST"}
          </button>

          {/* Results */}
          {calcResult && (
            <div
              className="animate-slide-in"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "6px",
                padding: "12px",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase",
                    marginBottom: "2px",
                  }}
                >
                  EST. TOTAL LANDED COST
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "1.4rem",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  ${calcResult.landedCost.toFixed(2)}
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  paddingTop: "10px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase",
                    marginBottom: "2px",
                  }}
                >
                  PROJECTED MARGIN CHANGE
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <TrendingDown size={16} style={{ color: "#ef4444" }} />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "1.1rem",
                      fontWeight: 500,
                      color: "#ef4444",
                    }}
                  >
                    ({calcResult.marginChange.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
