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
      {/* Datajar-branded wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Logo wordmark with gradient */}
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 800,
            fontSize: "1.05rem",
            letterSpacing: "0.04em",
            background: "linear-gradient(90deg, #E91E8C 0%, #f97316 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textTransform: "none",
          }}
        >
          Margin Sentinel
        </span>
        {/* Sparkle — Datajar signature */}
        <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>✨</span>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.8rem" }}>/</span>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.82rem",
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.45)",
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
