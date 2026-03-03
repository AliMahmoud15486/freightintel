/* ImpactNewsFeed — Margin Sentinel
 * Design: Dark Intelligence — real-time news feed from live RSS sources
 * Data: Supply Chain Dive + FT Commodities + Splash247 via tRPC
 * Features: severity filter, category filter (from sidebar), LLM-classified tags, refresh button
 */
import { useState } from "react";
import { MoreHorizontal, RefreshCw, ExternalLink, Clock, Rss, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Severity = "all" | "critical" | "warning" | "info";

interface Props {
  selectedCategory?: string | null;
  onClearCategory?: () => void;
}

function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  } catch {
    return "";
  }
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  warning: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  info: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", border: "rgba(59,130,246,0.3)" },
};

const SOURCE_COLORS: Record<string, string> = {
  "Supply Chain Dive": "#6366f1",
  "FT Commodities": "#f97316",
  "Splash247": "#06b6d4",
};

export default function ImpactNewsFeed({ selectedCategory, onClearCategory }: Props) {
  const [filter, setFilter] = useState<Severity>("all");

  const { data, isLoading, isError, refetch, isFetching } = trpc.news.feed.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000,
    staleTime: 14 * 60 * 1000,
  });

  const { mutate: forceRefresh, isPending: isRefreshing } = trpc.news.refresh.useMutation({
    onSuccess: () => refetch(),
  });

  const items = data?.items ?? [];

  // Apply severity filter first
  const severityFiltered = filter === "all" ? items : items.filter((i) => i.severity === filter);

  // Then apply category filter from sidebar
  const filtered = selectedCategory
    ? severityFiltered.filter((i) =>
        i.affectedCategories?.some(
          (c) => c.toLowerCase() === selectedCategory.toLowerCase()
        )
      )
    : severityFiltered;

  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const warningCount = items.filter((i) => i.severity === "warning").length;

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const spinning = isRefreshing || isFetching;

  return (
    <div className="ms-panel" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="panel-header">IMPACT-FIRST NEWS FEED</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Rss size={10} style={{ color: "#10b981" }} />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.6rem",
                color: "#10b981",
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              LIVE
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {lastUpdated && (
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <Clock size={10} style={{ color: "rgba(255,255,255,0.25)" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>
                {lastUpdated}
              </span>
            </div>
          )}
          <button
            onClick={() => forceRefresh()}
            disabled={spinning}
            title="Refresh news"
            style={{
              background: "none",
              border: "none",
              color: spinning ? "#f97316" : "rgba(255,255,255,0.3)",
              cursor: spinning ? "not-allowed" : "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              transition: "color 0.15s",
            }}
          >
            <RefreshCw size={12} style={{ animation: spinning ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Subtitle + sources */}
      <div
        style={{
          padding: "5px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>
          Prioritized costs with landing impacts and per-costs.
        </span>
        <div style={{ display: "flex", gap: "5px", flexShrink: 0 }}>
          {(data?.sources ?? ["Supply Chain Dive", "FT Commodities", "Splash247"]).map((src) => (
            <span
              key={src}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.55rem",
                color: SOURCE_COLORS[src] ?? "rgba(255,255,255,0.4)",
                background: `${SOURCE_COLORS[src] ?? "#666"}18`,
                border: `1px solid ${SOURCE_COLORS[src] ?? "#666"}30`,
                borderRadius: "3px",
                padding: "1px 5px",
                whiteSpace: "nowrap",
              }}
            >
              {src}
            </span>
          ))}
        </div>
      </div>

      {/* Active category filter banner */}
      {selectedCategory && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "5px 14px",
            background: "rgba(249,115,22,0.08)",
            borderBottom: "1px solid rgba(249,115,22,0.2)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.62rem",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Filtered by category:
            </span>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.7rem",
                color: "#f97316",
                letterSpacing: "0.04em",
              }}
            >
              {selectedCategory}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              ({filtered.length} result{filtered.length !== 1 ? "s" : ""})
            </span>
          </div>
          <button
            onClick={onClearCategory}
            title="Clear category filter"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: "4px",
              padding: "2px 7px",
              cursor: "pointer",
              color: "#f97316",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.6rem",
              transition: "all 0.15s",
            }}
            className="hover:bg-orange-500/20"
          >
            <X size={9} />
            Clear
          </button>
        </div>
      )}

      {/* Severity filter tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}
      >
        {(["all", "critical", "warning", "info"] as Severity[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: filter === s ? "rgba(249,115,22,0.15)" : "transparent",
              color: filter === s ? "#f97316" : "rgba(255,255,255,0.35)",
              transition: "all 0.15s",
            }}
          >
            {s}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>
          {filtered.length} items
          {criticalCount > 0 && <span style={{ color: "#ef4444", marginLeft: "6px" }}>● {criticalCount}</span>}
          {warningCount > 0 && <span style={{ color: "#f59e0b", marginLeft: "4px" }}>● {warningCount}</span>}
        </span>
      </div>

      {/* News list */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {/* Loading state */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: "12px" }}>
            <RefreshCw size={22} style={{ color: "#f97316", animation: "spin 1s linear infinite" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
              Fetching live news &amp; classifying with AI...
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.2)" }}>
              Supply Chain Dive · FT Commodities · Splash247
            </span>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div style={{ padding: "20px 14px", textAlign: "center" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
              Unable to load news.{" "}
              <button
                onClick={() => forceRefresh()}
                style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textDecoration: "underline" }}
              >
                refresh
              </button>{" "}
              to retry.
            </span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div style={{ padding: "20px 14px", textAlign: "center" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
              {selectedCategory
                ? `No ${filter !== "all" ? filter + " " : ""}news for "${selectedCategory}".`
                : `No ${filter !== "all" ? filter : ""} news items found.`}
            </span>
            {selectedCategory && (
              <button
                onClick={onClearCategory}
                style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: "#f97316", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", textDecoration: "underline" }}
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* News items */}
        {!isLoading &&
          filtered.map((item, idx) => {
            const sev = SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.info;
            return (
              <div
                key={item.id}
                style={{
                  padding: "12px 14px",
                  borderBottom: idx < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  transition: "background 0.15s",
                }}
                className="hover:bg-white/[0.02]"
              >
                {/* Top row: severity badge + time + source + link */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "2px 7px",
                        borderRadius: "3px",
                        background: sev.bg,
                        color: sev.text,
                        border: `1px solid ${sev.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {item.severity}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.6rem",
                        color: SOURCE_COLORS[item.source] ?? "rgba(255,255,255,0.3)",
                        background: `${SOURCE_COLORS[item.source] ?? "#666"}15`,
                        padding: "1px 5px",
                        borderRadius: "3px",
                        flexShrink: 0,
                      }}
                    >
                      {item.source}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.62rem", color: "rgba(255,255,255,0.25)" }}>
                      {timeAgo(item.publishedAt)}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
                      className="hover:text-orange-400"
                    >
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Title */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.88)",
                    lineHeight: 1.3,
                    marginBottom: "5px",
                    textDecoration: "none",
                    letterSpacing: "0.01em",
                    transition: "color 0.15s",
                  }}
                  className="hover:text-orange-300"
                >
                  {item.title}
                </a>

                {/* AI summary */}
                {item.summary && (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: "0 0 7px 0" }}>
                    {item.summary}
                  </p>
                )}

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.62rem",
                          color: "#3b82f6",
                          background: "rgba(59,130,246,0.1)",
                          border: "1px solid rgba(59,130,246,0.2)",
                          borderRadius: "3px",
                          padding: "1px 6px",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Impact metrics */}
                {(item.etaImpact || item.costImpact) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "5px" }}>
                    {item.etaImpact && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
                        ETA <span style={{ color: "#f59e0b", fontWeight: 600 }}>{item.etaImpact}</span>
                      </span>
                    )}
                    {item.costImpact && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>
                        Cost Impact <span style={{ color: "#ef4444", fontWeight: 600 }}>{item.costImpact}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Affected categories — highlight the active filter */}
                {item.affectedCategories.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {item.affectedCategories.map((cat) => {
                      const isActive = selectedCategory?.toLowerCase() === cat.toLowerCase();
                      return (
                        <span
                          key={cat}
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "0.62rem",
                            color: isActive ? "#f97316" : "rgba(255,255,255,0.4)",
                            background: isActive ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${isActive ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.08)"}`,
                            borderRadius: "3px",
                            padding: "1px 6px",
                            fontWeight: isActive ? 600 : 400,
                          }}
                        >
                          {cat}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
