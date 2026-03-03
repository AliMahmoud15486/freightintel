/* RetailerActionPanel — Margin Sentinel
 * Design: Dark Intelligence — right sidebar panel
 * Alerts section driven by live LLM-classified critical news items
 * Categories at Risk section derived from affectedCategories across critical+warning items
 */
import { useMemo } from "react";
import { MoreHorizontal, ExternalLink, RefreshCw, Tag } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// Severity colour map for category risk badges
const SEVERITY_COLORS: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  critical: { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",   dot: "#ef4444", text: "#ef4444" },
  warning:  { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  dot: "#f59e0b", text: "#f59e0b" },
  info:     { bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)",   dot: "#3b82f6", text: "#3b82f6" },
};

export default function RetailerActionPanel() {
  const { data, isLoading, refetch } = trpc.news.feed.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  const criticalItems = (data?.items ?? []).filter((i) => i.severity === "critical");
  const alertCount = criticalItems.length;

  // Build a deduplicated categories-at-risk list with their worst severity
  const categoriesAtRisk = useMemo(() => {
    const items = data?.items ?? [];
    const catMap = new Map<string, { severity: "critical" | "warning" | "info"; count: number }>();

    for (const item of items) {
      if (!item.affectedCategories?.length) continue;
      const sev = item.severity as "critical" | "warning" | "info";
      for (const cat of item.affectedCategories) {
        const existing = catMap.get(cat);
        if (!existing) {
          catMap.set(cat, { severity: sev, count: 1 });
        } else {
          // Escalate severity if this item is worse
          const order = { critical: 2, warning: 1, info: 0 };
          const newSev = order[sev] > order[existing.severity] ? sev : existing.severity;
          catMap.set(cat, { severity: newSev, count: existing.count + 1 });
        }
      }
    }

    // Sort: critical first, then warning, then info; within tier sort by count desc
    const order = { critical: 2, warning: 1, info: 0 };
    return Array.from(catMap.entries())
      .map(([name, meta]) => ({ name, ...meta }))
      .sort((a, b) => order[b.severity] - order[a.severity] || b.count - a.count);
  }, [data]);

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
            title="Refresh data"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* ── Alerts section ─────────────────────────────────────────────────── */}
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", color: "#ef4444" }}>
                          {item.costImpact}
                        </span>
                      )}
                      {item.etaImpact && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", color: "#f59e0b" }}>
                          {item.etaImpact}
                        </span>
                      )}
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
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

        {/* ── Categories at Risk section ──────────────────────────────────────── */}
        <div style={{ padding: "10px 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span className="section-label">CATEGORIES AT RISK</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {!isLoading && categoriesAtRisk.length > 0 && (
                <>
                  <div
                    className="animate-blink"
                    style={{ width: 4, height: 4, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 4px #10b981" }}
                  />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.55rem", color: "rgba(16,185,129,0.7)", letterSpacing: "0.06em" }}>
                    LIVE
                  </span>
                </>
              )}
              {isLoading && <RefreshCw size={11} className="animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />}
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {[1, 2, 3].map((i) => (
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
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {categoriesAtRisk.map((cat) => {
                const colors = SEVERITY_COLORS[cat.severity] ?? SEVERITY_COLORS.info;
                const sevLabel = cat.severity.charAt(0).toUpperCase() + cat.severity.slice(1);
                return (
                  <div
                    key={cat.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 9px",
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "5px",
                    }}
                  >
                    {/* Severity dot */}
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: colors.dot,
                        boxShadow: `0 0 4px ${colors.dot}`,
                        flexShrink: 0,
                      }}
                    />
                    {/* Tag icon */}
                    <Tag size={10} style={{ color: colors.text, flexShrink: 0 }} />
                    {/* Category name */}
                    <span
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        color: "rgba(255,255,255,0.8)",
                        flex: 1,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {cat.name}
                    </span>
                    {/* Severity badge */}
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
                    {/* Mention count */}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
