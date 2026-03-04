/* TopHeader — Margin Sentinel
 * Responsive: compact on mobile, full on desktop
 */
import { useState } from "react";
import { Bell } from "lucide-react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import SubscribeModal from "./SubscribeModal";

interface TopHeaderProps {
  pageTitle?: string;
}

export default function TopHeader({ pageTitle = "Dashboard" }: TopHeaderProps) {
  const { isMobile } = useBreakpoint();
  const [showSubscribe, setShowSubscribe] = useState(false);

  return (
    <>
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

      {/* Right side: Subscribe button + Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "14px", flexShrink: 0 }}>

        {/* Subscribe button */}
        <button
          onClick={() => setShowSubscribe(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "linear-gradient(90deg, #E91E8C, #f97316)",
            border: "none",
            borderRadius: "20px",
            color: "#fff",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? "0.62rem" : "0.7rem",
            letterSpacing: "0.05em",
            padding: isMobile ? "5px 10px" : "5px 14px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Bell size={isMobile ? 10 : 11} />
          {isMobile ? "ALERTS" : "STAY INFORMED"}
        </button>

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

      </div>{/* end right side */}
    </div>

    {/* Subscribe modal */}
    <SubscribeModal isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />
    </>
  );
}
