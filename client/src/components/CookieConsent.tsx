/**
 * CookieConsent — GDPR-compliant cookie consent banner
 *
 * Appears at the bottom of the screen on first visit.
 * Persists choice to localStorage. Activates / stops Clarity accordingly.
 */
import { useState, useEffect } from "react";
import { clarityConsent, clarityOptOut, isPending } from "@/lib/clarity";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't made a choice yet
    if (isPending()) {
      // Slight delay so it doesn't flash on initial paint
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  function handleAccept() {
    clarityConsent();
    setVisible(false);
  }

  function handleDecline() {
    clarityOptOut();
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(680px, calc(100vw - 32px))",
        background: "rgba(10, 14, 26, 0.97)",
        border: "1px solid rgba(233, 30, 140, 0.35)",
        borderRadius: "12px",
        boxShadow:
          "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        backdropFilter: "blur(12px)",
        animation: "slideUpConsent 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      <style>{`
        @keyframes slideUpConsent {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "1.1rem" }}>🍪</span>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.95rem",
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.95)",
            textTransform: "uppercase",
          }}
        >
          Cookie &amp; Analytics Consent
        </span>
      </div>

      {/* Body text */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.82rem",
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.6)",
          margin: 0,
        }}
      >
        FreightIntel uses{" "}
        <strong style={{ color: "rgba(255,255,255,0.8)" }}>
          Microsoft Clarity
        </strong>{" "}
        to record anonymised session replays and heatmaps that help us improve
        the dashboard experience. No personal data is sold. You can change your
        choice at any time by clearing your browser storage.{" "}
        <a
          href="https://privacy.microsoft.com/en-us/privacystatement"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#E91E8C", textDecoration: "underline" }}
        >
          Microsoft Privacy Statement
        </a>
        .
      </p>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={handleAccept}
          style={{
            flex: "1 1 160px",
            padding: "9px 20px",
            background: "linear-gradient(90deg, #E91E8C 0%, #f97316 100%)",
            border: "none",
            borderRadius: "7px",
            color: "#fff",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          Accept All Cookies
        </button>

        <button
          onClick={handleDecline}
          style={{
            flex: "1 1 120px",
            padding: "9px 20px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "7px",
            color: "rgba(255,255,255,0.55)",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 600,
            fontSize: "0.85rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
            e.currentTarget.style.color = "rgba(255,255,255,0.55)";
          }}
        >
          Decline
        </button>
      </div>
      {/* Datajar tagline */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.58rem",
          color: "rgba(255,255,255,0.15)",
          textAlign: "center",
          marginTop: "12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: "10px",
        }}
      >
        Analyze your e-commerce data with{" "}
        <a
          href="https://datajar.co"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "linear-gradient(90deg, #E91E8C 0%, #f97316 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Datajar.co
        </a>
      </div>
    </div>
  );
}
