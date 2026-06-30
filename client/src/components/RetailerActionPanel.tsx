/* RetailerActionPanel — Margin Sentinel
 * Alerts section: live LLM-classified critical news items
 * Categories at Risk: derived from affectedCategories, clickable to filter the news feed
 * Shipping Companies: international carriers affected/unaffected by current disruptions
 */
import { useMemo, useState } from "react";
import {
  MoreHorizontal,
  ExternalLink,
  RefreshCw,
  Tag,
  Ship,
  Plane,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const SEVERITY_COLORS: Record<
  string,
  { bg: string; border: string; dot: string; text: string }
> = {
  critical: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    dot: "#ef4444",
    text: "#ef4444",
  },
  warning: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    dot: "#f59e0b",
    text: "#f59e0b",
  },
  info: {
    bg: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.2)",
    dot: "#3b82f6",
    text: "#3b82f6",
  },
};

// ─── Shipping company data ────────────────────────────────────────────────────

interface ShippingCompany {
  id: string;
  name: string;
  country: string;
  type: "marine" | "air";
  affectedByZones: string[];
  keyRoutes: string[];
}

const SHIPPING_COMPANIES: ShippingCompany[] = [
  // Marine
  {
    id: "maersk",
    name: "Maersk",
    country: "Denmark",
    type: "marine",
    affectedByZones: ["suez", "red-sea", "arabian-sea"],
    keyRoutes: ["Asia–Europe", "Trans-Pacific"],
  },
  {
    id: "msc",
    name: "MSC",
    country: "Switzerland",
    type: "marine",
    affectedByZones: ["suez", "red-sea", "arabian-sea"],
    keyRoutes: ["Asia–Europe", "Trans-Atlantic"],
  },
  {
    id: "cmacgm",
    name: "CMA CGM",
    country: "France",
    type: "marine",
    affectedByZones: ["suez", "red-sea"],
    keyRoutes: ["Asia–Europe", "Indian Ocean"],
  },
  {
    id: "cosco",
    name: "COSCO Shipping",
    country: "China",
    type: "marine",
    affectedByZones: ["south-china-sea", "taiwan-strait"],
    keyRoutes: ["Trans-Pacific", "Intra-Asia"],
  },
  {
    id: "evergreen",
    name: "Evergreen",
    country: "Taiwan",
    type: "marine",
    affectedByZones: ["south-china-sea", "taiwan-strait"],
    keyRoutes: ["Trans-Pacific", "Asia–Europe"],
  },
  {
    id: "hapag",
    name: "Hapag-Lloyd",
    country: "Germany",
    type: "marine",
    affectedByZones: ["suez", "red-sea"],
    keyRoutes: ["Asia–Europe", "Trans-Atlantic"],
  },
  {
    id: "one",
    name: "Ocean Network Express",
    country: "Japan",
    type: "marine",
    affectedByZones: ["south-china-sea"],
    keyRoutes: ["Trans-Pacific", "Intra-Asia"],
  },
  {
    id: "yangming",
    name: "Yang Ming",
    country: "Taiwan",
    type: "marine",
    affectedByZones: [],
    keyRoutes: ["Trans-Pacific", "Intra-Asia"],
  },
  {
    id: "zim",
    name: "ZIM",
    country: "Israel",
    type: "marine",
    affectedByZones: ["suez", "red-sea", "arabian-sea"],
    keyRoutes: ["Asia–Europe", "Mediterranean"],
  },
  {
    id: "pil",
    name: "Pacific Int'l Lines",
    country: "Singapore",
    type: "marine",
    affectedByZones: [],
    keyRoutes: ["Intra-Asia", "Africa"],
  },
  // Air cargo
  {
    id: "emirates-cargo",
    name: "Emirates SkyCargo",
    country: "UAE",
    type: "air",
    affectedByZones: ["arabian-sea", "hormuz"],
    keyRoutes: ["Asia–Europe", "Middle East Hub"],
  },
  {
    id: "fedex",
    name: "FedEx Express",
    country: "USA",
    type: "air",
    affectedByZones: [],
    keyRoutes: ["Trans-Pacific", "Trans-Atlantic"],
  },
  {
    id: "dhl",
    name: "DHL Aviation",
    country: "Germany",
    type: "air",
    affectedByZones: ["suez"],
    keyRoutes: ["Asia–Europe", "Middle East"],
  },
  {
    id: "cargolux",
    name: "Cargolux",
    country: "Luxembourg",
    type: "air",
    affectedByZones: [],
    keyRoutes: ["Trans-Atlantic", "Asia–Europe"],
  },
  {
    id: "cathay-cargo",
    name: "Cathay Cargo",
    country: "Hong Kong",
    type: "air",
    affectedByZones: ["south-china-sea"],
    keyRoutes: ["Trans-Pacific", "Intra-Asia"],
  },
  {
    id: "korean-air-cargo",
    name: "Korean Air Cargo",
    country: "South Korea",
    type: "air",
    affectedByZones: [],
    keyRoutes: ["Trans-Pacific", "Europe"],
  },
  {
    id: "qatar-cargo",
    name: "Qatar Airways Cargo",
    country: "Qatar",
    type: "air",
    affectedByZones: ["arabian-sea", "hormuz"],
    keyRoutes: ["Asia–Europe", "Middle East Hub"],
  },
  {
    id: "ups-airlines",
    name: "UPS Airlines",
    country: "USA",
    type: "air",
    affectedByZones: [],
    keyRoutes: ["Trans-Pacific", "Trans-Atlantic"],
  },
];

