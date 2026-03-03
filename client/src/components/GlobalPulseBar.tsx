/* GlobalPulseBar — Margin Sentinel
 * Design: Dark Intelligence theme — orange/amber accent, monospace data values
 * Live data from tRPC marketData.pulseBar, falls back to simulated values
 */
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, X, RefreshCw } from "lucide-react";
import { usePulseBar } from "@/hooks/useMarketData";

interface TickerItem {
  label: string;
  value: string;
  change: string;
  changePercent: string;
  trend: "up" | "down" | "neutral";
  status?: string;
  statusColor?: string;
  isLive?: boolean;
}

const FALLBACK_DATA: TickerItem[] = [
  { label: "BRENT CRUDE", value: "$84.50", change: "+2.60", changePercent: "+3.1%", trend: "up" },
  { label: "FBX CONTAINER INDEX", value: "$4,120", change: "+97", changePercent: "+2.4%", trend: "up" },
  { label: "US PORT CONGESTION", value: "", change: "", changePercent: "", trend: "neutral", status: "Amber", statusColor: "#f59e0b" },
  { label: "WTI CRUDE", value: "$80.25", change: "+1.85", changePercent: "+2.3%", trend: "up" },
  { label: "SHANGHAI FREIGHT", value: "$2,890", change: "-45", changePercent: "-1.5%", trend: "down" },
  { label: "BALTIC DRY INDEX", value: "1,842", change: "+23", changePercent: "+1.3%", trend: "up" },
  { label: "EU CARBON PRICE", value: "€62.40", change: "-0.80", changePercent: "-1.3%", trend: "down" },
  { label: "SUEZ CANAL STATUS", value: "", change: "", changePercent: "", trend: "neutral", status: "Disrupted", statusColor: "#ef4444" },
];

function formatPrice(price: number, prefix = "$", decimals = 2): string {
  if (price >= 1000) {
    return prefix + price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return prefix + price.toFixed(decimals);
}

function formatChange(change: number, decimals = 2): string {
  return (change >= 0 ? "+" : "") + change.toFixed(decimals);
}

function formatPct(pct: number): string {
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}

function TickerItemDisplay({ item }: { item: TickerItem }) {
  const trendColor =
    item.trend === "up" ? "#10b981" : item.trend === "down" ? "#ef4444" : "#6b7280";

  return (
    <div className="flex items-center gap-3 px-6 border-r border-white/10 shrink-0">
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
        }}
      >
        {item.label}
      </span>
      {item.isLive && (
        <span
          style={{
            fontSize: "0.55rem",
            color: "#10b981",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            letterSpacing: "0.1em",
            background: "rgba(16,185,129,0.12)",
            padding: "1px 4px",
            borderRadius: "3px",
          }}
        >
          LIVE
        </span>
      )}
      {item.status ? (
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            color: item.statusColor,
            letterSpacing: "0.04em",
          }}
        >
          {item.status}
        </span>
      ) : (
        <>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.9)",
              fontWeight: 500,
            }}
          >
            {item.value}
          </span>
          <span
            className="flex items-center gap-1"
            style={{ color: trendColor, fontSize: "0.78rem", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {item.trend === "up" ? (
              <TrendingUp size={12} />
            ) : item.trend === "down" ? (
              <TrendingDown size={12} />
            ) : (
              <Minus size={12} />
            )}
            {item.changePercent}
          </span>
        </>
      )}
    </div>
  );
}

