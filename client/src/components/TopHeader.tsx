/* TopHeader — Margin Sentinel
 * Design: Dark Intelligence — top bar with breadcrumb, live indicator, alerts badge, user info
 */
import { Bell, Gift, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface TopHeaderProps {
  alertCount?: number;
}

export default function TopHeader({ alertCount = 1 }: TopHeaderProps) {
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
          Dashboard
        </span>
      </div>

      {/* Right side controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

        {/* Gift / Upgrade */}
        <button
          onClick={() => toast.info("Upgrade to Pro — coming soon")}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            padding: "6px",
            borderRadius: "6px",
            transition: "color 0.15s",
          }}
          className="hover:text-white/70"
        >
          <Gift size={18} />
        </button>

        {/* Notifications */}
        <button
          onClick={() =>
            toast.warning(
              `You have ${alertCount} critical margin risk alert`,
              { duration: 3000 }
            )
          }
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            padding: "6px",
            borderRadius: "6px",
            transition: "color 0.15s",
            position: "relative",
          }}
          className="hover:text-white/70"
        >
          <Bell size={18} />
          {alertCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                background: "#ef4444",
                color: "white",
                fontSize: "0.6rem",
                fontWeight: 700,
                width: "15px",
                height: "15px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Rajdhani', sans-serif",
                boxShadow: "0 0 6px rgba(239,68,68,0.6)",
              }}
            >
              {alertCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

        {/* User */}
        <button
          onClick={() => toast.info("Profile settings coming soon")}
          style={{
            background: "none",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: "6px",
          }}
          className="hover:bg-white/5"
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "white",
            }}
          >
            AS
          </div>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.2,
              }}
            >
              Alexis Sedoser
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.65rem",
                color: "rgba(255,255,255,0.35)",
                lineHeight: 1.2,
              }}
            >
              Dashboard
            </div>
          </div>
          <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
        </button>
      </div>
    </div>
  );
}
