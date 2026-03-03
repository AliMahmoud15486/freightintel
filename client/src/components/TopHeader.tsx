/* TopHeader — Margin Sentinel
 * Design: Dark Intelligence — top bar with breadcrumb and live indicator
 * No auth / user profile / bell — publicly accessible dashboard
 */

interface TopHeaderProps {
  pageTitle?: string;
}

export default function TopHeader({ pageTitle = "Dashboard" }: TopHeaderProps) {
  return (
    <div
      style={{
        height: "52px",
        background: "rgba(10, 14, 26, 0.98)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: "16px",
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Page breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.9rem",
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
          }}
        >
          MARGIN SENTINEL
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem" }}>/</span>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.9rem",
            letterSpacing: "0.08em",
            color: "#f97316",
            textTransform: "uppercase",
          }}
        >
          {pageTitle}
        </span>
      </div>

      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <div
          className="animate-blink"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#10b981",
            boxShadow: "0 0 6px #10b981",
          }}
        />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.65rem",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          LIVE
        </span>
      </div>
    </div>
  );
}
