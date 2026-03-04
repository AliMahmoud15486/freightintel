/* TopHeader — Margin Sentinel
 * Responsive: compact on mobile, full on desktop
 * Includes owner-only "Send Test Alert" button
 */
import { useState, useRef, useEffect } from "react";
import { Bell, FlaskConical, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SubscribeModal from "./SubscribeModal";

interface TopHeaderProps {
  pageTitle?: string;
}

// ─── Test Alert Popover ────────────────────────────────────────────────────────

function TestAlertPopover({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [toEmail, setToEmail] = useState(user?.email ?? "");
  const [toName, setToName] = useState(user?.name ?? "Admin");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const sendTest = trpc.system.sendTestAlert.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStatus("success");
        setMessage(`Preview sent to ${data.sentTo} (${data.itemCount} item${data.itemCount !== 1 ? "s" : ""})`);
      } else {
        setStatus("error");
        setMessage(data.error ?? "Send failed — check server logs");
      }
    },
    onError: (err) => {
      setStatus("error");
      setMessage(err.message);
    },
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleSend = () => {
    if (!toEmail) return;
    setStatus("sending");
    setMessage("");
    sendTest.mutate({ toEmail, toName: toName || "Admin" });
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: "300px",
        background: "#0f1422",
        border: "1px solid rgba(233,30,140,0.3)",
        borderRadius: "10px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(233,30,140,0.1)",
        zIndex: 100,
        padding: "16px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <FlaskConical size={13} style={{ color: "#E91E8C" }} />
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            color: "#f1f5f9",
            textTransform: "uppercase",
          }}>
            Send Test Alert
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: "2px" }}
        >
          <X size={13} />
        </button>
      </div>

      <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "12px", lineHeight: 1.5 }}>
        Sends a preview email using the current live news. Bypasses dedup — always delivers.
      </p>

      {/* Email input */}
      <div style={{ marginBottom: "8px" }}>
        <label style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>
          RECIPIENT EMAIL
        </label>
        <input
          type="email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === "sending"}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            padding: "7px 10px",
            color: "#f1f5f9",
            fontSize: "0.75rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Name input */}
      <div style={{ marginBottom: "14px" }}>
        <label style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", display: "block", marginBottom: "4px" }}>
          RECIPIENT NAME
        </label>
        <input
          type="text"
          value={toName}
          onChange={(e) => setToName(e.target.value)}
          placeholder="Admin"
          disabled={status === "sending"}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            padding: "7px 10px",
            color: "#f1f5f9",
            fontSize: "0.75rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Status message */}
      {status === "success" && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "6px",
          background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: "6px", padding: "8px 10px", marginBottom: "10px",
        }}>
          <CheckCircle size={12} style={{ color: "#10b981", marginTop: "1px", flexShrink: 0 }} />
          <span style={{ fontSize: "0.7rem", color: "#6ee7b7", lineHeight: 1.4 }}>{message}</span>
        </div>
      )}
      {status === "error" && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "6px",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "6px", padding: "8px 10px", marginBottom: "10px",
        }}>
          <XCircle size={12} style={{ color: "#ef4444", marginTop: "1px", flexShrink: 0 }} />
          <span style={{ fontSize: "0.7rem", color: "#fca5a5", lineHeight: 1.4 }}>{message}</span>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!toEmail || status === "sending"}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          background: !toEmail || status === "sending"
            ? "rgba(233,30,140,0.3)"
            : "linear-gradient(90deg, #E91E8C, #f97316)",
          border: "none",
          borderRadius: "6px",
          color: "#fff",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.72rem",
          letterSpacing: "0.06em",
          padding: "9px 16px",
          cursor: !toEmail || status === "sending" ? "not-allowed" : "pointer",
          textTransform: "uppercase",
          transition: "opacity 0.2s",
        }}
      >
        {status === "sending" ? (
          <>
            <Loader2 size={11} className="animate-spin" />
            SENDING...
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle size={11} />
            SEND ANOTHER
          </>
        ) : (
          <>
            <FlaskConical size={11} />
            SEND PREVIEW
          </>
        )}
      </button>
    </div>
  );
}

// ─── TopHeader ────────────────────────────────────────────────────────────────

export default function TopHeader({ pageTitle = "Dashboard" }: TopHeaderProps) {
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [showTestPopover, setShowTestPopover] = useState(false);

  // Show test button only for logged-in users (owner)
  const isOwner = !!user;

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
        position: "relative",
      }}
    >
      {/* Datajar-branded wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px", minWidth: 0 }}>
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
        <span style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", lineHeight: 1 }}>✨</span>

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

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "10px", flexShrink: 0, position: "relative" }}>

        {/* Test Alert button — owner only, hidden on mobile to save space */}
        {isOwner && !isMobile && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowTestPopover((v) => !v)}
              title="Send test alert email"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: showTestPopover
                  ? "rgba(233,30,140,0.2)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${showTestPopover ? "rgba(233,30,140,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "6px",
                color: showTestPopover ? "#E91E8C" : "rgba(255,255,255,0.4)",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.65rem",
                letterSpacing: "0.06em",
                padding: "4px 10px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              <FlaskConical size={10} />
              TEST EMAIL
            </button>

            {showTestPopover && (
              <TestAlertPopover onClose={() => setShowTestPopover(false)} />
            )}
          </div>
        )}

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

      </div>
    </div>

    {/* Subscribe modal */}
    <SubscribeModal isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />
    </>
  );
}
