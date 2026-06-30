/**
 * SubscribeModal — captures name and email, stores in DB via tRPC.
 * Triggered by a "Stay Informed" button in the dashboard header.
 */
import { useState } from "react";
import { X, Mail, User, CheckCircle2, Loader2, Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { clarityEvent } from "@/lib/clarity";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscribeModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
  }>({});

  const subscribe = trpc.subscribers.subscribe.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      clarityEvent("subscribe_success");
    },
    onError: err => {
      if (err.message.includes("already subscribed")) {
        setFieldErrors({ email: "This email is already subscribed." });
      } else if (err.message.toLowerCase().includes("email")) {
        setFieldErrors({ email: err.message });
      } else if (err.message.toLowerCase().includes("name")) {
        setFieldErrors({ name: err.message });
      }
    },
  });

  const validate = () => {
    const errors: { name?: string; email?: string } = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    clarityEvent("subscribe_form_submitted");
    subscribe.mutate({ name: name.trim(), email: email.trim() });
  };

  const handleClose = () => {
    // Reset state on close
    setName("");
    setEmail("");
    setSubmitted(false);
    setFieldErrors({});
    subscribe.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Modal card */}
      <div
        style={{
          background: "#0f1422",
          border: "1px solid rgba(233,30,140,0.25)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "420px",
          boxShadow:
            "0 0 40px rgba(233,30,140,0.12), 0 20px 60px rgba(0,0,0,0.6)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Gradient top bar */}
        <div
          style={{
            height: "3px",
            background: "linear-gradient(90deg, #E91E8C, #f97316)",
          }}
        />

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
          }}
          className="hover:text-white/60 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div style={{ padding: "28px 28px 24px" }}>
          {submitted ? (
            /* ── Success state ── */
            <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={28} color="#10b981" />
              </div>
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "#fff",
                  marginBottom: "8px",
                  letterSpacing: "0.02em",
                }}
              >
                You're in!
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.82rem",
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: 1.5,
                  marginBottom: "20px",
                }}
              >
                Thanks,{" "}
                <strong style={{ color: "rgba(255,255,255,0.8)" }}>
                  {name}
                </strong>
                . We'll keep you updated on critical supply chain disruptions
                and margin risks.
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: "linear-gradient(90deg, #E91E8C, #f97316)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  letterSpacing: "0.05em",
                  padding: "10px 24px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                CLOSE
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "6px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(233,30,140,0.1)",
                    border: "1px solid rgba(233,30,140,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bell size={16} color="#E91E8C" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color: "#fff",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Stay Informed
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.72rem",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    Get notified on critical disruptions
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.5,
                  marginBottom: "20px",
                  paddingTop: "4px",
                }}
              >
                Enter your name and email to receive alerts when major supply
                chain disruptions affect your margin.
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* Name field */}
                <div style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.68rem",
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Full Name
                  </label>
                  <div style={{ position: "relative" }}>
                    <User
                      size={13}
                      style={{
                        position: "absolute",
                        left: "11px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(255,255,255,0.25)",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={e => {
                        setName(e.target.value);
                        if (fieldErrors.name)
                          setFieldErrors(p => ({ ...p, name: undefined }));
                      }}
                      placeholder="Jane Smith"
                      autoComplete="name"
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${fieldErrors.name ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                        borderRadius: "7px",
                        color: "#fff",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.85rem",
                        padding: "10px 12px 10px 32px",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = "rgba(233,30,140,0.5)";
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = fieldErrors.name
                          ? "rgba(239,68,68,0.5)"
                          : "rgba(255,255,255,0.1)";
                      }}
                    />
                  </div>
                  {fieldErrors.name && (
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.68rem",
                        color: "#ef4444",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.name}
                    </div>
                  )}
                </div>

                {/* Email field */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.68rem",
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Email Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail
                      size={13}
                      style={{
                        position: "absolute",
                        left: "11px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(255,255,255,0.25)",
                        pointerEvents: "none",
                      }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (fieldErrors.email)
                          setFieldErrors(p => ({ ...p, email: undefined }));
                      }}
                      placeholder="jane@company.com"
                      autoComplete="email"
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${fieldErrors.email ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
                        borderRadius: "7px",
                        color: "#fff",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.85rem",
                        padding: "10px 12px 10px 32px",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = "rgba(233,30,140,0.5)";
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = fieldErrors.email
                          ? "rgba(239,68,68,0.5)"
                          : "rgba(255,255,255,0.1)";
                      }}
                    />
                  </div>
                  {fieldErrors.email && (
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.68rem",
                        color: "#ef4444",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.email}
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={subscribe.isPending}
                  style={{
                    width: "100%",
                    background: subscribe.isPending
                      ? "rgba(233,30,140,0.4)"
                      : "linear-gradient(90deg, #E91E8C, #f97316)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    letterSpacing: "0.06em",
                    padding: "11px 24px",
                    cursor: subscribe.isPending ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "opacity 0.15s",
                  }}
                >
                  {subscribe.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      SUBSCRIBING...
                    </>
                  ) : (
                    <>
                      <Bell size={14} />
                      SUBSCRIBE FOR ALERTS
                    </>
                  )}
                </button>

                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.65rem",
                    color: "rgba(255,255,255,0.25)",
                    textAlign: "center",
                    marginTop: "10px",
                  }}
                >
                  No spam. Unsubscribe anytime.
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.6rem",
                    color: "rgba(255,255,255,0.18)",
                    textAlign: "center",
                    marginTop: "8px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "8px",
                  }}
                >
                  Analyze your e-commerce data with{" "}
                  <a
                    href="https://datajar.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background:
                        "linear-gradient(90deg, #E91E8C 0%, #f97316 100%)",
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
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
