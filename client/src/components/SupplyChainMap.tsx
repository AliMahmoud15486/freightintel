/* SupplyChainMap — Margin Sentinel
 * Real-time disruption map: markers are derived from live LLM-classified news feed.
 * Geographic locations are extracted by the LLM from each news article and plotted
 * as pulsing hotspots on the map background.
 */
import { useState } from "react";
import { MoreHorizontal, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

const MAP_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663201940453/ahZanQ69csJtVFtyEk4qAc/map-bg-J8FdW8j5LNYHoKYjXTpykf.webp";

// Convert lat/lng to percentage position on the equirectangular map image
// Map spans roughly: lng -170 to +180, lat +75 to -60
const MAP_LNG_MIN = -170;
const MAP_LNG_MAX = 180;
const MAP_LAT_MAX = 75;
const MAP_LAT_MIN = -60;

function lngToX(lng: number): number {
  return ((lng - MAP_LNG_MIN) / (MAP_LNG_MAX - MAP_LNG_MIN)) * 100;
}

function latToY(lat: number): number {
  return ((MAP_LAT_MAX - lat) / (MAP_LAT_MAX - MAP_LAT_MIN)) * 100;
}

interface LiveDisruption {
  name: string;
  lat: number;
  lng: number;
  severity: "critical" | "warning" | "info";
  delayDays?: number | null;
  costImpact?: string | null;
  description: string;
}

interface TooltipProps {
  disruption: LiveDisruption;
}

function DisruptionTooltip({ disruption }: TooltipProps) {
  const isCritical = disruption.severity === "critical";
  const isWarning = disruption.severity === "warning";
  const accentColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";
  const borderColor = isCritical
    ? "rgba(239,68,68,0.4)"
    : isWarning
    ? "rgba(245,158,11,0.4)"
    : "rgba(16,185,129,0.4)";

  return (
    <div
      style={{
        position: "absolute",
        background: "rgba(10, 14, 26, 0.97)",
        border: `1px solid ${borderColor}`,
        borderRadius: "6px",
        padding: "10px 14px",
        minWidth: "190px",
        maxWidth: "240px",
        zIndex: 20,
        backdropFilter: "blur(8px)",
        boxShadow: `0 0 20px ${accentColor}33`,
        pointerEvents: "none",
        transform: "translate(-50%, -130%)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Severity badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: accentColor,
            boxShadow: `0 0 6px ${accentColor}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.78rem",
            letterSpacing: "0.06em",
            color: accentColor,
            textTransform: "uppercase",
          }}
        >
          {disruption.name}
        </span>
      </div>

      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.65)",
          marginBottom: "6px",
          whiteSpace: "normal",
          lineHeight: 1.4,
        }}
      >
        {disruption.description}
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        {disruption.delayDays != null && (
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.72rem",
                color: "#10b981",
              }}
            >
              +{disruption.delayDays} day delay
            </div>
          </div>
        )}
        {disruption.costImpact && (
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.72rem",
                color: accentColor,
              }}
            >
              {disruption.costImpact} cost
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupplyChainMap() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState("Interland Monitor");

  const { data, isLoading, refetch, dataUpdatedAt } = trpc.news.disruptions.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
    staleTime: 4 * 60 * 1000,
  });

  const locations: LiveDisruption[] = (data?.locations ?? []) as LiveDisruption[];
  const criticalCount = locations.filter((l) => l.severity === "critical").length;
  const warningCount = locations.filter((l) => l.severity === "warning").length;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className="ms-panel"
      style={{ overflow: "hidden", position: "relative" }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(10,14,26,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="panel-header">SUPPLY CHAIN DISRUPTION MAP</span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            (Heatmap)
          </span>
          {/* Live badge */}
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
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 4px #10b981",
              }}
            />
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.65rem",
                color: "#10b981",
                letterSpacing: "0.06em",
              }}
            >
              LIVE
            </span>
          </div>
          {lastUpdated && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.65rem",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              {lastUpdated}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.72rem",
              padding: "4px 8px",
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
            }}
          >
            <option value="Interland Monitor">Interland Monitor</option>
            <option value="Shipping Routes">Shipping Routes</option>
            <option value="Port Status">Port Status</option>
            <option value="Weather Impact">Weather Impact</option>
          </select>
          <button
            onClick={() => refetch()}
            title="Refresh disruptions"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Map Container — responsive: uses aspect ratio so it fills available width */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 7",
          minHeight: "320px",
          maxHeight: "520px",
          overflow: "hidden",
          background: "#060b14",
        }}
      >
        {/* Background map image */}
        <img
          src={MAP_BG}
          alt="Supply Chain Map"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: 0.9,
          }}
        />

        {/* Loading overlay */}
        {isLoading && locations.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(6,11,20,0.5)",
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.1em",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              LOADING LIVE DISRUPTIONS...
            </div>
          </div>
        )}

        {/* Live disruption hotspots */}
        {locations.map((loc, idx) => {
          const x = lngToX(loc.lng);
          const y = latToY(loc.lat);
          const id = `${loc.name}-${idx}`;
          const isActive = activeId === id;
          const isCritical = loc.severity === "critical";
          const isWarning = loc.severity === "warning";
          const dotColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";
          const glowColor = isCritical
            ? "rgba(239,68,68,0.35)"
            : isWarning
            ? "rgba(245,158,11,0.3)"
            : "rgba(16,185,129,0.25)";
          const pulseAnim = isCritical
            ? "pulse-red 2s ease-in-out infinite"
            : isWarning
            ? "pulse-amber 2.5s ease-in-out infinite"
            : "pulse-green 3s ease-in-out infinite";
          const dotSize = isCritical ? 14 : isWarning ? 12 : 10;
          const glowSize = isCritical ? 52 : isWarning ? 44 : 36;

          // Keep markers inside the map bounds
          if (x < 2 || x > 98 || y < 2 || y > 98) return null;

          return (
            <div
              key={id}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                cursor: "pointer",
                zIndex: isActive ? 15 : 3,
              }}
              onMouseEnter={() => setActiveId(id)}
              onMouseLeave={() => setActiveId(null)}
            >
              {/* Outer glow ring */}
              <div
                style={{
                  width: glowSize,
                  height: glowSize,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  animation: pulseAnim,
                }}
              />
              {/* Inner dot */}
              <div
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  background: dotColor,
                  border: `2px solid ${dotColor}cc`,
                  boxShadow: `0 0 10px ${dotColor}cc`,
                  position: "relative",
                  zIndex: 2,
                }}
              />

              {/* Tooltip */}
              {isActive && <DisruptionTooltip disruption={loc} />}
            </div>
          );
        })}

        {/* Zoom controls */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            zIndex: 5,
          }}
        >
          {[ZoomIn, ZoomOut].map((Icon, i) => (
            <button
              key={i}
              style={{
                width: 28,
                height: 28,
                background: "rgba(10,14,26,0.85)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "4px",
                color: "rgba(255,255,255,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={() => {}}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            background: "rgba(10,14,26,0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            padding: "8px 12px",
            display: "flex",
            gap: "16px",
            zIndex: 5,
          }}
        >
          {[
            { color: "#ef4444", label: "Critical" },
            { color: "#f59e0b", label: "Warning" },
            { color: "#10b981", label: "Normal" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.color,
                  boxShadow: `0 0 6px ${item.color}`,
                }}
              />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.68rem",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Scanline texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Bottom gradient fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "60px",
            background: "linear-gradient(to top, rgba(6,11,20,0.7) 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Active disruptions count badge */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "6px",
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 5,
          }}
        >
          <div
            className="animate-blink"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 6px #ef4444",
            }}
          />
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              color: "#ef4444",
              letterSpacing: "0.06em",
            }}
          >
            {isLoading && locations.length === 0
              ? "LOADING..."
              : `${criticalCount} CRITICAL · ${warningCount} WARNING`}
          </span>
        </div>
      </div>
    </div>
  );
}
