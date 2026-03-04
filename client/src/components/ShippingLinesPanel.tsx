/* ShippingLinesPanel — Margin Sentinel
 * Shows marine and air shipping lines affected/unaffected by current disruptions.
 * Derives status dynamically from the live disruption locations.
 */
import { useMemo } from "react";
import { Ship, Plane, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

// ─── Static carrier data ──────────────────────────────────────────────────────

interface Carrier {
  id: string;
  name: string;
  country: string;
  type: "marine" | "air";
  /** Which disruption zone IDs affect this carrier */
  affectedByZones: string[];
  /** Key routes this carrier operates */
  routes: string[];
}

const CARRIERS: Carrier[] = [
  // ── Marine carriers ──────────────────────────────────────────────────────────
  {
    id: "maersk",
    name: "Maersk",
    country: "Denmark",
    type: "marine",
    affectedByZones: ["suez", "red-sea", "arabian-sea"],
    routes: ["Asia–Europe", "Trans-Pacific", "Trans-Atlantic"],
  },
  {
    id: "msc",
    name: "MSC",
    country: "Switzerland",
    type: "marine",
    affectedByZones: ["suez", "red-sea", "arabian-sea"],
    routes: ["Asia–Europe (Suez)", "Trans-Atlantic", "South America"],
  },
  {
    id: "cmacgm",
    name: "CMA CGM",
    country: "France",
    type: "marine",
    affectedByZones: ["suez", "red-sea"],
    routes: ["Asia–Europe", "Trans-Pacific", "Indian Ocean"],
  },
  {
    id: "cosco",
    name: "COSCO Shipping",
    country: "China",
    type: "marine",
    affectedByZones: ["south-china-sea", "taiwan-strait"],
    routes: ["Trans-Pacific", "Intra-Asia", "Asia–Europe"],
  },
  {
    id: "evergreen",
    name: "Evergreen",
    country: "Taiwan",
    type: "marine",
    affectedByZones: ["south-china-sea", "taiwan-strait"],
    routes: ["Trans-Pacific", "Asia–Europe", "Intra-Asia"],
  },
  {
    id: "hapag",
    name: "Hapag-Lloyd",
    country: "Germany",
    type: "marine",
    affectedByZones: ["suez", "red-sea"],
    routes: ["Asia–Europe", "Trans-Atlantic", "US Gulf"],
  },
  {
    id: "one",
    name: "Ocean Network Express",
    country: "Japan",
    type: "marine",
    affectedByZones: ["south-china-sea"],
    routes: ["Trans-Pacific", "Asia–Europe", "Intra-Asia"],
  },
  {
    id: "yangming",
    name: "Yang Ming",
    country: "Taiwan",
    type: "marine",
    affectedByZones: [],
    routes: ["Trans-Pacific", "Intra-Asia"],
  },
  {
    id: "zim",
    name: "ZIM",
    country: "Israel",
    type: "marine",
    affectedByZones: ["suez", "red-sea", "arabian-sea"],
    routes: ["Asia–Europe (Suez)", "Trans-Pacific", "Mediterranean"],
  },
  {
    id: "pil",
    name: "Pacific Int'l Lines",
    country: "Singapore",
    type: "marine",
    affectedByZones: [],
    routes: ["Intra-Asia", "Indian Ocean", "Africa"],
  },
  // ── Air cargo carriers ───────────────────────────────────────────────────────
  {
    id: "emirates-cargo",
    name: "Emirates SkyCargo",
    country: "UAE",
    type: "air",
    affectedByZones: ["arabian-sea", "hormuz"],
    routes: ["Asia–Europe", "Middle East Hub", "Trans-Pacific"],
  },
  {
    id: "fedex",
    name: "FedEx Express",
    country: "USA",
    type: "air",
    affectedByZones: [],
    routes: ["Trans-Pacific", "Trans-Atlantic", "Intra-Americas"],
  },
  {
    id: "dhl",
    name: "DHL Aviation",
    country: "Germany",
    type: "air",
    affectedByZones: ["suez"],
    routes: ["Asia–Europe", "Middle East", "Africa"],
  },
  {
    id: "cargolux",
    name: "Cargolux",
    country: "Luxembourg",
    type: "air",
    affectedByZones: [],
    routes: ["Trans-Atlantic", "Asia–Europe", "Americas"],
  },
  {
    id: "cathay-cargo",
    name: "Cathay Cargo",
    country: "Hong Kong",
    type: "air",
    affectedByZones: ["south-china-sea"],
    routes: ["Trans-Pacific", "Asia–Europe", "Intra-Asia"],
  },
  {
    id: "korean-air-cargo",
    name: "Korean Air Cargo",
    country: "South Korea",
    type: "air",
    affectedByZones: [],
    routes: ["Trans-Pacific", "Intra-Asia", "Europe"],
  },
  {
    id: "qatar-cargo",
    name: "Qatar Airways Cargo",
    country: "Qatar",
    type: "air",
    affectedByZones: ["arabian-sea", "hormuz"],
    routes: ["Asia–Europe", "Middle East Hub", "Africa"],
  },
  {
    id: "ups-airlines",
    name: "UPS Airlines",
    country: "USA",
    type: "air",
    affectedByZones: [],
    routes: ["Trans-Pacific", "Trans-Atlantic", "Intra-Americas"],
  },
];

// ─── Disruption zone keyword matching ─────────────────────────────────────────

/** Maps disruption location names/descriptions to zone IDs */
function matchZoneIds(disruptions: { name: string; description: string; lat: number; lng: number }[]): Set<string> {
  const activeZones = new Set<string>();
  for (const d of disruptions) {
    const text = `${d.name} ${d.description}`.toLowerCase();
    if (text.includes("suez") || text.includes("red sea") || text.includes("bab el-mandeb")) {
      activeZones.add("suez");
      activeZones.add("red-sea");
    }
    if (text.includes("arabian sea") || text.includes("arabian")) {
      activeZones.add("arabian-sea");
    }
    if (text.includes("hormuz") || text.includes("strait of hormuz")) {
      activeZones.add("hormuz");
    }
    if (text.includes("south china sea") || text.includes("taiwan strait") || text.includes("taiwan")) {
      activeZones.add("south-china-sea");
      activeZones.add("taiwan-strait");
    }
    // Geographic proximity for Arabian Sea
    if (d.lat > 10 && d.lat < 30 && d.lng > 50 && d.lng < 75) {
      activeZones.add("arabian-sea");
    }
    // Suez / Red Sea proximity
    if (d.lat > 10 && d.lat < 35 && d.lng > 28 && d.lng < 45) {
      activeZones.add("suez");
      activeZones.add("red-sea");
    }
    // South China Sea proximity
    if (d.lat > 5 && d.lat < 25 && d.lng > 105 && d.lng < 125) {
      activeZones.add("south-china-sea");
    }
  }
  return activeZones;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CarrierRowProps {
  carrier: Carrier;
  isAffected: boolean;
  affectedRoutes: string[];
}

function CarrierRow({ carrier, isAffected, affectedRoutes }: CarrierRowProps) {
  const statusColor = isAffected ? "#ef4444" : "#10b981";
  const statusBg    = isAffected ? "rgba(239,68,68,0.07)" : "rgba(16,185,129,0.06)";
  const statusBorder = isAffected ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)";
  const statusLabel = isAffected ? "AFFECTED" : "OPERATING";

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
      {/* Status indicator */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: statusColor,
          boxShadow: `0 0 5px ${statusColor}`,
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
            {carrier.name}
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.58rem",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {carrier.country}
          </span>
        </div>
        {isAffected && affectedRoutes.length > 0 && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.62rem",
              color: "rgba(239,68,68,0.7)",
              marginTop: "2px",
              lineHeight: 1.3,
            }}
          >
            Impact: {affectedRoutes.join(", ")}
          </div>
        )}
        {!isAffected && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.62rem",
              color: "rgba(255,255,255,0.25)",
              marginTop: "2px",
            }}
          >
            {carrier.routes[0]}
            {carrier.routes.length > 1 ? ` +${carrier.routes.length - 1} more` : ""}
          </div>
        )}
      </div>

      {/* Status badge */}
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.6rem",
          color: statusColor,
          background: `${statusColor}15`,
          border: `1px solid ${statusColor}30`,
          borderRadius: "3px",
          padding: "1px 5px",
          letterSpacing: "0.06em",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {statusLabel}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  disruptions: { name: string; description: string; lat: number; lng: number; severity: string }[];
  isLoading?: boolean;
}

