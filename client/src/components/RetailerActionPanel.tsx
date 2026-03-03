/* RetailerActionPanel — Margin Sentinel
 * Design: Dark Intelligence — right sidebar panel
 * Sections: Alerts only (Watchlist removed)
 */
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

export default function RetailerActionPanel() {
  const [alertCount] = useState(2);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
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

        {/* Alerts section */}
        <div style={{ padding: "10px 14px" }}>
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
