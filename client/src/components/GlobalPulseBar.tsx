/* GlobalPulseBar — Margin Sentinel
 * Design: Dark Intelligence theme — orange/amber accent, monospace data values
 * Live data from tRPC marketData.pulseBar (9 real symbols + port congestion)
 * Auto-refreshes every 60s; falls back to static values if API is unavailable
 */
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, X, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { clarityEvent } from "@/lib/clarity";

// ─── types ────────────────────────────────────────────────────────────────────

interface DisplayTicker {
  label: string;
  value: string;
  changePct: string;
  trend: "up" | "down" | "neutral";
  status?: string;
  statusColor?: string;
  isLive: boolean;
}

// ─── static fallback (shown while loading or on API error) ───────────────────

const FALLBACK: DisplayTicker[] = [
  { label: "BRENT CRUDE",      value: "$84.50",  changePct: "+3.1%",  trend: "up",      isLive: false },
  { label: "WTI CRUDE",        value: "$80.25",  changePct: "+2.3%",  trend: "up",      isLive: false },
  { label: "NATURAL GAS",      value: "$3.12",   changePct: "+10.3%", trend: "up",      isLive: false },
  { label: "GOLD",             value: "$2,950",  changePct: "-0.3%",  trend: "down",    isLive: false },
  { label: "DRY BULK FREIGHT", value: "$12.22",  changePct: "+3.8%",  trend: "up",      isLive: false },
  { label: "ZIM SHIPPING",     value: "$28.83",  changePct: "+0.6%",  trend: "up",      isLive: false },
  { label: "MAERSK",           value: "17,025",  changePct: "+11.0%", trend: "up",      isLive: false },
  { label: "CH ROBINSON",      value: "$187.24", changePct: "+5.7%",  trend: "up",      isLive: false },
  { label: "ENERGY ETF",       value: "$57.04",  changePct: "+3.4%",  trend: "up",      isLive: false },
  { label: "US PORT CONGESTION", value: "", changePct: "", trend: "neutral", status: "Amber", statusColor: "#f59e0b", isLive: false },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(price: number, unit: string): string {
  const prefix = unit.startsWith("$") ? "$" : unit.startsWith("€") ? "€" : "";
  if (price >= 10000) return prefix + price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100)   return prefix + price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return prefix + price.toFixed(2);
}

function fmtPct(pct: number): string {
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}

function portColor(level: 1 | 2 | 3): string {
  return level === 3 ? "#ef4444" : level === 2 ? "#f59e0b" : "#10b981";
}

// ─── sub-component ────────────────────────────────────────────────────────────

function TickerCell({ item }: { item: DisplayTicker }) {
  const trendColor =
    item.trend === "up" ? "#10b981" : item.trend === "down" ? "#ef4444" : "#6b7280";

  return (
    <div className="flex items-center gap-2 px-5 border-r border-white/10 shrink-0">
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </span>

      {item.isLive && (
        <span
          style={{
            fontSize: "0.52rem",
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
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.9)",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {item.value}
          </span>
          <span
            className="flex items-center gap-1"
            style={{
              color: trendColor,
              fontSize: "0.75rem",
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: "nowrap",
            }}
          >
            {item.trend === "up" ? (
              <TrendingUp size={11} />
            ) : item.trend === "down" ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            {item.changePct}
          </span>
        </>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function GlobalPulseBar() {
  const [dismissed, setDismissed] = useState(false);
  const { isMobile } = useBreakpoint();

  const { data, isLoading, refetch, dataUpdatedAt } = trpc.marketData.pulseBar.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every 60 seconds
    staleTime: 55_000,
  });

  // Build display items from live tickers
  const liveItems: DisplayTicker[] = data
    ? [
        ...data.tickers.map((t) => ({
          label:     t.label,
          value:     fmtPrice(t.price, t.unit),
          changePct: fmtPct(t.changePct),
          trend:     (t.changePct > 0 ? "up" : t.changePct < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
          isLive:    true,
        })),
        {
          label:       data.usPortCongestion.label,
          value:       "",
          changePct:   "",
          trend:       "neutral" as const,
          status:      data.usPortCongestion.status,
          statusColor: portColor(data.usPortCongestion.level),
          isLive:      true,
        },
      ]
    : FALLBACK;

  // Duplicate for seamless infinite scroll
  const allItems = [...liveItems, ...liveItems];

  if (dismissed) return null;

  return (
    <div
      style={{
        background: "rgba(10, 14, 26, 0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        height: isMobile ? "38px" : "44px",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Datajar gradient label */}
      <div
        style={{
          background: "linear-gradient(90deg, #E91E8C 0%, #f97316 100%)",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: isMobile ? "0 10px" : "0 16px",
          flexShrink: 0,
          zIndex: 2,
          gap: "6px",
        }}
      >
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? "0.62rem" : "0.72rem",
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.95)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {isMobile ? "PULSE" : "GLOBAL PULSE BAR"}
        </span>
      </div>

      {/* Live indicator — clickable to force refresh */}
      <button
        onClick={() => { refetch(); clarityEvent("pulse_bar_refreshed"); }}
        title={data ? `Live — updated ${new Date(dataUpdatedAt).toLocaleTimeString()}. Click to refresh.` : "Click to refresh prices"}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 12px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        {isLoading ? (
          <RefreshCw size={12} className="animate-spin" style={{ color: "#E91E8C" }} />
        ) : (
          <div
            className="animate-blink"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: data ? "#10b981" : "#f59e0b",
              boxShadow: `0 0 6px ${data ? "#10b981" : "#f59e0b"}`,
            }}
          />
        )}
      </button>

      {/* Scrolling ticker track */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div className="ms-ticker-track">
          {allItems.map((item, i) => (
            <TickerCell key={i} item={item} />
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
