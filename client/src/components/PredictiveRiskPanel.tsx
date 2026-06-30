/**
 * Predictive Risk Panel
 *
 * Displays 30-day and 60-day disruption probability forecasts for all freight lanes,
 * ranked by risk. Powered by LLM reasoning over live disruption signals.
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  Brain,
  BarChart2,
  Flame,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LaneForecast {
  laneId: number;
  laneName: string;
  originPort: string;
  destinationPort: string;
  zones: string[];
  probability30d: number;
  probability60d: number;
  trend: "rising" | "stable" | "falling";
  keyRisks: string[];
  confidence: "high" | "medium" | "low";
  summary: string;
  generatedAt: string;
  sparkline: number[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function probColor(p: number): string {
  if (p >= 65) return "#ef4444";
  if (p >= 40) return "#f59e0b";
  return "#10b981";
}

function probLabel(p: number): string {
  if (p >= 65) return "HIGH";
  if (p >= 40) return "MODERATE";
  return "LOW";
}

function trendIcon(trend: "rising" | "stable" | "falling") {
  if (trend === "rising") return <TrendingUp size={12} color="#ef4444" />;
  if (trend === "falling") return <TrendingDown size={12} color="#10b981" />;
  return <Minus size={12} color="rgba(255,255,255,0.3)" />;
}

function trendColor(trend: "rising" | "stable" | "falling"): string {
  if (trend === "rising") return "#ef4444";
  if (trend === "falling") return "#10b981";
  return "rgba(255,255,255,0.3)";
}

function confidenceBadge(conf: "high" | "medium" | "low") {
  const cfg = {
    high: {
      label: "HIGH CONF",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.25)",
      color: "#10b981",
    },
    medium: {
      label: "MED CONF",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.25)",
      color: "#f59e0b",
    },
    low: {
      label: "LOW CONF",
      bg: "rgba(255,255,255,0.05)",
      border: "rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.3)",
    },
  }[conf];
  return (
    <span
      style={{
        padding: "1px 5px",
        borderRadius: "3px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: "0.58rem",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return (
      <div
        style={{
          width: 48,
          height: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.2)" }}>
          —
        </span>
      </div>
    );
  }

  const W = 48;
  const H = 18;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");
  const lastPt = pts[pts.length - 1].split(",");

  return (
    <svg width={W} height={H} style={{ overflow: "visible", flexShrink: 0 }}>
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      <circle
        cx={parseFloat(lastPt[0])}
        cy={parseFloat(lastPt[1])}
        r="2"
        fill={color}
      />
    </svg>
  );
}

// ─── Probability Bar ──────────────────────────────────────────────────────────

function ProbBar({ value, width = 100 }: { value: number; width?: number }) {
  const color = probColor(value);
  return (
    <div
      style={{
        width,
        height: 4,
        borderRadius: 2,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: color,
          borderRadius: 2,
          transition: "width 0.4s ease",
          boxShadow: `0 0 6px ${color}60`,
        }}
      />
    </div>
  );
}

// ─── Lane Row ─────────────────────────────────────────────────────────────────

function LaneRow({ forecast, rank }: { forecast: LaneForecast; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = probColor(forecast.probability30d);

  return (
    <>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: "grid",
          gridTemplateColumns: "20px 1fr 80px 60px 48px 36px 20px",
          alignItems: "center",
          gap: "8px",
          padding: "7px 10px",
          borderRadius: "5px",
          background: expanded ? "rgba(255,255,255,0.03)" : "transparent",
          border: `1px solid ${expanded ? "rgba(255,255,255,0.07)" : "transparent"}`,
          cursor: "pointer",
          transition: "all 0.12s",
        }}
      >
        {/* Rank */}
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.65rem",
            color: rank <= 3 ? color : "rgba(255,255,255,0.2)",
          }}
        >
          {rank}
        </span>

        {/* Lane name + 30d bar */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.8)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: "3px",
            }}
          >
            {forecast.laneName}
          </div>
          <ProbBar value={forecast.probability30d} />
        </div>

        {/* 30d probability */}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              color,
            }}
          >
            {forecast.probability30d}%
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.55rem",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            {probLabel(forecast.probability30d)}
          </div>
        </div>

        {/* 60d probability */}
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: "0.75rem",
              color: probColor(forecast.probability60d),
              opacity: 0.75,
            }}
          >
            {forecast.probability60d}%
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.55rem",
              color: "rgba(255,255,255,0.2)",
            }}
          >
            60d
          </div>
        </div>

        {/* Sparkline */}
        <Sparkline data={forecast.sparkline} color={color} />

        {/* Trend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {trendIcon(forecast.trend)}
        </div>

        {/* Expand chevron */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {expanded ? (
            <ChevronUp size={12} color="rgba(255,255,255,0.3)" />
          ) : (
            <ChevronDown size={12} color="rgba(255,255,255,0.2)" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            margin: "0 10px 4px 28px",
            padding: "8px 10px",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderTop: "none",
          }}
        >
          {/* Summary */}
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.55)",
              margin: "0 0 6px 0",
              lineHeight: 1.4,
            }}
          >
            {forecast.summary}
          </p>

          {/* Key risks */}
          {forecast.keyRisks.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                marginBottom: "6px",
              }}
            >
              {forecast.keyRisks.map((risk, i) => (
                <span
                  key={i}
                  style={{
                    padding: "2px 6px",
                    borderRadius: "3px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.62rem",
                  }}
                >
                  {risk}
                </span>
              ))}
            </div>
          )}

          {/* Metadata row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {confidenceBadge(forecast.confidence)}
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.2)",
              }}
            >
              Trend:{" "}
              <span style={{ color: trendColor(forecast.trend) }}>
                {forecast.trend}
              </span>
            </span>
            {forecast.zones.length > 0 && (
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.6rem",
                  color: "rgba(255,255,255,0.2)",
                }}
              >
                Zones: {forecast.zones.join(", ")}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function PredictiveRiskPanel() {
  const [forceRefresh, setForceRefresh] = useState(false);

  const { data, isLoading, isFetching, refetch } =
    trpc.predictiveRisk.getAllForecasts.useQuery(
      { forceRefresh },
      {
        staleTime: 25 * 60 * 1000, // 25 min — slightly under the 30-min server cache
        refetchInterval: 30 * 60 * 1000,
      }
    );

  const handleRefresh = useCallback(() => {
    setForceRefresh(true);
    refetch();
    if (typeof window !== "undefined" && (window as any).clarity) {
      (window as any).clarity("event", "predictive_risk_refreshed");
    }
    setTimeout(() => setForceRefresh(false), 1000);
  }, [refetch]);

  const forecasts: LaneForecast[] = data?.forecasts ?? [];

  // ── KPI derivations ──────────────────────────────────────────────────────────
  const highestRisk = forecasts[0] ?? null;
  const avgProb30d =
    forecasts.length > 0
      ? Math.round(
          forecasts.reduce((s, f) => s + f.probability30d, 0) / forecasts.length
        )
      : 0;
  const risingCount = forecasts.filter(f => f.trend === "rising").length;

  const isActive = !isLoading && forecasts.length > 0;

  return (
    <div className="ms-panel" style={{ padding: "14px 16px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Brain size={14} color="#E91E8C" />
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            30-Day Risk Forecast
          </span>
          <span
            style={{
              padding: "1px 6px",
              borderRadius: "3px",
              background: "rgba(233,30,140,0.12)",
              border: "1px solid rgba(233,30,140,0.25)",
              color: "#E91E8C",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.55rem",
              letterSpacing: "0.06em",
            }}
          >
            PREDICTIVE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {data?.generatedAt && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.2)",
              }}
            >
              Updated {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: isFetching ? "not-allowed" : "pointer",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.65rem",
              opacity: isFetching ? 0.5 : 1,
            }}
          >
            <RefreshCw size={10} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {isActive && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          {/* Highest risk lane */}
          <div
            style={{
              padding: "8px 10px",
              borderRadius: "5px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.12)",
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.58rem",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "3px",
              }}
            >
              Highest Risk Lane
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.8rem",
                color: probColor(highestRisk?.probability30d ?? 0),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {highestRisk?.laneName ?? "—"}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.62rem",
                color: "rgba(255,255,255,0.3)",
                marginTop: "1px",
              }}
            >
              {highestRisk ? `${highestRisk.probability30d}% probability` : "—"}
            </div>
          </div>

          {/* Avg 30d probability */}
          <div
            style={{
              padding: "8px 10px",
              borderRadius: "5px",
              background: "rgba(233,30,140,0.05)",
              border: "1px solid rgba(233,30,140,0.1)",
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.58rem",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "3px",
              }}
            >
              Avg 30d Probability
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "1.1rem",
                color: probColor(avgProb30d),
              }}
            >
              {avgProb30d}%
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.62rem",
                color: "rgba(255,255,255,0.3)",
                marginTop: "1px",
              }}
            >
              across {forecasts.length} lanes
            </div>
          </div>

          {/* Lanes trending up */}
          <div
            style={{
              padding: "8px 10px",
              borderRadius: "5px",
              background:
                risingCount > 5
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(255,255,255,0.02)",
              border: `1px solid ${risingCount > 5 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)"}`,
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.58rem",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "3px",
              }}
            >
              Lanes Trending Up
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "1.1rem",
                color:
                  risingCount > 5
                    ? "#ef4444"
                    : risingCount > 2
                      ? "#f59e0b"
                      : "#10b981",
              }}
            >
              {risingCount}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.62rem",
                color: "rgba(255,255,255,0.3)",
                marginTop: "1px",
              }}
            >
              of {forecasts.length} lanes rising
            </div>
          </div>
        </div>
      )}

      {/* Table header */}
      {isActive && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "20px 1fr 80px 60px 48px 36px 20px",
            gap: "8px",
            padding: "4px 10px",
            marginBottom: "2px",
          }}
        >
          {["#", "Lane", "30d Risk", "60d", "Trend", "", ""].map((h, i) => (
            <div
              key={i}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.58rem",
                color: "rgba(255,255,255,0.2)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textAlign: i >= 2 ? "right" : "left",
              }}
            >
              {h}
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              style={{
                height: "44px",
                borderRadius: "5px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.04)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
          <div
            style={{
              textAlign: "center",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.68rem",
              color: "rgba(255,255,255,0.25)",
              marginTop: "4px",
            }}
          >
            Generating AI forecasts for all lanes…
          </div>
        </div>
      )}

      {/* Lane rows */}
      {!isLoading && forecasts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {forecasts.map((forecast, i) => (
            <LaneRow key={forecast.laneId} forecast={forecast} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && forecasts.length === 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "16px",
            borderRadius: "6px",
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <AlertTriangle size={14} color="#f59e0b" />
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            No forecast data available. Click Refresh to generate forecasts.
          </span>
        </div>
      )}

      {/* Hormuz Crisis Banner */}
      {isActive && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            borderRadius: "6px",
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
            }}
          >
            <Flame size={13} color="#ef4444" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  color: "#ef4444",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                Strait of Hormuz Crisis Active
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.62rem",
                  color: "rgba(255,255,255,0.4)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                5-element impact across Inflation · E-commerce · E-grocery ·
                Customs
              </div>
            </div>
          </div>
          <Link
            href="/scenarios"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "4px",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.65rem",
              letterSpacing: "0.04em",
              textDecoration: "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            VIEW ANALYSIS
            <ExternalLink size={10} />
          </Link>
        </div>
      )}

      {/* Footer */}
      {isActive && (
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            justifyContent: "flex-end",
          }}
        >
          <BarChart2 size={10} color="rgba(255,255,255,0.15)" />
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.6rem",
              color: "rgba(255,255,255,0.15)",
            }}
          >
            LLM-powered forecasts · 30-min cache · Click any lane to expand
          </span>
        </div>
      )}
    </div>
  );
}