export default function ShippingLinesPanel({ disruptions, isLoading }: Props) {
  const { isMobile } = useBreakpoint();
  const [activeTab, setActiveTab] = React.useState<"marine" | "air">("marine");

  const activeZones = useMemo(() => matchZoneIds(disruptions), [disruptions]);

  const enrichedCarriers = useMemo(() => {
    return CARRIERS.map((c) => {
      const hitZones = c.affectedByZones.filter((z) => activeZones.has(z));
      const isAffected = hitZones.length > 0;
      // Map hit zones to affected route names
      const affectedRoutes = isAffected ? c.routes.filter((r) => {
        const rl = r.toLowerCase();
        return hitZones.some((z) => {
          if ((z === "suez" || z === "red-sea") && (rl.includes("asia") || rl.includes("europe") || rl.includes("suez") || rl.includes("middle east"))) return true;
          if (z === "arabian-sea" && (rl.includes("middle east") || rl.includes("asia") || rl.includes("indian"))) return true;
          if (z === "hormuz" && (rl.includes("middle east") || rl.includes("gulf"))) return true;
          if ((z === "south-china-sea" || z === "taiwan-strait") && (rl.includes("trans-pacific") || rl.includes("intra-asia") || rl.includes("asia"))) return true;
          return false;
        });
      }) : [];
      return { ...c, isAffected, affectedRoutes };
    });
  }, [activeZones]);

  const marineCarriers = enrichedCarriers.filter((c) => c.type === "marine");
  const airCarriers    = enrichedCarriers.filter((c) => c.type === "air");
  const displayed      = activeTab === "marine" ? marineCarriers : airCarriers;

  const affectedCount   = displayed.filter((c) => c.isAffected).length;
  const unaffectedCount = displayed.filter((c) => !c.isAffected).length;

  // Sort: affected first, then alphabetical
  const sorted = [...displayed].sort((a, b) => {
    if (a.isAffected !== b.isAffected) return a.isAffected ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="panel-header" style={{ fontSize: isMobile ? "0.7rem" : undefined }}>
            SHIPPING LINES
          </span>
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
        </div>

        {/* Summary badges */}
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
            {affectedCount} AFFECTED
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
        </div>
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
          const carriers = tab === "marine" ? marineCarriers : airCarriers;
          const tabAffected = carriers.filter((c) => c.isAffected).length;
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
          maxHeight: isMobile ? "320px" : "380px",
          overflowY: "auto",
        }}
      >
        {isLoading ? (
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
            {sorted.filter((c) => c.isAffected).length > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "2px",
                    marginTop: "2px",
                  }}
                >
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
                {sorted
                  .filter((c) => c.isAffected)
                  .map((c) => (
                    <CarrierRow key={c.id} carrier={c} isAffected={true} affectedRoutes={c.affectedRoutes} />
                  ))}
              </>
            )}

            {/* Unaffected section */}
            {sorted.filter((c) => !c.isAffected).length > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: sorted.filter((c) => c.isAffected).length > 0 ? "8px" : "2px",
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
                {sorted
                  .filter((c) => !c.isAffected)
                  .map((c) => (
                    <CarrierRow key={c.id} carrier={c} isAffected={false} affectedRoutes={[]} />
                  ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Need React import for useState
import React from "react";
