/* RetailerActionPanel — Margin Sentinel
 * Design: Dark Intelligence — right sidebar panel
 * Sections: My Watchlist, Alerts
 */
import { useState } from "react";
import { MoreHorizontal, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface WatchlistItem {
  id: string;
  name: string;
  risk: "high" | "medium" | "low";
  change: string;
}

const initialWatchlist: WatchlistItem[] = [
  { id: "1", name: "Electronics", risk: "high", change: "+4.2%" },
  { id: "2", name: "Apparel", risk: "medium", change: "+2.8%" },
  { id: "3", name: "Toys", risk: "high", change: "+3.5%" },
];

export default function RetailerActionPanel() {
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [alertCount] = useState(2);

  const removeWatchlistItem = (id: string) => {
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
  };

  const addWatchlistItem = () => {
    toast.info("Add category — coming soon");
  };

  const getRiskColor = (risk: string) => {
    if (risk === "high") return "#ef4444";
    if (risk === "medium") return "#f59e0b";
    return "#10b981";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
      }}
    >
      {/* === MY WATCHLIST + ALERTS === */}
      <div className="ms-panel">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span className="panel-header">RETAILER ACTION PANEL</span>
          <button
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Watchlist */}
        <div style={{ padding: "10px 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span className="section-label">MY WATCHLIST</span>
            <button
              onClick={addWatchlistItem}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "0.65rem",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {watchlist.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "5px",
                  padding: "7px 10px",
                  transition: "background 0.15s",
                }}
                className="hover:bg-white/[0.07]"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: getRiskColor(item.risk),
                      boxShadow: `0 0 5px ${getRiskColor(item.risk)}`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {item.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.72rem",
                      color: "#f97316",
                    }}
                  >
                    {item.change}
                  </span>
                  <button
                    onClick={() => removeWatchlistItem(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.2)",
                      cursor: "pointer",
                      padding: "0",
                      display: "flex",
                    }}
                    className="hover:text-white/50"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts section */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
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
            <button
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}
            >
              <MoreHorizontal size={14} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "6px",
              padding: "8px 10px",
              cursor: "pointer",
            }}
            onClick={() =>
              toast.error(`${alertCount} Critical Margin Risks detected — review required`, { duration: 4000 })
            }
          >
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
              {alertCount} Critical Margin Risks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
