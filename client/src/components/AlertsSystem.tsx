/* AlertsSystem — Margin Sentinel
 * Real-time alert strip driven by live LLM-classified news.
 * Critical items from the news feed surface here automatically.
 * Refreshes every 5 minutes (matching news cache cadence).
 */
import { useState, useEffect, useRef } from "react";
import { AlertTriangle, X, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export default function AlertsSystem() {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const prevCriticalCount = useRef<number>(0);
  const { isMobile } = useBreakpoint();

  // Pull live news — same cache as the news feed, so no extra API cost
  const { data, isLoading } = trpc.news.feed.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // re-check every 5 min
    staleTime: 4 * 60 * 1000,
  });

  // Derive critical alerts from live news
  const criticalItems = (data?.items ?? []).filter(
    (item) => item.severity === "critical" && !dismissed.has(item.id)
  );
  const warningItems = (data?.items ?? []).filter(
    (item) => item.severity === "warning" && !dismissed.has(item.id)
  );
  const activeAlerts = [...criticalItems, ...warningItems];
  const criticalCount = criticalItems.length;

  // Toast when new critical items appear after initial load
  useEffect(() => {
    if (!data) return;
    if (prevCriticalCount.current === 0 && criticalCount > 0) {
      // First load — don't toast, just update ref
      prevCriticalCount.current = criticalCount;
      return;
    }
    if (criticalCount > prevCriticalCount.current) {
      const newest = criticalItems[0];
      if (newest) {
        toast.error(`New Critical Alert: ${newest.title}`, {
          duration: 6000,
          description: newest.summary,
        });
      }
    }
    prevCriticalCount.current = criticalCount;
  }, [criticalCount, data]);

  const dismissAlert = (id: string) => {
    setDismissed((prev) => new Set(Array.from(prev).concat(id)));
  };

  // Relative time helper
  const relTime = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return "";
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          background: "rgba(239,68,68,0.04)",
          borderBottom: "1px solid rgba(239,68,68,0.1)",
          padding: "7px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <RefreshCw size={12} className="animate-spin" style={{ color: "#ef4444" }} />
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 600,
            fontSize: "0.72rem",
            letterSpacing: "0.06em",
            color: "rgba(239,68,68,0.5)",
          }}
        >
          LOADING LIVE ALERTS...
        </span>
      </div>
    );
  }

  if (activeAlerts.length === 0) return null;

  return (
    <div
      style={{
        background: "rgba(239,68,68,0.06)",
        borderBottom: "1px solid rgba(239,68,68,0.15)",
        flexShrink: 0,
      }}
    >
      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "7px 16px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="animate-blink" style={{ display: "flex", alignItems: "center" }}>
          <AlertTriangle size={14} style={{ color: "#ef4444" }} />
        </div>

        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.06em",
            color: "#ef4444",
            whiteSpace: "nowrap",
          }}
        >
          {criticalCount} CRITICAL MARGIN RISK{criticalCount !== 1 ? "S" : ""}
        </span>

        {/* Scrolling headline preview — hidden on mobile to save space */}
        {!isMobile && (
          <div style={{ display: "flex", gap: "6px", flex: 1, overflow: "hidden" }}>
            {activeAlerts.slice(0, 3).map((alert) => (
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
                · {alert.title}
              </span>
            ))}
          </div>
        )}
        {/* Mobile: show count badge instead */}
        {isMobile && (
          <div style={{ flex: 1 }} />
        )}

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

      {/* Expanded list */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid rgba(239,68,68,0.1)",
            padding: "8px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            maxHeight: "240px",
            overflowY: "auto",
          }}
        >
          {activeAlerts.map((alert) => {
            const isCritical = alert.severity === "critical";
            const accentColor = isCritical ? "#ef4444" : "#f59e0b";
            return (
              <div
                key={alert.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: isCritical ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
                  border: `1px solid ${isCritical ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                  borderRadius: "5px",
                  padding: "8px 10px",
                }}
              >
                {/* Severity dot */}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: accentColor,
                    marginTop: "5px",
                    flexShrink: 0,
                    boxShadow: `0 0 5px ${accentColor}`,
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Headline */}
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      color: accentColor,
                      letterSpacing: "0.03em",
                      marginBottom: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {alert.title}
                  </div>
                  {/* Summary */}
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.45)",
                      lineHeight: 1.4,
                    }}
                  >
                    {alert.summary}
                    {alert.costImpact && (
                      <span style={{ color: "#ef4444", marginLeft: 6 }}>
                        Cost: {alert.costImpact}
                      </span>
                    )}
                    {alert.etaImpact && (
                      <span style={{ color: "#f59e0b", marginLeft: 6 }}>
                        ETA: {alert.etaImpact}
                      </span>
                    )}
                  </div>
                  {/* Tags */}
                  {alert.tags.length > 0 && (
                    <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                      {alert.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.35)",
                            background: "rgba(255,255,255,0.06)",
                            padding: "1px 5px",
                            borderRadius: "3px",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time + source */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "4px",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.62rem",
                      color: "rgba(255,255,255,0.25)",
                    }}
                  >
                    {relTime(alert.publishedAt)}
                  </span>
                  <a
                    href={alert.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "rgba(255,255,255,0.2)", display: "flex" }}
                    className="hover:text-white/50"
                  >
                    <ExternalLink size={10} />
                  </a>
                </div>

                {/* Dismiss */}
                <button
                  onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.2)",
                    cursor: "pointer",
                    padding: "0",
                    flexShrink: 0,
                    display: "flex",
                    marginTop: "1px",
                  }}
                  className="hover:text-white/50"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
