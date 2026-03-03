/* AlertsSystem — Margin Sentinel
 * Design: Dark Intelligence — badge-based notifications for critical margin risk events
 * Compact alert strip that appears above the main content area
 */
import { useState, useEffect } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Alert {
  id: string;
  severity: "critical" | "warning";
  message: string;
  detail: string;
  time: string;
  dismissed: boolean;
}

const initialAlerts: Alert[] = [
  {
    id: "a1",
    severity: "critical",
    message: "Suez Canal Blockage — Margin Risk Detected",
    detail: "Electronics category: -3.2% margin impact projected",
    time: "2m ago",
    dismissed: false,
  },
  {
    id: "a2",
    severity: "critical",
    message: "Ningbo Port Strike — Toy Category at Risk",
    detail: "Toys & Games: +$14.50 per unit landed cost increase",
    time: "15m ago",
    dismissed: false,
  },
  {
    id: "a3",
    severity: "warning",
    message: "Brent Crude +3.1% — Freight Cost Pressure",
    detail: "All import categories: +0.9% cost inflation expected",
    time: "1h ago",
    dismissed: false,
  },
];

export default function AlertsSystem() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [expanded, setExpanded] = useState(false);

  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;

  const dismissAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a))
    );
  };

  // Simulate new alert arriving
  useEffect(() => {
    const timer = setTimeout(() => {
      toast.error("New Critical Alert: FBX Index spike detected — +2.4% freight cost increase", {
        duration: 5000,
        description: "Apparel & Electronics categories most impacted",
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (activeAlerts.length === 0) return null;

  return (
    <div
      style={{
        background: "rgba(239,68,68,0.06)",
        borderBottom: "1px solid rgba(239,68,68,0.15)",
        padding: "0",
        flexShrink: 0,
      }}
    >
      {/* Alert summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "7px 16px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="animate-blink"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <AlertTriangle size={14} style={{ color: "#ef4444" }} />
        </div>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.06em",
            color: "#ef4444",
          }}
        >
          {criticalCount} CRITICAL MARGIN RISK{criticalCount !== 1 ? "S" : ""}
        </span>
        <div
          style={{
            display: "flex",
            gap: "6px",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {activeAlerts.slice(0, 2).map((alert) => (
            <span
              key={alert.id}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.45)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              · {alert.message}
            </span>
          ))}
        </div>
        <ChevronRight
          size={14}
          style={{
            color: "rgba(255,255,255,0.3)",
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Expanded alerts list */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid rgba(239,68,68,0.1)",
            padding: "8px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                background:
                  alert.severity === "critical"
                    ? "rgba(239,68,68,0.07)"
                    : "rgba(245,158,11,0.07)",
                border: `1px solid ${
                  alert.severity === "critical"
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(245,158,11,0.2)"
                }`,
                borderRadius: "5px",
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: alert.severity === "critical" ? "#ef4444" : "#f59e0b",
                  marginTop: "4px",
                  flexShrink: 0,
                  boxShadow: `0 0 5px ${alert.severity === "critical" ? "#ef4444" : "#f59e0b"}`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    color:
                      alert.severity === "critical" ? "#ef4444" : "#f59e0b",
                    letterSpacing: "0.03em",
                    marginBottom: "2px",
                  }}
                >
                  {alert.message}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {alert.detail}
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.25)",
                  flexShrink: 0,
                }}
              >
                {alert.time}
              </span>
              <button
                onClick={() => dismissAlert(alert.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  padding: "0",
                  flexShrink: 0,
                  display: "flex",
                }}
                className="hover:text-white/50"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
