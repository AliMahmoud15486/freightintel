/* RetailerActionPanel — Margin Sentinel
 * Design: Dark Intelligence — right sidebar panel
 * Alerts section driven by live LLM-classified critical news items
 */
import { MoreHorizontal, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function RetailerActionPanel() {
  const { data, isLoading, refetch } = trpc.news.feed.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const criticalItems = (data?.items ?? []).filter((i) => i.severity === "critical");
  const alertCount = criticalItems.length;

  const handleAlertClick = () => {
    if (alertCount === 0) return;
    const top = criticalItems[0];
    toast.error(top.title, {
      description: top.summary,
      duration: 5000,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
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
            onClick={() => refetch()}
            title="Refresh alerts"
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
            {isLoading && (
              <RefreshCw size={11} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
            )}
          </div>

          {/* Critical count badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: alertCount > 0 ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.06)",
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
                  {alertCount} Critical Margin Risk{alertCount !== 1 ? "s" : ""}
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

          {/* Live critical headlines list */}
          {criticalItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {criticalItems.slice(0, 4).map((item) => (
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
                      <ExternalLink size={9} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
