/* SupplyChainMap — Margin Sentinel
 * Real-time disruption map with four overlay modes:
 *  1. Interland Monitor — live LLM-extracted disruption hotspots
 *  2. Shipping Routes   — animated SVG polylines for major shipping lanes
 *  3. Port Status       — major world ports with congestion/status indicators
 *  4. Weather Impact    — weather disruption zones with storm indicators
 */
import { useState, useMemo } from "react";
import { MoreHorizontal, ZoomIn, ZoomOut, RefreshCw, Anchor, Wind, Ship } from "lucide-react";
import { trpc } from "@/lib/trpc";

const MAP_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663201940453/ahZanQ69csJtVFtyEk4qAc/map-bg-J8FdW8j5LNYHoKYjXTpykf.webp";

// Equirectangular projection bounds
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveDisruption {
  name: string;
  lat: number;
  lng: number;
  severity: "critical" | "warning" | "info";
  delayDays?: number | null;
  costImpact?: string | null;
  description: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

// Major shipping routes: array of [lng, lat] waypoints
const SHIPPING_ROUTES = [
  {
    id: "trans-pacific",
    label: "Trans-Pacific",
    color: "#3b82f6",
    status: "normal" as const,
    points: [
      [121.5, 31.2],   // Shanghai
      [139.7, 35.7],   // Tokyo
      [-118.2, 33.7],  // Los Angeles
    ],
  },
  {
    id: "asia-europe-suez",
    label: "Asia–Europe (Suez)",
    color: "#ef4444",
    status: "critical" as const,
    points: [
      [121.5, 31.2],   // Shanghai
      [103.8, 1.3],    // Singapore
      [55.3, 25.2],    // Dubai
      [32.5, 30.0],    // Suez Canal
      [14.5, 40.8],    // Mediterranean
      [2.3, 48.9],     // Paris (Le Havre)
      [-0.1, 51.5],    // London (Felixstowe)
    ],
  },
  {
    id: "asia-europe-cape",
    label: "Cape of Good Hope",
    color: "#f59e0b",
    status: "warning" as const,
    points: [
      [121.5, 31.2],   // Shanghai
      [103.8, 1.3],    // Singapore
      [18.4, -33.9],   // Cape Town
      [2.3, 48.9],     // Le Havre
    ],
  },
  {
    id: "trans-atlantic",
    label: "Trans-Atlantic",
    color: "#10b981",
    status: "normal" as const,
    points: [
      [-74.0, 40.7],   // New York
      [-8.6, 41.1],    // Porto
      [2.3, 48.9],     // Le Havre
      [13.4, 52.5],    // Hamburg
    ],
  },
  {
    id: "panama",
    label: "Panama Canal",
    color: "#f59e0b",
    status: "warning" as const,
    points: [
      [-118.2, 33.7],  // Los Angeles
      [-79.5, 9.0],    // Panama
      [-74.0, 40.7],   // New York
    ],
  },
  {
    id: "intra-asia",
    label: "Intra-Asia",
    color: "#10b981",
    status: "normal" as const,
    points: [
      [121.5, 31.2],   // Shanghai
      [114.2, 22.3],   // Hong Kong
      [103.8, 1.3],    // Singapore
      [80.3, 13.1],    // Chennai
    ],
  },
  {
    id: "us-gulf",
    label: "US Gulf",
    color: "#10b981",
    status: "normal" as const,
    points: [
      [-90.1, 29.9],   // New Orleans
      [-74.0, 40.7],   // New York
      [-8.6, 41.1],    // Porto
    ],
  },
];

// Status color map
const routeStatusColor = {
  critical: "#ef4444",
  warning: "#f59e0b",
  normal: "#10b981",
};

// ─── Major world ports ────────────────────────────────────────────────────────

const WORLD_PORTS = [
  { id: "shanghai",    name: "Shanghai",       lat: 31.2,  lng: 121.5, status: "congested" as const },
  { id: "singapore",  name: "Singapore",       lat: 1.3,   lng: 103.8, status: "open"      as const },
  { id: "rotterdam",  name: "Rotterdam",       lat: 51.9,  lng: 4.5,   status: "open"      as const },
  { id: "losangeles", name: "Los Angeles",     lat: 33.7,  lng: -118.2,status: "congested" as const },
  { id: "dubai",      name: "Dubai (Jebel Ali)",lat: 25.0, lng: 55.1,  status: "warning"   as const },
  { id: "hamburg",    name: "Hamburg",          lat: 53.5,  lng: 10.0,  status: "open"      as const },
  { id: "busan",      name: "Busan",            lat: 35.1,  lng: 129.0, status: "open"      as const },
  { id: "hongkong",   name: "Hong Kong",        lat: 22.3,  lng: 114.2, status: "open"      as const },
  { id: "newyork",    name: "New York",         lat: 40.7,  lng: -74.0, status: "open"      as const },
  { id: "antwerp",    name: "Antwerp",          lat: 51.2,  lng: 4.4,   status: "open"      as const },
  { id: "suez",       name: "Suez Canal",       lat: 30.0,  lng: 32.5,  status: "closed"    as const },
  { id: "hormuz",     name: "Strait of Hormuz", lat: 26.5,  lng: 56.5,  status: "closed"    as const },
  { id: "panama",     name: "Panama Canal",     lat: 9.0,   lng: -79.5, status: "warning"   as const },
  { id: "colombo",    name: "Colombo",          lat: 6.9,   lng: 79.8,  status: "open"      as const },
  { id: "felixstowe", name: "Felixstowe",       lat: 51.9,  lng: 1.3,   status: "open"      as const },
  { id: "ningbo",     name: "Ningbo",           lat: 29.9,  lng: 121.6, status: "congested" as const },
  { id: "tianjin",    name: "Tianjin",          lat: 39.0,  lng: 117.7, status: "open"      as const },
  { id: "tokyo",      name: "Tokyo",            lat: 35.7,  lng: 139.7, status: "open"      as const },
  { id: "mumbai",     name: "Mumbai",           lat: 18.9,  lng: 72.8,  status: "warning"   as const },
  { id: "capetown",   name: "Cape Town",        lat: -33.9, lng: 18.4,  status: "open"      as const },
];

const portStatusColor = {
  open:      "#10b981",
  congested: "#f59e0b",
  warning:   "#f97316",
  closed:    "#ef4444",
};

const portStatusLabel = {
  open:      "Open",
  congested: "Congested",
  warning:   "Delays",
  closed:    "Disrupted",
};

// ─── Weather disruption zones ─────────────────────────────────────────────────

const WEATHER_ZONES = [
  {
    id: "arabian-sea-cyclone",
    name: "Arabian Sea Cyclone",
    lat: 18.0,
    lng: 65.0,
    radius: 6,
    type: "cyclone" as const,
    severity: "critical" as const,
    impact: "Vessel diversions +4–6 days",
  },
  {
    id: "south-china-sea-typhoon",
    name: "South China Sea Typhoon",
    lat: 18.0,
    lng: 115.0,
    radius: 7,
    type: "typhoon" as const,
    severity: "critical" as const,
    impact: "Port closures Shanghai/HK",
  },
  {
    id: "north-atlantic-storm",
    name: "North Atlantic Storm",
    lat: 50.0,
    lng: -30.0,
    radius: 8,
    type: "storm" as const,
    severity: "warning" as const,
    impact: "Trans-Atlantic delays +2 days",
  },
  {
    id: "gulf-mexico-hurricane",
    name: "Gulf of Mexico",
    lat: 25.0,
    lng: -90.0,
    radius: 5,
    type: "hurricane" as const,
    severity: "warning" as const,
    impact: "US Gulf port disruptions",
  },
  {
    id: "bay-bengal",
    name: "Bay of Bengal",
    lat: 15.0,
    lng: 88.0,
    radius: 5,
    type: "cyclone" as const,
    severity: "warning" as const,
    impact: "India/Bangladesh port delays",
  },
  {
    id: "arctic-route",
    name: "Arctic Weather",
    lat: 70.0,
    lng: 30.0,
    radius: 9,
    type: "storm" as const,
    severity: "info" as const,
    impact: "Northern route restricted",
  },
];

const weatherSeverityColor = {
  critical: "#ef4444",
  warning:  "#f59e0b",
  info:     "#3b82f6",
};

const weatherTypeIcon: Record<string, string> = {
  cyclone:   "🌀",
  typhoon:   "🌀",
  hurricane: "🌀",
  storm:     "⛈",
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function DisruptionTooltip({ disruption }: { disruption: LiveDisruption }) {
  const isCritical = disruption.severity === "critical";
  const isWarning  = disruption.severity === "warning";
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
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, boxShadow: `0 0 6px ${accentColor}`, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.06em", color: accentColor, textTransform: "uppercase" }}>
          {disruption.name}
        </span>
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.65)", marginBottom: "6px", whiteSpace: "normal", lineHeight: 1.4 }}>
        {disruption.description}
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        {disruption.delayDays != null && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "#10b981" }}>
            +{disruption.delayDays} day delay
          </div>
        )}
        {disruption.costImpact && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: accentColor }}>
            {disruption.costImpact} cost
          </div>
        )}
      </div>
    </div>
  );
}

