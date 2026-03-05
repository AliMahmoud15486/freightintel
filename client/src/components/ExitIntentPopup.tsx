/**
 * ExitIntentPopup — shown when the user is about to leave.
 * Wraps SubscribeModal with an extra attention-grabbing overlay layer and
 * a dismissible "no thanks" link so it feels non-intrusive.
 */
import { useCallback, useState } from "react";
import { X, AlertTriangle, Bell } from "lucide-react";
import SubscribeModal from "./SubscribeModal";
import { useExitIntent } from "@/hooks/useExitIntent";

interface Props {
  /** Pass true once the user has already subscribed to permanently disable the popup */
  alreadySubscribed?: boolean;
}

export default function ExitIntentPopup({ alreadySubscribed = false }: Props) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleExitIntent = useCallback(() => {
    setShowOverlay(true);
  }, []);

  useExitIntent({
    onExitIntent: handleExitIntent,
    delayMs: 3000,
    threshold: 20,
    disabled: alreadySubscribed,
  });

  const handleDismiss = () => {
    setShowOverlay(false);
  };

  const handleSubscribeClick = () => {
    setShowOverlay(false);
    setShowModal(true);
  };

  return (
    <>
      {/* ── Exit-intent overlay ─────────────────────────────────────────── */}
      {showOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5, 8, 20, 0.88)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            animation: "exitOverlayIn 0.25s ease",
          }}
          onClick={(e) => {
            // Dismiss when clicking the dark backdrop
            if (e.target === e.currentTarget) handleDismiss();
          }}
        >
          {/* Card */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(145deg, #0d1225 0%, #111827 100%)",
              border: "1px solid rgba(233,30,140,0.35)",
              borderRadius: "16px",
              padding: "40px 44px 36px",
              maxWidth: "460px",
              width: "calc(100vw - 40px)",
              boxShadow: "0 0 60px rgba(233,30,140,0.18), 0 24px 64px rgba(0,0,0,0.6)",
              textAlign: "center",
              animation: "exitCardIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: "6px",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "5px",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
              }}
            >
              <X size={15} />
            </button>

            {/* Alert icon */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(233,30,140,0.2), rgba(249,115,22,0.2))",
                border: "1px solid rgba(233,30,140,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <AlertTriangle size={26} style={{ color: "#E91E8C" }} />
            </div>

            {/* Headline */}
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.65rem",
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Before you go
            </div>
            <h2
              style={{
                fontFamily: "'Nunito', 'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "1.55rem",
                lineHeight: 1.2,
                margin: "0 0 14px",
                background: "linear-gradient(90deg, #E91E8C 0%, #f97316 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Stay Informed on Supply Chain Disruptions
            </h2>

            {/* Body copy */}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.88rem",
                color: "rgba(255,255,255,0.55)",
                lineHeight: 1.6,
                margin: "0 0 28px",
              }}
            >
              Get instant email alerts when critical shipping disruptions hit your supply chain — Suez Canal closures, port strikes, weather events, and more.
            </p>

            {/* CTA button */}
            <button
              onClick={handleSubscribeClick}
              style={{
                width: "100%",
                background: "linear-gradient(90deg, #E91E8C, #f97316)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "0.07em",
                padding: "13px 24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 20px rgba(233,30,140,0.35)",
                transition: "opacity 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              <Bell size={16} />
              YES, KEEP ME INFORMED
            </button>

            {/* No thanks */}
            <button
              onClick={handleDismiss}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.25)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.75rem",
                cursor: "pointer",
                marginTop: "14px",
                padding: "4px 8px",
                transition: "color 0.15s",
                display: "block",
                width: "100%",
                textAlign: "center",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)";
              }}
            >
              No thanks, I'll miss the alerts
            </button>
          </div>
        </div>
      )}

      {/* ── Subscribe modal (opened from CTA) ───────────────────────────── */}
      <SubscribeModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {/* ── Keyframe animations ─────────────────────────────────────────── */}
      <style>{`
        @keyframes exitOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes exitCardIn {
          from { opacity: 0; transform: scale(0.88) translateY(20px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </>
  );
}
