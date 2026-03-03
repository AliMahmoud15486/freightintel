/* TopHeader — Margin Sentinel
 * Responsive: compact on mobile, full on desktop
 */
import { useBreakpoint } from "@/hooks/useBreakpoint";

interface TopHeaderProps {
  pageTitle?: string;
}

export default function TopHeader({ pageTitle = "Dashboard" }: TopHeaderProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div
      style={{
        height: isMobile ? "44px" : "52px",
        background: "rgba(10, 14, 26, 0.98)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "0 12px" : "0 20px",
        gap: "12px",
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Datajar-branded wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px", minWidth: 0 }}>
        {/* Logo wordmark with gradient */}
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 800,
            fontSize: isMobile ? "0.95rem" : "1.05rem",
            letterSpacing: "0.04em",
            background: "linear-gradient(90deg, #E91E8C 0%, #f97316 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textTransform: "none",
            whiteSpace: "nowrap",
          }}
        >
          Margin Sentinel
        </span>
        {/* Sparkle — Datajar signature */}
        <span style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", lineHeight: 1 }}>✨</span>

        {/* Breadcrumb — hidden on mobile */}
        {!isMobile && (
          <>
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
          </>
        )}
      </div>

      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
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