export default function GlobalPulseBar() {
  const [dismissed, setDismissed] = useState(false);
  const [simulatedData, setSimulatedData] = useState(FALLBACK_DATA);

  // Live data from tRPC
  const { data: liveData, isLoading, dataUpdatedAt } = usePulseBar();

  // Build ticker items from live data when available
  const liveTickerItems: TickerItem[] = liveData
    ? [
        {
          label: liveData.brentCrude.label,
          value: formatPrice(liveData.brentCrude.price),
          change: formatChange(liveData.brentCrude.change),
          changePercent: formatPct(liveData.brentCrude.changePct),
          trend: liveData.brentCrude.changePct >= 0 ? "up" : "down",
          isLive: true,
        },
        {
          label: liveData.fbxContainer.label,
          value: formatPrice(liveData.fbxContainer.price, "", 0),
          change: formatChange(liveData.fbxContainer.change, 0),
          changePercent: formatPct(liveData.fbxContainer.changePct),
          trend: liveData.fbxContainer.changePct >= 0 ? "up" : "down",
          isLive: true,
        },
        {
          label: liveData.usPortCongestion.label,
          value: "",
          change: "",
          changePercent: "",
          trend: "neutral",
          status: liveData.usPortCongestion.status,
          statusColor:
            liveData.usPortCongestion.level === 3
              ? "#ef4444"
              : liveData.usPortCongestion.level === 2
              ? "#f59e0b"
              : "#10b981",
        },
        {
          label: liveData.wtiCrude.label,
          value: formatPrice(liveData.wtiCrude.price),
          change: formatChange(liveData.wtiCrude.change),
          changePercent: formatPct(liveData.wtiCrude.changePct),
          trend: liveData.wtiCrude.changePct >= 0 ? "up" : "down",
          isLive: true,
        },
        // Keep static items for non-API data
        { label: "SHANGHAI FREIGHT", value: "$2,890", change: "-45", changePercent: "-1.5%", trend: "down" },
        { label: "EU CARBON PRICE", value: "€62.40", change: "-0.80", changePercent: "-1.3%", trend: "down" },
        { label: "SUEZ CANAL STATUS", value: "", change: "", changePercent: "", trend: "neutral", status: "Disrupted", statusColor: "#ef4444" },
      ]
    : simulatedData;

  // Simulate micro-fluctuations when no live data
  useEffect(() => {
    if (liveData) return; // skip simulation when live data is available
    const interval = setInterval(() => {
      setSimulatedData((prev) =>
        prev.map((item) => {
          if (item.trend === "neutral" || !item.value) return item;
          const base = parseFloat(item.value.replace(/[$,€]/g, ""));
          const fluctuation = (Math.random() - 0.48) * base * 0.002;
          const newBase = base + fluctuation;
          const prefix = item.value.match(/^[$€]/)?.[0] || "";
          const formatted =
            newBase > 1000
              ? prefix + newBase.toLocaleString("en-US", { maximumFractionDigits: 0 })
              : prefix + newBase.toFixed(2);
          const changePct = ((fluctuation / base) * 100).toFixed(1);
          return {
            ...item,
            value: formatted,
            change: (fluctuation >= 0 ? "+" : "") + fluctuation.toFixed(2),
            changePercent: (fluctuation >= 0 ? "+" : "") + changePct + "%",
            trend: fluctuation >= 0 ? "up" : "down",
          };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [liveData]);

  if (dismissed) return null;

  const allItems = [...liveTickerItems, ...liveTickerItems];

  return (
    <div
      style={{
        background: "rgba(10, 14, 26, 0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        height: "44px",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Label */}
      <div
        style={{
          background: "#f97316",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          flexShrink: 0,
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            color: "rgba(0,0,0,0.85)",
            textTransform: "uppercase",
          }}
        >
          GLOBAL PULSE BAR
        </span>
      </div>

      {/* Live dot / loading indicator */}
      {isLoading ? (
        <RefreshCw
          size={12}
          className="animate-spin"
          style={{ color: "#f97316", margin: "0 12px", flexShrink: 0 }}
        />
      ) : (
        <div
          className="animate-blink"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: liveData ? "#10b981" : "#f59e0b",
            margin: "0 12px",
            flexShrink: 0,
            boxShadow: `0 0 6px ${liveData ? "#10b981" : "#f59e0b"}`,
          }}
          title={liveData ? `Live data — updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : "Simulated data"}
        />
      )}

      {/* Scrolling ticker */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div className="ms-ticker-track">
          {allItems.map((item, i) => (
            <TickerItemDisplay key={i} item={item} />
          ))}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          padding: "0 12px",
          color: "rgba(255,255,255,0.3)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
        className="hover:text-white/60 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
