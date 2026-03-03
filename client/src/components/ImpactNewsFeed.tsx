/* ImpactNewsFeed — Margin Sentinel
 * Design: Dark Intelligence — severity-tagged news cards with cost impact data
 * Priority feed: Critical → Warning → Info
 */
import { useState } from "react";
import { MoreHorizontal, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface NewsItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  tags: string[];
  eta?: string;
  etaRoute?: string;
  surcharge?: string;
  costIncrease?: string;
  costScope?: string;
  affectedCategories?: string[];
  time: string;
}

const newsItems: NewsItem[] = [
  {
    id: "1",
    severity: "critical",
    title: "SUEZ CANAL BLOCKAGE CONFIRMED: Vessels Diverting via Cape of Good Hope",
    tags: ["#Logistics", "#Delays", "#Fuel"],
    eta: "+14 days",
    etaRoute: "Asia-EU",
    surcharge: "+12%",
    affectedCategories: ["Electronics", "Auto Parts"],
    time: "2h ago",
  },
  {
    id: "2",
    severity: "warning",
    title: "OIL PRICES SPIKE on Middle East Tension; Spot Rates Increase",
    tags: ["#Oil", "#FreightCost"],
    costIncrease: "+0.9%",
    costScope: "All Imports impacted",
    time: "4h ago",
  },
  {
    id: "3",
    severity: "warning",
    title: "NINGBO PORT STRIKE: Container Dwell Times Up 340% — Week 3",
    tags: ["#PortStrike", "#China", "#Delays"],
    eta: "+7 days",
    etaRoute: "Asia-US West",
    surcharge: "+8%",
    affectedCategories: ["Apparel", "Toys", "Electronics"],
    time: "6h ago",
  },
  {
    id: "4",
    severity: "warning",
    title: "US EAST COAST CONGESTION: Baltimore & Savannah Ports at 94% Capacity",
    tags: ["#USPorts", "#Congestion"],
    costIncrease: "+1.2%",
    costScope: "US Imports",
    affectedCategories: ["Home & Garden", "Apparel"],
    time: "8h ago",
  },
  {
    id: "5",
    severity: "info",
    title: "PANAMA CANAL DROUGHT: Low Water Levels Force Draft Restrictions",
    tags: ["#PanamaCanal", "#Capacity"],
    eta: "+3 days",
    etaRoute: "Asia-US East",
    affectedCategories: ["Raw Materials", "Logistics"],
    time: "12h ago",
  },
];

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  if (severity === "critical") return <span className="badge-critical">CRITICAL</span>;
  if (severity === "warning") return <span className="badge-warning">WARNING</span>;
  return <span className="badge-info">INFO</span>;
}

function NewsCard({ item }: { item: NewsItem }) {
  const borderColor =
    item.severity === "critical"
      ? "rgba(239,68,68,0.25)"
      : item.severity === "warning"
      ? "rgba(245,158,11,0.2)"
      : "rgba(59,130,246,0.2)";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${borderColor}`,
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "8px",
        transition: "background 0.15s",
        cursor: "pointer",
      }}
      className="hover:bg-white/5"
      onClick={() => toast.info("Full article — coming soon")}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "6px",
          gap: "8px",
        }}
      >
        <SeverityBadge severity={item.severity} />
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {item.time}
          </span>
          <button
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.25)",
              cursor: "pointer",
              padding: "2px",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <div
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.85rem",
          color: "rgba(255,255,255,0.88)",
          letterSpacing: "0.02em",
          marginBottom: "8px",
          lineHeight: 1.3,
        }}
      >
        {item.title}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
        {item.tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
          </span>
        ))}
      </div>

      {/* Impact data */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {item.eta && (
          <div>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              ETA{" "}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.72rem",
                color: "#10b981",
                fontWeight: 500,
              }}
            >
              {item.eta}
            </span>
            {item.etaRoute && (
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.7rem",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {" "}
                ({item.etaRoute})
              </span>
            )}
          </div>
        )}
        {item.surcharge && (
          <div>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Fuel Surcharge{" "}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.72rem",
                color: "#f97316",
                fontWeight: 500,
              }}
            >
              {item.surcharge}
            </span>
          </div>
        )}
        {item.costIncrease && (
          <div>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Per-Item Cost Increase{" "}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.72rem",
                color: "#f97316",
                fontWeight: 500,
              }}
            >
              {item.costIncrease}
            </span>
          </div>
        )}
      </div>

      {item.costScope && (
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.4)",
            marginTop: "4px",
          }}
        >
          {item.costScope}
        </div>
      )}

      {item.affectedCategories && (
        <div style={{ marginTop: "8px" }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.68rem",
              color: "rgba(255,255,255,0.35)",
              marginRight: "6px",
            }}
          >
            Affected Categories:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
            {item.affectedCategories.map((cat) => (
              <span
                key={cat}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "3px",
                  padding: "1px 6px",
                  fontSize: "0.68rem",
                  fontFamily: "'Inter', sans-serif",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImpactNewsFeed() {
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");

  const filtered =
    filter === "all"
      ? newsItems
      : newsItems.filter((item) => item.severity === filter);

  return (
    <div className="ms-panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <div>
          <span className="panel-header">IMPACT-FIRST NEWS FEED</span>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.68rem",
              color: "rgba(255,255,255,0.35)",
              marginTop: "2px",
            }}
          >
            Prioritized costs with landing impacts and per-costs.
          </div>
        </div>
        <button
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "8px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {(["all", "critical", "warning"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background:
                filter === f
                  ? f === "critical"
                    ? "rgba(239,68,68,0.15)"
                    : f === "warning"
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(249,115,22,0.15)"
                  : "transparent",
              color:
                filter === f
                  ? f === "critical"
                    ? "#ef4444"
                    : f === "warning"
                    ? "#f59e0b"
                    : "#f97316"
                  : "rgba(255,255,255,0.35)",
              transition: "all 0.15s",
            }}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.25)",
            alignSelf: "center",
          }}
        >
          {filtered.length} items
        </span>
      </div>

      {/* News list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          maxHeight: "260px",
        }}
      >
        {filtered.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
