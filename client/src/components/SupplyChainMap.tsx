/* SupplyChainMap — Margin Sentinel
 * Design: Dark Intelligence — navy map background with glowing shipping routes
 * Interactive heatmap with disruption overlays, severity indicators, tooltips
 * Uses generated map background image + SVG overlay for routes and hotspots
 */
import { useState } from "react";
import { MoreHorizontal, ZoomIn, ZoomOut, Layers } from "lucide-react";

const MAP_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663201940453/ahZanQ69csJtVFtyEk4qAc/map-bg-J8FdW8j5LNYHoKYjXTpykf.webp";

interface Disruption {
  id: string;
  name: string;
  subtitle: string;
  delay: string;
  cost: string;
  costColor: string;
  severity: "critical" | "warning";
  // Position as percentage of map container
  x: number;
  y: number;
}

const disruptions: Disruption[] = [
  {
    id: "suez",
    name: "SUEZ CANAL BREAK",
    subtitle: "Vessel Stoppage",
    delay: "+14 Day Delay",
    cost: "High cost",
    costColor: "#ef4444",
    severity: "critical",
    x: 56,
    y: 38,
  },
  {
    id: "ningbo",
    name: "NINGBO PORT STRIKE",
    subtitle: "Operations Slow",
    delay: "+7 Day Delay",
    cost: "Moderate cost",
    costColor: "#f59e0b",
    severity: "warning",
    x: 80,
    y: 35,
  },
  {
    id: "losangeles",
    name: "LA PORT CONGESTION",
    subtitle: "High Vessel Queue",
    delay: "+5 Day Delay",
    cost: "Moderate cost",
    costColor: "#f59e0b",
    severity: "warning",
    x: 12,
    y: 37,
  },
];

interface DisruptionTooltipProps {
  disruption: Disruption;
  onClose: () => void;
}

function DisruptionTooltip({ disruption, onClose }: DisruptionTooltipProps) {
  return (
    <div
      style={{
        position: "absolute",
        background: "rgba(10, 14, 26, 0.95)",
        border: `1px solid ${disruption.severity === "critical" ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"}`,
        borderRadius: "6px",
        padding: "10px 14px",
        minWidth: "180px",
        zIndex: 10,
        backdropFilter: "blur(8px)",
        boxShadow: disruption.severity === "critical"
          ? "0 0 20px rgba(239,68,68,0.2)"
          : "0 0 20px rgba(245,158,11,0.2)",
        pointerEvents: "none",
        transform: "translate(-50%, -130%)",
      }}
    >
      <div
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.8rem",
          letterSpacing: "0.06em",
          color: disruption.severity === "critical" ? "#ef4444" : "#f59e0b",
          marginBottom: "2px",
        }}
      >
        {disruption.name}
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.6)",
          marginBottom: "6px",
        }}
      >
        {disruption.subtitle}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.75rem",
          color: "#10b981",
          marginBottom: "2px",
        }}
      >
        {disruption.delay}
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.72rem",
          color: disruption.costColor,
        }}
      >
        {disruption.cost}
      </div>
    </div>
  );
}

export default function SupplyChainMap() {
  const [activeDisruption, setActiveDisruption] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState("Interland Monitor");

  const activeData = disruptions.find((d) => d.id === activeDisruption);

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

      {/* Map Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "360px",
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

        {/* Disruption hotspots overlay */}
        {disruptions.map((disruption) => {
          const isActive = activeDisruption === disruption.id;
          const isCritical = disruption.severity === "critical";
          return (
            <div
              key={disruption.id}
              style={{
                position: "absolute",
                left: `${disruption.x}%`,
                top: `${disruption.y}%`,
                transform: "translate(-50%, -50%)",
                cursor: "pointer",
                zIndex: isActive ? 5 : 3,
              }}
              onMouseEnter={() => setActiveDisruption(disruption.id)}
              onMouseLeave={() => setActiveDisruption(null)}
            >
              {/* Outer glow ring */}
              <div
                style={{
                  width: isCritical ? 48 : 40,
                  height: isCritical ? 48 : 40,
                  borderRadius: "50%",
                  background: isCritical
                    ? "radial-gradient(circle, rgba(239,68,68,0.35) 0%, rgba(239,68,68,0) 70%)"
                    : "radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(245,158,11,0) 70%)",
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  animation: isCritical
                    ? "pulse-red 2s ease-in-out infinite"
                    : "pulse-amber 2.5s ease-in-out infinite",
                }}
              />
              {/* Inner dot */}
              <div
                style={{
                  width: isCritical ? 14 : 12,
                  height: isCritical ? 14 : 12,
                  borderRadius: "50%",
                  background: isCritical ? "#ef4444" : "#f59e0b",
                  border: `2px solid ${isCritical ? "rgba(239,68,68,0.8)" : "rgba(245,158,11,0.8)"}`,
                  boxShadow: isCritical
                    ? "0 0 10px rgba(239,68,68,0.8)"
                    : "0 0 8px rgba(245,158,11,0.7)",
                  position: "relative",
                  zIndex: 2,
                }}
              />

              {/* Tooltip */}
              {isActive && (
                <DisruptionTooltip
                  disruption={disruption}
                  onClose={() => setActiveDisruption(null)}
                />
              )}
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
          {[
            { icon: <ZoomIn size={14} />, label: "+" },
            { icon: <ZoomOut size={14} />, label: "−" },
          ].map((btn, i) => (
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
              {btn.icon}
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
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
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

        {/* Active disruptions count */}
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
            3 ACTIVE DISRUPTIONS
          </span>
        </div>
      </div>
    </div>
  );
}
