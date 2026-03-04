/* ShippingLinesPanel — Margin Sentinel
 * Consumes trpc.news.shippingLines — LLM-classified carrier disruption status.
 * Auto-refreshes every 5 hours. Manual refresh button available.
 */
import React, { useState } from "react";
import { Ship, Plane, AlertTriangle, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CarrierRowProps {
  name: string;
  country: string;
  routes: string[];
  affected: boolean;
  affectedRoutes: string[];
  reason: string;
  severity: "critical" | "warning" | "none";
}

function CarrierRow({ name, country, routes, affected, affectedRoutes, reason, severity }: CarrierRowProps) {
  const dotColor   = severity === "critical" ? "#ef4444" : severity === "warning" ? "#f59e0b" : "#10b981";
  const statusBg   = affected
    ? severity === "critical" ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)"
    : "rgba(16,185,129,0.06)";
  const statusBorder = affected
    ? severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"
    : "rgba(16,185,129,0.15)";
  const badgeColor = affected
    ? severity === "critical" ? "#ef4444" : "#f59e0b"
    : "#10b981";
  const badgeLabel = affected
    ? severity === "critical" ? "AFFECTED" : "DELAYED"
    : "OPERATING";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        padding: "7px 10px",
        background: statusBg,
        border: `1px solid ${statusBorder}`,
        borderRadius: "5px",
        transition: "all 0.15s",
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor,
          boxShadow: `0 0 5px ${dotColor}`,
          flexShrink: 0,
          marginTop: "4px",
        }}
      />

      {/* Carrier info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.02em",
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.58rem",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {country}
          </span>
        </div>

        {affected && reason && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.62rem",
              color: severity === "critical" ? "rgba(239,68,68,0.75)" : "rgba(245,158,11,0.75)",
              marginTop: "2px",
              lineHeight: 1.3,
            }}
          >
            {reason}
          </div>
        )}

        {affected && affectedRoutes.length > 0 && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.6rem",
              color: "rgba(255,255,255,0.3)",
              marginTop: "1px",
            }}
          >
            Routes: {affectedRoutes.join(", ")}
          </div>
        )}

        {!affected && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.62rem",
              color: "rgba(255,255,255,0.25)",
              marginTop: "2px",
            }}
          >
            {routes[0]}{routes.length > 1 ? ` +${routes.length - 1} more` : ""}
          </div>
        )}
      </div>

      {/* Status badge */}
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.6rem",
          color: badgeColor,
          background: `${badgeColor}15`,
          border: `1px solid ${badgeColor}30`,
          borderRadius: "3px",
          padding: "1px 5px",
          letterSpacing: "0.06em",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {badgeLabel}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShippingLinesPanel() {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<"marine" | "air">("marine");

  const { data, isLoading, refetch, dataUpdatedAt } = trpc.news.shippingLines.useQuery(undefined, {
    refetchInterval: FIVE_HOURS_MS,          // auto-refresh every 5 hours
    staleTime:       FIVE_HOURS_MS - 60_000, // keep fresh for just under 5 hours
  });

  const carriers = data?.carriers ?? [];
  const marine   = carriers.filter((c) => c.type === "marine");
  const air      = carriers.filter((c) => c.type === "air");
  const displayed = activeTab === "marine" ? marine : air;

  const affectedCount   = displayed.filter((c) => c.affected).length;
  const unaffectedCount = displayed.filter((c) => !c.affected).length;

  // Sort: critical first, then warning, then operating
  const sorted = [...displayed].sort((a, b) => {
    const order = { critical: 0, warning: 1, none: 2 };
    return order[a.severity] - order[b.severity];
  });

  // Format last-updated timestamp
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  // Next refresh time
  const nextRefresh = dataUpdatedAt
    ? new Date(dataUpdatedAt + FIVE_HOURS_MS).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="ms-panel" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "10px 12px" : "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="panel-header" style={{ fontSize: isMobile ? "0.7rem" : undefined }}>
            SHIPPING LINES
          </span>
          {/* LIVE badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: "4px",
              padding: "2px 6px",
            }}
          >
            <div
              className="animate-blink"
              style={{ width: 4, height: 4, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 4px #10b981" }}
            />
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.62rem",
                color: "#10b981",
                letterSpacing: "0.06em",
              }}
            >
              LIVE
            </span>
          </div>

          {/* Last updated + next refresh */}
          {lastUpdated && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={9} color="rgba(255,255,255,0.25)" />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.58rem",
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                Updated {lastUpdated}
                {nextRefresh && !isMobile ? ` · Next: ${nextRefresh}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Right side: summary badges + refresh button */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.65rem",
              color: "#ef4444",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "4px",
              padding: "2px 7px",
            }}
          >
            {data?.affectedCount ?? affectedCount} AFFECTED
          </span>
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.65rem",
              color: "#10b981",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "4px",
              padding: "2px 7px",
            }}
          >
            {unaffectedCount} CLEAR
          </span>
          <button
            onClick={() => refetch()}
            title="Refresh now"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
            }}
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Auto-refresh notice */}
      <div
        style={{
          padding: "5px 16px",
          background: "rgba(233,30,140,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.6rem",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          LLM-classified from live news · Auto-updates every 5 hours
          {nextRefresh ? ` · Next refresh at ${nextRefresh}` : ""}
        </span>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        {(["marine", "air"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const Icon = tab === "marine" ? Ship : Plane;
          const tabCarriers = tab === "marine" ? marine : air;
          const tabAffected = tabCarriers.filter((c) => c.affected).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 12px",
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #E91E8C" : "2px solid transparent",
                color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                cursor: "pointer",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.72rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                transition: "all 0.15s",
              }}
            >
              <Icon size={12} />
              {tab === "marine" ? "Marine" : "Air Cargo"}
              {tabAffected > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "0 5px",
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    minWidth: "16px",
                    textAlign: "center",
                  }}
                >
                  {tabAffected}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Carrier list */}
      <div
        style={{
          padding: isMobile ? "10px 12px" : "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          maxHeight: isMobile ? "320px" : "400px",
          overflowY: "auto",
        }}
      >
        {isLoading && carriers.length === 0 ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: "44px",
                borderRadius: "5px",
                background: "rgba(255,255,255,0.04)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))
        ) : sorted.length === 0 ? (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            No carrier data available
          </div>
        ) : (
          <>
            {/* Affected section */}
            {sorted.filter((c) => c.affected).length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px", marginTop: "2px" }}>
                  <AlertTriangle size={10} color="#ef4444" />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.6rem",
                      color: "rgba(239,68,68,0.7)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Disruption Impact
                  </span>
                </div>
                {sorted.filter((c) => c.affected).map((c) => (
                  <CarrierRow key={c.id} {...c} />
                ))}
              </>
            )}

            {/* Operating normally section */}
            {sorted.filter((c) => !c.affected).length > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: sorted.filter((c) => c.affected).length > 0 ? "8px" : "2px",
                    marginBottom: "2px",
                  }}
                >
                  <CheckCircle2 size={10} color="#10b981" />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.6rem",
                      color: "rgba(16,185,129,0.7)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Operating Normally
                  </span>
                </div>
                {sorted.filter((c) => !c.affected).map((c) => (
                  <CarrierRow key={c.id} {...c} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
