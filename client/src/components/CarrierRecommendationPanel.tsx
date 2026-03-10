/**
 * Carrier Recommendation Engine Panel
 *
 * Allows users to input a freight lane (origin + destination region) and
 * receive ranked carrier recommendations scored against live disruption data.
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { RefreshCw, Ship, ChevronDown, ChevronUp, Star, AlertTriangle, TrendingUp, Clock } from "lucide-react";

// ─── Region display labels ────────────────────────────────────────────────────

const REGION_LABELS: Record<string, string> = {
  china: "China",
  vietnam: "Vietnam",
  india: "India",
  uae: "UAE",
  iran: "Iran",
  korea: "South Korea",
  japan: "Japan",
  sri_lanka: "Sri Lanka",
  bangladesh: "Bangladesh",
  singapore: "Singapore",
  hong_kong: "Hong Kong",
  netherlands: "Netherlands",
  uk: "United Kingdom",
  germany: "Germany",
  belgium: "Belgium",
  usa: "United States",
};

function regionLabel(key: string): string {
  return REGION_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Cost index label ─────────────────────────────────────────────────────────

function costLabel(index: number): string {
  if (index === 1) return "$";
  if (index === 2) return "$$";
  return "$$$";
}

function costColor(index: number): string {
  if (index === 1) return "#10b981";
  if (index === 2) return "#f59e0b";
  return "#ef4444";
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function riskBadge(level: "low" | "medium" | "high" | "critical") {
  const cfg = {
    low:      { label: "LOW RISK",      bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  color: "#10b981" },
    medium:   { label: "MEDIUM RISK",   bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  color: "#f59e0b" },
    high:     { label: "HIGH RISK",     bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)",   color: "#ef4444" },
    critical: { label: "CRITICAL RISK", bg: "rgba(239,68,68,0.18)",   border: "rgba(239,68,68,0.5)",   color: "#ef4444" },
  }[level];
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: "3px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: "0.62rem",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Carrier card ─────────────────────────────────────────────────────────────

interface CarrierCardProps {
  carrier: {
    carrierId: string;
    carrierName: string;
    riskScore: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    estimatedTransitDays: number;
    delayDays: number;
    costIndex: number;
    reliabilityScore: number;
    rationale: string;
    isBestOption: boolean;
    disruptionReasons: string[];
  };
  rank: number;
}

function CarrierCard({ carrier, rank }: CarrierCardProps) {
  const [expanded, setExpanded] = useState(false);

  const borderColor = carrier.isBestOption
    ? "rgba(233,30,140,0.4)"
    : carrier.riskLevel === "critical" || carrier.riskLevel === "high"
    ? "rgba(239,68,68,0.2)"
    : "rgba(255,255,255,0.06)";

  const bgColor = carrier.isBestOption
    ? "rgba(233,30,140,0.05)"
    : "rgba(255,255,255,0.02)";

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: "6px",
        background: bgColor,
        padding: "10px 12px",
        transition: "all 0.15s",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        {/* Rank badge */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: carrier.isBestOption
              ? "linear-gradient(135deg, #E91E8C, #f97316)"
              : "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "1px",
          }}
        >
          {carrier.isBestOption ? (
            <Star size={10} color="#fff" fill="#fff" />
          ) : (
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.62rem",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {rank}
            </span>
          )}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.85rem",
                color: carrier.isBestOption ? "#fff" : "rgba(255,255,255,0.85)",
              }}
            >
              {carrier.carrierName}
            </span>
            {carrier.isBestOption && (
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: "3px",
                  background: "linear-gradient(90deg, rgba(233,30,140,0.25), rgba(249,115,22,0.25))",
                  border: "1px solid rgba(233,30,140,0.4)",
                  color: "#E91E8C",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.58rem",
                  letterSpacing: "0.06em",
                }}
              >
                BEST OPTION
              </span>
            )}
            {riskBadge(carrier.riskLevel)}
          </div>

          {/* Metrics row */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <Clock size={10} color="rgba(255,255,255,0.3)" />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {carrier.estimatedTransitDays}d transit
                {carrier.delayDays > 0 && (
                  <span style={{ color: "#f59e0b" }}> (+{carrier.delayDays}d delay)</span>
                )}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <TrendingUp size={10} color="rgba(255,255,255,0.3)" />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.7rem",
                  color: costColor(carrier.costIndex),
                  fontWeight: 600,
                }}
              >
                {costLabel(carrier.costIndex)}
              </span>
            </div>
            <div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                Reliability: {carrier.reliabilityScore}/100
              </span>
            </div>
          </div>

          {/* Rationale */}
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.5)",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {carrier.rationale}
          </p>

          {/* Expand/collapse disruption reasons */}
          {carrier.disruptionReasons.length > 0 && (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  marginTop: "5px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.65rem",
                }}
              >
                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {expanded ? "Hide" : "Show"} disruption details
              </button>
              {expanded && (
                <ul
                  style={{
                    margin: "5px 0 0 0",
                    padding: "0 0 0 14px",
                    listStyle: "disc",
                  }}
                >
                  {carrier.disruptionReasons.map((reason, i) => (
                    <li
                      key={i}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.65rem",
                        color: "rgba(255,255,255,0.35)",
                        marginBottom: "2px",
                      }}
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Risk score circle */}
        <div
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background:
              carrier.riskScore >= 75
                ? "rgba(239,68,68,0.15)"
                : carrier.riskScore >= 50
                ? "rgba(239,68,68,0.1)"
                : carrier.riskScore >= 25
                ? "rgba(245,158,11,0.1)"
                : "rgba(16,185,129,0.1)",
            border: `1.5px solid ${
              carrier.riskScore >= 75
                ? "rgba(239,68,68,0.4)"
                : carrier.riskScore >= 50
                ? "rgba(239,68,68,0.25)"
                : carrier.riskScore >= 25
                ? "rgba(245,158,11,0.3)"
                : "rgba(16,185,129,0.3)"
            }`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.75rem",
              color:
                carrier.riskScore >= 50
                  ? "#ef4444"
                  : carrier.riskScore >= 25
                  ? "#f59e0b"
                  : "#10b981",
              lineHeight: 1,
            }}
          >
            {carrier.riskScore}
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.45rem",
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.04em",
            }}
          >
            RISK
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function CarrierRecommendationPanel() {
  const [originRegion, setOriginRegion] = useState("");
  const [destinationRegion, setDestinationRegion] = useState("");
  const [cargoType, setCargoType] = useState<"general" | "hazmat" | "refrigerated" | "bulk" | "high-value">("general");
  const [urgency, setUrgency] = useState<"standard" | "express">("standard");
  const [containerSize, setContainerSize] = useState<"20ft" | "40ft" | "lcl">("40ft");
  const [hasQueried, setHasQueried] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  // Load available lanes for dropdowns
  const { data: lanesData } = trpc.carrierRecommendation.getLanes.useQuery();

  // Recommendation query — only runs when origin + destination are set
  const {
    data: recommendation,
    isLoading,
    isFetching,
    refetch,
  } = trpc.carrierRecommendation.recommend.useQuery(
    { originRegion, destinationRegion, cargoType, urgency, containerSize, forceRefresh },
    {
      enabled: hasQueried && !!originRegion && !!destinationRegion,
      staleTime: 9 * 60 * 1000,
    }
  );

  const handleSearch = useCallback(() => {
    if (!originRegion || !destinationRegion) return;
    setForceRefresh(false);
    setHasQueried(true);
    // Clarity Smart Event
    if (typeof window !== "undefined" && (window as any).clarity) {
      (window as any).clarity("event", "carrier_recommendation_requested");
    }
  }, [originRegion, destinationRegion]);

  const handleRefresh = useCallback(() => {
    setForceRefresh(true);
    refetch();
    // Reset forceRefresh flag after trigger
    setTimeout(() => setForceRefresh(false), 500);
  }, [refetch]);

  const origins = lanesData?.origins ?? [];
  const destinations = lanesData?.destinations ?? [];

  const selectStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "5px",
    color: "rgba(255,255,255,0.75)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.72rem",
    padding: "6px 10px",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.62rem",
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "4px",
  };

  return (
    <div
      className="ms-panel"
      style={{ padding: "14px 16px" }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Ship size={14} color="#E91E8C" />
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
            Carrier Recommendation Engine
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
            AI-POWERED
          </span>
        </div>
        {hasQueried && recommendation && (
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
        )}
      </div>

      {/* Query form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        {/* Origin */}
        <div>
          <div style={labelStyle}>Origin</div>
          <select
            value={originRegion}
            onChange={(e) => { setOriginRegion(e.target.value); setHasQueried(false); }}
            style={selectStyle}
          >
            <option value="">Select origin…</option>
            {origins.map((o) => (
              <option key={o} value={o}>{regionLabel(o)}</option>
            ))}
          </select>
        </div>

        {/* Destination */}
        <div>
          <div style={labelStyle}>Destination</div>
          <select
            value={destinationRegion}
            onChange={(e) => { setDestinationRegion(e.target.value); setHasQueried(false); }}
            style={selectStyle}
          >
            <option value="">Select destination…</option>
            {destinations.map((d) => (
              <option key={d} value={d}>{regionLabel(d)}</option>
            ))}
          </select>
        </div>

        {/* Cargo type */}
        <div>
          <div style={labelStyle}>Cargo Type</div>
          <select
            value={cargoType}
            onChange={(e) => setCargoType(e.target.value as typeof cargoType)}
            style={selectStyle}
          >
            <option value="general">General</option>
            <option value="hazmat">Hazmat</option>
            <option value="refrigerated">Refrigerated</option>
            <option value="bulk">Bulk</option>
            <option value="high-value">High-Value</option>
          </select>
        </div>

        {/* Container size */}
        <div>
          <div style={labelStyle}>Container</div>
          <select
            value={containerSize}
            onChange={(e) => setContainerSize(e.target.value as typeof containerSize)}
            style={selectStyle}
          >
            <option value="20ft">20ft FCL</option>
            <option value="40ft">40ft FCL</option>
            <option value="lcl">LCL</option>
          </select>
        </div>

        {/* Urgency */}
        <div>
          <div style={labelStyle}>Urgency</div>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as typeof urgency)}
            style={selectStyle}
          >
            <option value="standard">Standard</option>
            <option value="express">Express</option>
          </select>
        </div>
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={!originRegion || !destinationRegion || isLoading}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "5px",
          background:
            !originRegion || !destinationRegion
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(90deg, #E91E8C 0%, #f97316 100%)",
          border: "none",
          cursor: !originRegion || !destinationRegion ? "not-allowed" : "pointer",
          color: !originRegion || !destinationRegion ? "rgba(255,255,255,0.25)" : "#fff",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.8rem",
          letterSpacing: "0.06em",
          marginBottom: "12px",
          transition: "all 0.15s",
        }}
      >
        {isLoading ? "ANALYSING CARRIERS…" : "FIND BEST CARRIERS"}
      </button>

      {/* Results */}
      {isLoading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "72px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      )}

      {!isLoading && hasQueried && recommendation === null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            borderRadius: "6px",
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.15)",
          }}
        >
          <AlertTriangle size={14} color="#f59e0b" />
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            No direct lane found for this origin–destination pair. Try a different combination.
          </span>
        </div>
      )}

      {!isLoading && recommendation && (
        <>
          {/* Lane info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
              padding: "6px 10px",
              borderRadius: "5px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {recommendation.lane.name}
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>·</span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.65rem",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              Base transit: {recommendation.lane.baseTransitDays} days
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>·</span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.65rem",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              {recommendation.carriers.length} carriers scored
            </span>
          </div>

          {/* Carrier cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {recommendation.carriers.map((carrier, i) => (
              <CarrierCard key={carrier.carrierId} carrier={carrier} rank={i + 1} />
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "8px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.6rem",
              color: "rgba(255,255,255,0.2)",
              textAlign: "right",
            }}
          >
            Scored at {new Date(recommendation.generatedAt).toLocaleTimeString()} · Based on live disruption data
          </div>
        </>
      )}

      {!hasQueried && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.72rem",
          }}
        >
          Select an origin and destination, then click <strong style={{ color: "rgba(255,255,255,0.35)" }}>Find Best Carriers</strong> to get AI-scored recommendations based on live disruption data.
        </div>
      )}
    </div>
  );
}