function PortTooltip({ port }: { port: typeof WORLD_PORTS[0] }) {
  const color = portStatusColor[port.status];
  return (
    <div
      style={{
        position: "absolute",
        background: "rgba(10, 14, 26, 0.97)",
        border: `1px solid ${color}55`,
        borderRadius: "6px",
        padding: "8px 12px",
        minWidth: "150px",
        zIndex: 20,
        backdropFilter: "blur(8px)",
        boxShadow: `0 0 16px ${color}33`,
        pointerEvents: "none",
        transform: "translate(-50%, -130%)",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <Anchor size={10} color={color} />
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.75rem", color, letterSpacing: "0.06em" }}>
          {port.name}
        </span>
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
        Status: <span style={{ color }}>{portStatusLabel[port.status]}</span>
      </div>
    </div>
  );
}

function WeatherTooltip({ zone }: { zone: typeof WEATHER_ZONES[0] }) {
  const color = weatherSeverityColor[zone.severity];
  return (
    <div
      style={{
        position: "absolute",
        background: "rgba(10, 14, 26, 0.97)",
        border: `1px solid ${color}55`,
        borderRadius: "6px",
        padding: "8px 12px",
        minWidth: "180px",
        zIndex: 20,
        backdropFilter: "blur(8px)",
        boxShadow: `0 0 16px ${color}33`,
        pointerEvents: "none",
        transform: "translate(-50%, -130%)",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <span style={{ fontSize: "0.9rem" }}>{weatherTypeIcon[zone.type] ?? "🌩"}</span>
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.75rem", color, letterSpacing: "0.06em" }}>
          {zone.name}
        </span>
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", whiteSpace: "normal", lineHeight: 1.4 }}>
        {zone.impact}
      </div>
    </div>
  );
}

// ─── Overlay components ───────────────────────────────────────────────────────

function ShippingRoutesOverlay() {
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  // Convert route waypoints to SVG polyline points (percentage-based viewBox 0-100)
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 4, pointerEvents: "none" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        {SHIPPING_ROUTES.map((route) => {
          const color = routeStatusColor[route.status];
          return (
            <filter key={`glow-${route.id}`} id={`glow-${route.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          );
        })}
        <style>{`
          @keyframes dash-flow {
            to { stroke-dashoffset: -20; }
          }
        `}</style>
      </defs>

      {SHIPPING_ROUTES.map((route) => {
        const color = routeStatusColor[route.status];
        const pts = route.points
          .map(([lng, lat]) => `${lngToX(lng).toFixed(2)},${latToY(lat).toFixed(2)}`)
          .join(" ");
        const isHovered = hoveredRoute === route.id;

        return (
          <g key={route.id}>
            {/* Glow base */}
            <polyline
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? "0.6" : "0.35"}
              strokeOpacity={0.25}
              filter={`url(#glow-${route.id})`}
            />
            {/* Animated dashed line */}
            <polyline
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? "0.55" : "0.3"}
              strokeOpacity={isHovered ? 0.95 : 0.7}
              strokeDasharray={route.status === "critical" ? "1.5 1.5" : route.status === "warning" ? "2 1" : "3 1"}
              style={{ animation: `dash-flow ${route.status === "critical" ? "1.2s" : "2s"} linear infinite` }}
            />
            {/* Invisible hit area for hover */}
            <polyline
              points={pts}
              fill="none"
              stroke="transparent"
              strokeWidth="2"
              style={{ pointerEvents: "stroke", cursor: "pointer" }}
              onMouseEnter={() => setHoveredRoute(route.id)}
              onMouseLeave={() => setHoveredRoute(null)}
            />
          </g>
        );
      })}
    </svg>
  );
}

function PortStatusOverlay({ disruptions }: { disruptions: LiveDisruption[] }) {
  const [activePort, setActivePort] = useState<string | null>(null);

  // Elevate port status if a live disruption is nearby
  const enhancedPorts = useMemo(() => {
    return WORLD_PORTS.map((port) => {
      const nearby = disruptions.find((d) => {
        const dist = Math.sqrt((d.lat - port.lat) ** 2 + (d.lng - port.lng) ** 2);
        return dist < 8;
      });
      if (nearby) {
        return { ...port, status: nearby.severity === "critical" ? "closed" as const : "warning" as const };
      }
      return port;
    });
  }, [disruptions]);

  return (
    <>
      {enhancedPorts.map((port) => {
        const x = lngToX(port.lng);
        const y = latToY(port.lat);
        if (x < 1 || x > 99 || y < 1 || y > 99) return null;
        const color = portStatusColor[port.status];
        const isActive = activePort === port.id;

        return (
          <div
            key={port.id}
            style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", zIndex: isActive ? 15 : 4, cursor: "pointer" }}
            onMouseEnter={() => setActivePort(port.id)}
            onMouseLeave={() => setActivePort(null)}
          >
            {/* Port icon */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "3px",
                background: `${color}22`,
                border: `1.5px solid ${color}`,
                boxShadow: `0 0 8px ${color}88`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 2,
              }}
            >
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
            </div>
            {/* Port name label */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(10,14,26,0.92)",
                  border: `1px solid ${color}55`,
                  borderRadius: "4px",
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                  zIndex: 20,
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.7rem", color, letterSpacing: "0.05em" }}>
                  {port.name}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.62rem", color: "rgba(255,255,255,0.5)" }}>
                  {portStatusLabel[port.status]}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function WeatherOverlay() {
  const [activeZone, setActiveZone] = useState<string | null>(null);

  return (
    <>
      {/* SVG for weather zone blobs */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 3, pointerEvents: "none" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <style>{`
            @keyframes weather-pulse {
              0%, 100% { opacity: 0.18; }
              50% { opacity: 0.35; }
            }
            @keyframes weather-spin {
              from { transform-origin: center; transform: rotate(0deg); }
              to { transform-origin: center; transform: rotate(360deg); }
            }
          `}</style>
          {WEATHER_ZONES.map((zone) => {
            const color = weatherSeverityColor[zone.severity];
            return (
              <radialGradient key={`wg-${zone.id}`} id={`wg-${zone.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                <stop offset="60%" stopColor={color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>

        {WEATHER_ZONES.map((zone) => {
          const cx = lngToX(zone.lng);
          const cy = latToY(zone.lat);
          const r = zone.radius;
          // Scale radius to be proportional to the viewBox
          const rx = r * (100 / (MAP_LNG_MAX - MAP_LNG_MIN));
          const ry = r * (100 / (MAP_LAT_MAX - MAP_LAT_MIN));

          return (
            <ellipse
              key={zone.id}
              cx={cx}
              cy={cy}
              rx={rx * 1.8}
              ry={ry * 1.8}
              fill={`url(#wg-${zone.id})`}
              style={{ animation: `weather-pulse ${zone.severity === "critical" ? "1.5s" : "2.5s"} ease-in-out infinite` }}
            />
          );
        })}
      </svg>

      {/* Interactive zone markers */}
      {WEATHER_ZONES.map((zone) => {
        const x = lngToX(zone.lng);
        const y = latToY(zone.lat);
        if (x < 1 || x > 99 || y < 1 || y > 99) return null;
        const color = weatherSeverityColor[zone.severity];
        const isActive = activeZone === zone.id;

        return (
          <div
            key={zone.id}
            style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", zIndex: isActive ? 15 : 5, cursor: "pointer" }}
            onMouseEnter={() => setActiveZone(zone.id)}
            onMouseLeave={() => setActiveZone(null)}
          >
            {/* Spinning ring */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `2px dashed ${color}`,
                borderTopColor: "transparent",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                animation: "spin 3s linear infinite",
                opacity: 0.7,
              }}
            />
            {/* Center icon */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: `${color}22`,
                border: `1.5px solid ${color}`,
                boxShadow: `0 0 10px ${color}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                position: "relative",
                zIndex: 2,
              }}
            >
              <Wind size={9} color={color} />
            </div>

            {/* Tooltip */}
            {isActive && <WeatherTooltip zone={zone} />}
          </div>
        );
      })}
    </>
  );
}

// ─── Disruption hotspots (Interland Monitor) ──────────────────────────────────

function DisruptionHotspots({ locations }: { locations: LiveDisruption[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <>
      {locations.map((loc, idx) => {
        const x = lngToX(loc.lng);
        const y = latToY(loc.lat);
        const id = `${loc.name}-${idx}`;
        const isActive = activeId === id;
        const isCritical = loc.severity === "critical";
        const isWarning  = loc.severity === "warning";
        const dotColor  = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";
        const glowColor = isCritical ? "rgba(239,68,68,0.35)" : isWarning ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.25)";
        const pulseAnim = isCritical ? "pulse-red 2s ease-in-out infinite" : isWarning ? "pulse-amber 2.5s ease-in-out infinite" : "pulse-green 3s ease-in-out infinite";
        const dotSize   = isCritical ? 14 : isWarning ? 12 : 10;
        const glowSize  = isCritical ? 52 : isWarning ? 44 : 36;

        if (x < 2 || x > 98 || y < 2 || y > 98) return null;

        return (
          <div
            key={id}
            style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", cursor: "pointer", zIndex: isActive ? 15 : 3 }}
            onMouseEnter={() => setActiveId(id)}
            onMouseLeave={() => setActiveId(null)}
          >
            <div style={{ width: glowSize, height: glowSize, borderRadius: "50%", background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", animation: pulseAnim }} />
            <div style={{ width: dotSize, height: dotSize, borderRadius: "50%", background: dotColor, border: `2px solid ${dotColor}cc`, boxShadow: `0 0 10px ${dotColor}cc`, position: "relative", zIndex: 2 }} />
            {isActive && <DisruptionTooltip disruption={loc} />}
          </div>
        );
      })}
    </>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function MapLegend({ mode }: { mode: string }) {
  if (mode === "Shipping Routes") {
    return (
      <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(10,14,26,0.88)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 12px", display: "flex", gap: "14px", zIndex: 5 }}>
        {[
          { color: "#ef4444", label: "Critical" },
          { color: "#f59e0b", label: "Disrupted" },
          { color: "#10b981", label: "Normal" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 20, height: 2, background: item.color, borderRadius: 1, boxShadow: `0 0 4px ${item.color}` }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.66rem", color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    );
  }
  if (mode === "Port Status") {
    return (
      <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(10,14,26,0.88)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 12px", display: "flex", gap: "14px", zIndex: 5 }}>
        {[
          { color: "#10b981", label: "Open" },
          { color: "#f59e0b", label: "Congested" },
          { color: "#f97316", label: "Delays" },
          { color: "#ef4444", label: "Disrupted" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "2px", background: item.color, boxShadow: `0 0 5px ${item.color}` }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.66rem", color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    );
  }
  if (mode === "Weather Impact") {
    return (
      <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(10,14,26,0.88)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 12px", display: "flex", gap: "14px", zIndex: 5 }}>
        {[
          { color: "#ef4444", label: "Critical Storm" },
          { color: "#f59e0b", label: "Warning" },
          { color: "#3b82f6", label: "Monitoring" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Wind size={10} color={item.color} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.66rem", color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    );
  }
  // Default: Interland Monitor
  return (
    <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(10,14,26,0.88)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 12px", display: "flex", gap: "16px", zIndex: 5 }}>
      {[
        { color: "#ef4444", label: "Critical" },
        { color: "#f59e0b", label: "Warning" },
        { color: "#10b981", label: "Normal" },
      ].map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupplyChainMap() {
  const [filterMode, setFilterMode] = useState("Interland Monitor");

  const { data, isLoading, refetch, dataUpdatedAt } = trpc.news.disruptions.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const locations: LiveDisruption[] = (data?.locations ?? []) as LiveDisruption[];
  const criticalCount = locations.filter((l) => l.severity === "critical").length;
  const warningCount  = locations.filter((l) => l.severity === "warning").length;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  // Mode-specific badge text
  const badgeText = useMemo(() => {
    if (filterMode === "Shipping Routes") {
      const disrupted = SHIPPING_ROUTES.filter((r) => r.status !== "normal").length;
      return `${disrupted} ROUTES DISRUPTED`;
    }
    if (filterMode === "Port Status") {
      const closed = WORLD_PORTS.filter((p) => p.status === "closed" || p.status === "warning").length;
      return `${closed} PORTS IMPACTED`;
    }
    if (filterMode === "Weather Impact") {
      const critical = WEATHER_ZONES.filter((z) => z.severity === "critical").length;
      return `${critical} CRITICAL STORMS`;
    }
    return isLoading && locations.length === 0
      ? "LOADING..."
      : `${criticalCount} CRITICAL · ${warningCount} WARNING`;
  }, [filterMode, isLoading, locations.length, criticalCount, warningCount]);

  const badgeColor = filterMode === "Shipping Routes"
    ? "#ef4444"
    : filterMode === "Port Status"
    ? "#E91E8C"
    : filterMode === "Weather Impact"
    ? "#f59e0b"
    : "#ef4444";

  // Mode label for header
  const modeSubtitle: Record<string, string> = {
    "Interland Monitor": "Heatmap",
    "Shipping Routes":   "Live Routes",
    "Port Status":       "Port Congestion",
    "Weather Impact":    "Storm Tracker",
  };

  return (
    <div
      className="ms-panel"
      style={{ overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", minHeight: "460px" }}
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
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
            ({modeSubtitle[filterMode] ?? filterMode})
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "4px", padding: "2px 6px" }}>
            <div className="animate-blink" style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 4px #10b981" }} />
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.65rem", color: "#10b981", letterSpacing: "0.06em" }}>LIVE</span>
          </div>
          {lastUpdated && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>
              {lastUpdated}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.7)", fontSize: "0.72rem", padding: "4px 8px", fontFamily: "'Inter', sans-serif", cursor: "pointer" }}
          >
            <option value="Interland Monitor">Interland Monitor</option>
            <option value="Shipping Routes">Shipping Routes</option>
            <option value="Port Status">Port Status</option>
            <option value="Weather Impact">Weather Impact</option>
          </select>
          <button onClick={() => refetch()} title="Refresh" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}>
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "4px" }}>
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div
        style={{ position: "relative", width: "100%", height: "clamp(380px, 45vh, 560px)", flex: "0 0 auto", overflow: "hidden", background: "#060b14" }}
      >
        {/* Background map image */}
        <img
          src={MAP_BG}
          alt="Supply Chain Map"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: 0.9 }}
        />

        {/* Loading overlay */}
        {isLoading && locations.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,11,20,0.5)", zIndex: 10 }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
              LOADING LIVE DISRUPTIONS...
            </div>
          </div>
        )}

        {/* ── Mode-specific overlays ── */}
        {filterMode === "Interland Monitor" && <DisruptionHotspots locations={locations} />}
        {filterMode === "Shipping Routes"   && <ShippingRoutesOverlay />}
        {filterMode === "Port Status"       && <PortStatusOverlay disruptions={locations} />}
        {filterMode === "Weather Impact"    && <WeatherOverlay />}

        {/* Zoom controls */}
        <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", flexDirection: "column", gap: "2px", zIndex: 5 }}>
          {[ZoomIn, ZoomOut].map((Icon, i) => (
            <button key={i} style={{ width: 28, height: 28, background: "rgba(10,14,26,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => {}}>
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Legend */}
        <MapLegend mode={filterMode} />

        {/* Scanline texture */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)", pointerEvents: "none", zIndex: 1 }} />

        {/* Bottom gradient fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(to top, rgba(6,11,20,0.7) 0%, transparent 100%)", pointerEvents: "none", zIndex: 2 }} />

        {/* Status badge (top-right) */}
        <div
          style={{ position: "absolute", top: "12px", right: "12px", background: `${badgeColor}22`, border: `1px solid ${badgeColor}44`, borderRadius: "6px", padding: "6px 10px", display: "flex", alignItems: "center", gap: "6px", zIndex: 5 }}
        >
          <div className="animate-blink" style={{ width: 6, height: 6, borderRadius: "50%", background: badgeColor, boxShadow: `0 0 6px ${badgeColor}` }} />
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.72rem", color: badgeColor, letterSpacing: "0.06em" }}>
            {badgeText}
          </span>
        </div>
      </div>
    </div>
  );
}