function matchActiveZones(
  disruptions: { name: string; description: string; lat: number; lng: number }[]
): Set<string> {
  const zones = new Set<string>();
  for (const d of disruptions) {
    const text = `${d.name} ${d.description}`.toLowerCase();
    if (
      text.includes("suez") ||
      text.includes("red sea") ||
      text.includes("bab el-mandeb")
    ) {
      zones.add("suez");
      zones.add("red-sea");
    }
    // Arabian Sea / Gulf / Iran / Hormuz — broad keyword matching
    if (
      text.includes("arabian sea") ||
      text.includes("arabian") ||
      text.includes("iran") ||
      text.includes("iranian") ||
      text.includes("persian gulf") ||
      text.includes("gulf of oman") ||
      text.includes("saudi") ||
      text.includes("oman") ||
      text.includes("yemen") ||
      text.includes("houthi") ||
      text.includes("middle east") ||
      text.includes("gulf oil") ||
      text.includes("lng tanker") ||
      (text.includes("tanker") && text.includes("mediterranean"))
    ) {
      zones.add("arabian-sea");
    }
    if (
      text.includes("hormuz") ||
      text.includes("iran") ||
      text.includes("persian gulf") ||
      text.includes("gulf")
    ) {
      zones.add("hormuz");
    }
    if (text.includes("south china sea") || text.includes("taiwan")) {
      zones.add("south-china-sea");
      zones.add("taiwan-strait");
    }
    // Proximity: Arabian Sea / Persian Gulf / Iran (lat 15–35, lng 44–65)
    if (d.lat > 15 && d.lat < 35 && d.lng > 44 && d.lng < 65) {
      zones.add("arabian-sea");
      zones.add("hormuz");
    }
    // Proximity: Saudi Arabia / Gulf region (lat 15–32, lng 35–60)
    if (d.lat > 15 && d.lat < 32 && d.lng > 35 && d.lng < 60) {
      zones.add("arabian-sea");
      zones.add("hormuz");
    }
    // Proximity: Suez / Red Sea
    if (d.lat > 10 && d.lat < 35 && d.lng > 28 && d.lng < 45) {
      zones.add("suez");
      zones.add("red-sea");
    }
    // Proximity: South China Sea
    if (d.lat > 5 && d.lat < 25 && d.lng > 105 && d.lng < 125)
      zones.add("south-china-sea");
  }
  return zones;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  selectedCategories?: Set<string>;
  onCategoryToggle?: (cat: string) => void;
  onClearCategories?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RetailerActionPanel({
  selectedCategories,
  onCategoryToggle,
  onClearCategories,
}: Props) {
  const { isMobile } = useBreakpoint();
  const [companyTab, setCompanyTab] = useState<"marine" | "air">("marine");
  const [companiesExpanded, setCompaniesExpanded] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data, isLoading, refetch } = trpc.news.feed.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const criticalItems = (data?.items ?? []).filter(
    i => i.severity === "critical"
  );
  const alertCount = criticalItems.length;

  const categoriesAtRisk = useMemo(() => {
    const items = data?.items ?? [];
    const catMap = new Map<
      string,
      { severity: "critical" | "warning" | "info"; count: number }
    >();
    for (const item of items) {
      if (!item.affectedCategories?.length) continue;
      const sev = item.severity as "critical" | "warning" | "info";
      for (const cat of item.affectedCategories) {
        const existing = catMap.get(cat);
        if (!existing) {
          catMap.set(cat, { severity: sev, count: 1 });
        } else {
          const order = { critical: 2, warning: 1, info: 0 };
          const newSev =
            order[sev] > order[existing.severity] ? sev : existing.severity;
          catMap.set(cat, { severity: newSev, count: existing.count + 1 });
        }
      }
    }
    const order = { critical: 2, warning: 1, info: 0 };
    return Array.from(catMap.entries())
      .map(([name, meta]) => ({ name, ...meta }))
      .sort(
        (a, b) => order[b.severity] - order[a.severity] || b.count - a.count
      );
  }, [data]);

  // Derive active disruption zones from news
  const activeZones = useMemo(() => {
    const disruptions = (data?.items ?? [])
      .filter(i => i.severity === "critical" || i.severity === "warning")
      .map(i => ({
        name: i.title,
        description: i.summary ?? "",
        lat: (i as any).lat ?? 0,
        lng: (i as any).lng ?? 0,
      }));
    return matchActiveZones(disruptions);
  }, [data]);

  // Enrich companies with affected status
  const enrichedCompanies = useMemo(() => {
    return SHIPPING_COMPANIES.map(c => {
      const hitZones = c.affectedByZones.filter(z => activeZones.has(z));
      const isAffected = hitZones.length > 0;
      return { ...c, isAffected };
    });
  }, [activeZones]);

  const displayedCompanies = enrichedCompanies.filter(
    c => c.type === companyTab
  );
  const sortedCompanies = [...displayedCompanies].sort((a, b) => {
    if (a.isAffected !== b.isAffected) return a.isAffected ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const marineAffected = enrichedCompanies.filter(
    c => c.type === "marine" && c.isAffected
  ).length;
  const airAffected = enrichedCompanies.filter(
    c => c.type === "air" && c.isAffected
  ).length;
  const totalAffected = displayedCompanies.filter(c => c.isAffected).length;
  const totalClear = displayedCompanies.filter(c => !c.isAffected).length;

  const handleAlertClick = () => {
    if (alertCount === 0) return;
    const top = criticalItems[0];
    toast.error(top.title, { description: top.summary, duration: 5000 });
  };

  const handleCategoryClick = (catName: string) => {
    if (onCategoryToggle) onCategoryToggle(catName);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: isMobile ? "auto" : "100%",
      }}
    >
      <div className="ms-panel">
        {/* Panel header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderBottom: isCollapsed
              ? "none"
              : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="panel-header">RETAILER ACTION PANEL</span>
            {/* Summary badges shown when collapsed */}
            {isCollapsed && alertCount > 0 && (
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.58rem",
                  color: "#ef4444",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "3px",
                  padding: "0 5px",
                  letterSpacing: "0.04em",
                }}
              >
                {alertCount} ALERTS
              </span>
            )}
            {isCollapsed && categoriesAtRisk.length > 0 && (
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.58rem",
                  color: "rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "3px",
                  padding: "0 5px",
                  letterSpacing: "0.04em",
                }}
              >
                {categoriesAtRisk.length} CATEGORIES
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                padding: "2px",
              }}
              onClick={() => refetch()}
              title="Refresh data"
            >
              <MoreHorizontal size={14} />
            </button>
            <button
              onClick={() => setIsCollapsed(v => !v)}
              title={isCollapsed ? "Expand panel" : "Collapse panel"}
              style={{
                background: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "4px",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                padding: "2px 5px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.58rem",
                letterSpacing: "0.04em",
                transition: "all 0.15s",
              }}
              className="hover:border-white/20 hover:text-white/60"
            >
              {isCollapsed ? (
                <ChevronDown size={11} />
              ) : (
                <ChevronUp size={11} />
              )}
              <span>{isCollapsed ? "EXPAND" : "COLLAPSE"}</span>
            </button>
          </div>
        </div>

        {/* ── Body (hidden when collapsed) ─────────────────────────────────── */}
        {!isCollapsed && (
          <>
            {/* ── Alerts ─────────────────────────────────────────────────────────── */}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span className="section-label">ALERTS</span>
                {isLoading && (
                  <RefreshCw
                    size={11}
                    className="animate-spin"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                )}
              </div>

              {/* Critical count badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background:
                    alertCount > 0
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(16,185,129,0.06)",
                  border: `1px solid ${alertCount > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)"}`,
                  borderRadius: "6px",
                  padding: "8px 10px",
                  cursor: alertCount > 0 ? "pointer" : "default",
                  marginBottom: alertCount > 0 ? "10px" : "0",
                }}
                onClick={handleAlertClick}
              >
                {isLoading ? (
                  <span
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    Loading live alerts...
                  </span>
                ) : alertCount > 0 ? (
                  <>
                    <span className="alert-badge">{alertCount}</span>
                    <span
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        color: "#ef4444",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {alertCount} Critical Margin Risk
                      {alertCount !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      color: "#10b981",
                      letterSpacing: "0.02em",
                    }}
                  >
                    No critical risks detected
                  </span>
                )}
              </div>

              {/* Live critical headlines */}
              {criticalItems.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {criticalItems.slice(0, 4).map(item => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "7px",
                        padding: "7px 9px",
                        background: "rgba(239,68,68,0.05)",
                        border: "1px solid rgba(239,68,68,0.12)",
                        borderRadius: "5px",
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                      className="hover:border-red-500/30 transition-colors"
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#ef4444",
                          marginTop: "5px",
                          flexShrink: 0,
                          boxShadow: "0 0 4px #ef4444",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            color: "rgba(255,255,255,0.75)",
                            lineHeight: 1.3,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "3px",
                          }}
                        >
                          {item.costImpact && (
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "0.62rem",
                                color: "#ef4444",
                              }}
                            >
                              {item.costImpact}
                            </span>
                          )}
                          {item.etaImpact && (
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "0.62rem",
                                color: "#f59e0b",
                              }}
                            >
                              {item.etaImpact}
                            </span>
                          )}
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.6rem",
                              color: "rgba(255,255,255,0.25)",
                              marginLeft: "auto",
                            }}
                          >
                            {item.source}
                          </span>
                          <ExternalLink
                            size={9}
                            style={{
                              color: "rgba(255,255,255,0.2)",
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ── Categories at Risk ─────────────────────────────────────────────── */}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span className="section-label">CATEGORIES AT RISK</span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {!isLoading && categoriesAtRisk.length > 0 && (
                    <>
                      <div
                        className="animate-blink"
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "#10b981",
                          boxShadow: "0 0 4px #10b981",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.55rem",
                          color: "rgba(16,185,129,0.7)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        LIVE
                      </span>
                    </>
                  )}
                  {isLoading && (
                    <RefreshCw
                      size={11}
                      className="animate-spin"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    />
                  )}
                </div>
              </div>

              {/* Helper text when a filter is active */}
              {(selectedCategories?.size ?? 0) > 0 && (
                <div
                  style={{
                    marginBottom: "6px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.6rem",
                    color: "rgba(233,30,140,0.7)",
                    letterSpacing: "0.03em",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {selectedCategories!.size} selected — click to deselect
                  </span>
                  <button
                    onClick={onClearCategories}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(233,30,140,0.6)",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.6rem",
                      padding: 0,
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}

              {isLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      style={{
                        height: "28px",
                        borderRadius: "5px",
                        background: "rgba(255,255,255,0.04)",
                        animation: "pulse 1.5s ease-in-out infinite",
                      }}
                    />
                  ))}
                </div>
              ) : categoriesAtRisk.length === 0 ? (
                <div
                  style={{
                    padding: "10px",
                    textAlign: "center",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  No categories flagged
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  {categoriesAtRisk.map(cat => {
                    const colors =
                      SEVERITY_COLORS[cat.severity] ?? SEVERITY_COLORS.info;
                    const sevLabel =
                      cat.severity.charAt(0).toUpperCase() +
                      cat.severity.slice(1);
                    const isActive = selectedCategories?.has(cat.name) ?? false;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => handleCategoryClick(cat.name)}
                        title={
                          isActive
                            ? `Clear filter: ${cat.name}`
                            : `Filter news by: ${cat.name}`
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "6px 9px",
                          background: isActive
                            ? "rgba(249,115,22,0.15)"
                            : colors.bg,
                          border: `1px solid ${isActive ? "rgba(249,115,22,0.5)" : colors.border}`,
                          borderRadius: "5px",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.15s",
                          outline: "none",
                          boxShadow: isActive
                            ? "0 0 0 1px rgba(249,115,22,0.3)"
                            : "none",
                        }}
                        className="hover:brightness-125"
                      >
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: isActive ? "#f97316" : colors.dot,
                            boxShadow: `0 0 4px ${isActive ? "#f97316" : colors.dot}`,
                            flexShrink: 0,
                          }}
                        />
                        <Tag
                          size={10}
                          style={{
                            color: isActive ? "#f97316" : colors.text,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 600,
                            fontSize: "0.78rem",
                            color: isActive
                              ? "#f97316"
                              : "rgba(255,255,255,0.8)",
                            flex: 1,
                            letterSpacing: "0.02em",
                          }}
                        >
                          {cat.name}
                        </span>
                        {isActive && (
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.55rem",
                              color: "#f97316",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            ✓ Active
                          </span>
                        )}
                        {!isActive && (
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.58rem",
                              fontWeight: 600,
                              color: colors.text,
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                              borderRadius: "3px",
                              padding: "1px 5px",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            {sevLabel}
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.6rem",
                            color: "rgba(255,255,255,0.3)",
                            flexShrink: 0,
                          }}
                        >
                          ×{cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Shipping Companies ─────────────────────────────────────────────── */}
            <div style={{ padding: "10px 14px" }}>
              {/* Section header with collapse toggle */}
              <button
                onClick={() => setCompaniesExpanded(v => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  marginBottom: companiesExpanded ? "8px" : "0",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span className="section-label">SHIPPING COMPANIES</span>
                  {/* Affected count badge */}
                  {marineAffected + airAffected > 0 && (
                    <span
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.58rem",
                        color: "#ef4444",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        borderRadius: "3px",
                        padding: "0 5px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {marineAffected + airAffected} AFFECTED
                    </span>
                  )}
                </div>
                {companiesExpanded ? (
                  <ChevronUp
                    size={12}
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                ) : (
                  <ChevronDown
                    size={12}
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                )}
              </button>

              {companiesExpanded && (
                <>
                  {/* Tab switcher: Marine / Air */}
                  <div
                    style={{
                      display: "flex",
                      borderRadius: "5px",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.08)",
                      marginBottom: "8px",
                    }}
                  >
                    {(["marine", "air"] as const).map(tab => {
                      const isActive = companyTab === tab;
                      const Icon = tab === "marine" ? Ship : Plane;
                      const affected =
                        tab === "marine" ? marineAffected : airAffected;
                      return (
                        <button
                          key={tab}
                          onClick={() => setCompanyTab(tab)}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            padding: "6px 8px",
                            background: isActive
                              ? "rgba(233,30,140,0.12)"
                              : "rgba(255,255,255,0.02)",
                            border: "none",
                            borderBottom: isActive
                              ? "2px solid #E91E8C"
                              : "2px solid transparent",
                            color: isActive
                              ? "rgba(255,255,255,0.9)"
                              : "rgba(255,255,255,0.4)",
                            cursor: "pointer",
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            transition: "all 0.15s",
                          }}
                        >
                          <Icon size={10} />
                          {tab === "marine" ? "Marine" : "Air Cargo"}
                          {affected > 0 && (
                            <span
                              style={{
                                background: "#ef4444",
                                color: "#fff",
                                borderRadius: "8px",
                                padding: "0 4px",
                                fontSize: "0.55rem",
                                fontWeight: 700,
                                minWidth: "14px",
                                textAlign: "center",
                              }}
                            >
                              {affected}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary row */}
                  <div
                    style={{ display: "flex", gap: "6px", marginBottom: "8px" }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 8px",
                        background: "rgba(239,68,68,0.07)",
                        border: "1px solid rgba(239,68,68,0.18)",
                        borderRadius: "4px",
                      }}
                    >
                      <AlertTriangle size={9} color="#ef4444" />
                      <span
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          color: "#ef4444",
                        }}
                      >
                        {totalAffected} Affected
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 8px",
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.15)",
                        borderRadius: "4px",
                      }}
                    >
                      <CheckCircle2 size={9} color="#10b981" />
                      <span
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          color: "#10b981",
                        }}
                      >
                        {totalClear} Operating
                      </span>
                    </div>
                  </div>

                  {/* Company list */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      maxHeight: "260px",
                      overflowY: "auto",
                    }}
                  >
                    {isLoading ? (
                      [1, 2, 3].map(i => (
                        <div
                          key={i}
                          style={{
                            height: "38px",
                            borderRadius: "5px",
                            background: "rgba(255,255,255,0.04)",
                            animation: "pulse 1.5s ease-in-out infinite",
                          }}
                        />
                      ))
                    ) : (
                      <>
                        {/* Affected companies */}
                        {sortedCompanies.filter(c => c.isAffected).length >
                          0 && (
                          <>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                marginBottom: "2px",
                              }}
                            >
                              <AlertTriangle size={9} color="#ef4444" />
                              <span
                                style={{
                                  fontFamily: "'Inter', sans-serif",
                                  fontSize: "0.58rem",
                                  color: "rgba(239,68,68,0.65)",
                                  letterSpacing: "0.05em",
                                  textTransform: "uppercase",
                                }}
                              >
                                Disruption Impact
                              </span>
                            </div>
                            {sortedCompanies
                              .filter(c => c.isAffected)
                              .map(c => (
                                <div
                                  key={c.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "7px",
                                    padding: "6px 9px",
                                    background: "rgba(239,68,68,0.07)",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                    borderRadius: "5px",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 5,
                                      height: 5,
                                      borderRadius: "50%",
                                      background: "#ef4444",
                                      boxShadow: "0 0 4px #ef4444",
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontFamily: "'Rajdhani', sans-serif",
                                        fontWeight: 700,
                                        fontSize: "0.76rem",
                                        color: "rgba(255,255,255,0.85)",
                                        letterSpacing: "0.02em",
                                      }}
                                    >
                                      {c.name}
                                    </div>
                                    <div
                                      style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: "0.6rem",
                                        color: "rgba(239,68,68,0.65)",
                                        marginTop: "1px",
                                      }}
                                    >
                                      {c.keyRoutes[0]}
                                      {c.keyRoutes.length > 1
                                        ? ` +${c.keyRoutes.length - 1}`
                                        : ""}
                                    </div>
                                  </div>
                                  <span
                                    style={{
                                      fontFamily: "'Rajdhani', sans-serif",
                                      fontWeight: 700,
                                      fontSize: "0.58rem",
                                      color: "#ef4444",
                                      background: "rgba(239,68,68,0.1)",
                                      border: "1px solid rgba(239,68,68,0.25)",
                                      borderRadius: "3px",
                                      padding: "1px 5px",
                                      letterSpacing: "0.05em",
                                      flexShrink: 0,
                                    }}
                                  >
                                    AFFECTED
                                  </span>
                                </div>
                              ))}
                          </>
                        )}

                        {/* Unaffected companies */}
                        {sortedCompanies.filter(c => !c.isAffected).length >
                          0 && (
                          <>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                marginTop:
                                  sortedCompanies.filter(c => c.isAffected)
                                    .length > 0
                                    ? "6px"
                                    : "2px",
                                marginBottom: "2px",
                              }}
                            >
                              <CheckCircle2 size={9} color="#10b981" />
                              <span
                                style={{
                                  fontFamily: "'Inter', sans-serif",
                                  fontSize: "0.58rem",
                                  color: "rgba(16,185,129,0.65)",
                                  letterSpacing: "0.05em",
                                  textTransform: "uppercase",
                                }}
                              >
                                Operating Normally
                              </span>
                            </div>
                            {sortedCompanies
                              .filter(c => !c.isAffected)
                              .map(c => (
                                <div
                                  key={c.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "7px",
                                    padding: "6px 9px",
                                    background: "rgba(16,185,129,0.05)",
                                    border: "1px solid rgba(16,185,129,0.14)",
                                    borderRadius: "5px",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 5,
                                      height: 5,
                                      borderRadius: "50%",
                                      background: "#10b981",
                                      boxShadow: "0 0 4px #10b981",
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontFamily: "'Rajdhani', sans-serif",
                                        fontWeight: 700,
                                        fontSize: "0.76rem",
                                        color: "rgba(255,255,255,0.75)",
                                        letterSpacing: "0.02em",
                                      }}
                                    >
                                      {c.name}
                                    </div>
                                    <div
                                      style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: "0.6rem",
                                        color: "rgba(255,255,255,0.25)",
                                        marginTop: "1px",
                                      }}
                                    >
                                      {c.keyRoutes[0]}
                                      {c.keyRoutes.length > 1
                                        ? ` +${c.keyRoutes.length - 1}`
                                        : ""}
                                    </div>
                                  </div>
                                  <span
                                    style={{
                                      fontFamily: "'Rajdhani', sans-serif",
                                      fontWeight: 700,
                                      fontSize: "0.58rem",
                                      color: "#10b981",
                                      background: "rgba(16,185,129,0.08)",
                                      border: "1px solid rgba(16,185,129,0.2)",
                                      borderRadius: "3px",
                                      padding: "1px 5px",
                                      letterSpacing: "0.05em",
                                      flexShrink: 0,
                                    }}
                                  >
                                    CLEAR
                                  </span>
                                </div>
                              ))}
                          </>
                        )}

                        {sortedCompanies.length === 0 && (
                          <div
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.72rem",
                              color: "rgba(255,255,255,0.25)",
                            }}
                          >
                            No company data available
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
