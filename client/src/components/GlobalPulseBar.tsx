/* GlobalPulseBar — Margin Sentinel
 * Design: Dark Intelligence theme — orange/amber accent, monospace data values
 * Animated ticker showing Brent Crude, FBX Container Index, US Port Congestion
 */
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";

interface TickerItem {
  label: string;
  value: string;
  change: string;
  changePercent: string;
  trend: "up" | "down" | "neutral";
  status?: string;
  statusColor?: string;
}

const initialData: TickerItem[] = [
  {
    label: "BRENT CRUDE",
    value: "$84.50",
    change: "+2.60",
    changePercent: "+3.1%",
    trend: "up",
  },
  {
    label: "FBX CONTAINER INDEX",
    value: "$4,120",
    change: "+97",
    changePercent: "+2.4%",
    trend: "up",
  },
  {
    label: "US PORT CONGESTION",
    value: "",
    change: "",
    changePercent: "",
    trend: "neutral",
    status: "Amber",
    statusColor: "#f59e0b",
  },
  {
    label: "WTI CRUDE",
    value: "$80.25",
    change: "+1.85",
    changePercent: "+2.3%",
    trend: "up",
  },
  {
    label: "SHANGHAI FREIGHT",
    value: "$2,890",
    change: "-45",
    changePercent: "-1.5%",
    trend: "down",
  },
  {
    label: "BALTIC DRY INDEX",
    value: "1,842",
    change: "+23",
    changePercent: "+1.3%",
    trend: "up",
  },
  {
    label: "EU CARBON PRICE",
    value: "€62.40",
    change: "-0.80",
    changePercent: "-1.3%",
    trend: "down",
  },
  {
    label: "SUEZ CANAL STATUS",
    value: "",
    change: "",
    changePercent: "",
    trend: "neutral",
    status: "Disrupted",
    statusColor: "#ef4444",
  },
];

function TickerItemDisplay({ item }: { item: TickerItem }) {
  const trendColor =
    item.trend === "up"
      ? "#10b981"
      : item.trend === "down"
      ? "#ef4444"
      : "#6b7280";

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
  const [liveData, setLiveData] = useState(initialData);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData((prev) =>
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
          const changeVal = fluctuation;
          const changePct = ((changeVal / base) * 100).toFixed(1);
          return {
            ...item,
            value: formatted,
            change: (changeVal >= 0 ? "+" : "") + changeVal.toFixed(2),
            changePercent: (changeVal >= 0 ? "+" : "") + changePct + "%",
            trend: changeVal >= 0 ? "up" : "down",
          };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed) return null;

  // Duplicate items for seamless loop
  const allItems = [...liveData, ...liveData];

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

      {/* Live dot */}
      <div
        className="animate-blink"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#10b981",
          margin: "0 12px",
          flexShrink: 0,
          boxShadow: "0 0 6px #10b981",
        }}
      />

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
