/**
 * CrisisSignalBanner
 * Compact dashboard widget showing the live Hormuz Crisis overall score,
 * the top 2 critical impact cells, and a link to the full /scenarios page.
 * Refreshes every 5 hours (same cadence as the scenarios page).
 */
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Flame, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  moderate: "#eab308",
  low:      "#22c55e",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "rgba(239,68,68,0.12)",
  high:     "rgba(249,115,22,0.12)",
  moderate: "rgba(234,179,8,0.10)",
  low:      "rgba(34,197,94,0.10)",
};

export default function CrisisSignalBanner() {
  const { data, isLoading, refetch, isFetching } = trpc.crisisScenarios.getMatrix.useQuery(undefined, {
    refetchInterval: 5 * 60 * 60 * 1000, // 5 hours
    staleTime:       4 * 60 * 60 * 1000,
  });

  const score = data?.overallCrisisScore ?? 0;
  const topCells = (data?.matrix ?? [])
    .slice()
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 3);

  const scoreColor =
    score >= 70 ? "#ef4444" :
    score >= 50 ? "#f97316" :
    score >= 30 ? "#eab308" : "#22c55e";

  const scoreLabel =
    score >= 70 ? "CRITICAL" :
    score >= 50 ? "HIGH" :
    score >= 30 ? "MODERATE" : "LOW";

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      style={{
        background: "rgba(11,15,25,0.95)",
        border: `1px solid ${scoreColor}33`,
        borderLeft: `3px solid ${scoreColor}`,
        borderRadius: "8px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle glow behind score */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "120px", height: "100%",
        background: `radial-gradient(ellipse at left center, ${scoreColor}18, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "8px",
          background: `${scoreColor}22`,
          border: `1px solid ${scoreColor}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Flame size={16} style={{ color: scoreColor }} />
        </div>
        <div>
          <div style={{
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
            fontSize: "0.65rem", letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.4)",
          }}>
            HORMUZ CRISIS
          </div>
          <div style={{
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
            fontSize: "0.7rem", letterSpacing: "0.08em",
            color: scoreColor,
          }}>
            {isLoading ? "LOADING…" : scoreLabel}
          </div>
        </div>
      </div>

      {/* Score dial */}
      {!isLoading && (
        <div style={{
          display: "flex", alignItems: "baseline", gap: "3px", flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 800,
            fontSize: "2rem", lineHeight: 1, color: scoreColor,
          }}>
            {score}
          </span>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
            fontSize: "0.75rem", color: "rgba(255,255,255,0.35)",
          }}>
            /100
          </span>
        </div>
      )}

      {/* Divider */}
      <div style={{ width: "1px", height: "40px", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

      {/* Top impact cells */}
      <div style={{ display: "flex", gap: "8px", flex: 1, flexWrap: "wrap", minWidth: 0 }}>
        {isLoading
          ? [1, 2, 3].map((i) => (
              <div key={i} style={{
                height: "36px", width: "140px", borderRadius: "6px",
                background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s infinite",
              }} />
            ))
          : topCells.map((cell) => {
              const element = data?.elements.find((e) => e.id === cell.elementId);
              const sector  = data?.sectors.find((s)  => s.id === cell.sectorId);
              const sev = cell.severity as string;
              return (
                <div
                  key={`${cell.elementId}-${cell.sectorId}`}
                  style={{
                    background: SEVERITY_BG[sev] ?? "rgba(255,255,255,0.05)",
                    border: `1px solid ${SEVERITY_COLOR[sev] ?? "#666"}33`,
                    borderRadius: "6px",
                    padding: "5px 10px",
                    display: "flex", flexDirection: "column", gap: "1px",
                    minWidth: "120px",
                  }}
                >
                  <div style={{
                    fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
                    fontSize: "0.72rem", letterSpacing: "0.04em",
                    color: SEVERITY_COLOR[sev] ?? "#fff",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {element?.name ?? cell.elementId}
                  </div>
                  <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: "0.6rem",
                    color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap",
                  }}>
                    {sector?.name ?? cell.sectorId} · {cell.impactScore}/100
                  </div>
                </div>
              );
            })}
      </div>

      {/* Refresh + link */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "auto" }}>
        {lastUpdated && (
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: "0.6rem",
            color: "rgba(255,255,255,0.25)",
          }}>
            {lastUpdated}
          </span>
        )}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh crisis data"
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px", padding: "5px 7px", cursor: "pointer",
            color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center",
            transition: "all 0.15s",
          }}
          className="hover:bg-white/10 hover:text-white/70"
        >
          <RefreshCw size={11} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
        </button>
        <Link
          href="/scenarios"
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            background: `${scoreColor}22`,
            border: `1px solid ${scoreColor}44`,
            borderRadius: "6px", padding: "5px 10px",
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
            fontSize: "0.72rem", letterSpacing: "0.05em",
            color: scoreColor, textDecoration: "none",
            transition: "all 0.15s",
          }}
          className="hover:opacity-80"
        >
          VIEW MATRIX <ArrowRight size={11} />
        </Link>
      </div>

      {/* Alert icon for critical */}
      {score >= 70 && (
        <div style={{
          position: "absolute", top: "8px", right: "130px",
          animation: "pulse 2s infinite",
        }}>
          <AlertTriangle size={13} style={{ color: "#ef4444" }} />
        </div>
      )}
    </div>
  );
}
