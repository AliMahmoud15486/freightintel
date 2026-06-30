/**
 * Analyst.tsx — Freight Intel
 *
 * AI Supply-Chain Analyst page:
 *   - Daily Briefing: auto-generated morning brief over the live state.
 *   - Action Playbooks: prescriptive, quantified mitigation recommendations.
 *   - Ask the Analyst: grounded Q&A chat over the same live data.
 */
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import NavigationSidebar from "@/components/NavigationSidebar";
import {
  Brain,
  RefreshCw,
  Send,
  Sparkles,
  AlertTriangle,
  ArrowRightLeft,
  PackagePlus,
  Tag,
  Navigation,
  Fuel,
  Eye,
  ShieldCheck,
} from "lucide-react";

// ─── Types (mirrored from server) ─────────────────────────────────────────────

type Risk = "low" | "elevated" | "high";
type Severity = "critical" | "warning" | "info";
type ActionType =
  | "switch_carrier"
  | "pre_buy"
  | "reprice"
  | "reroute"
  | "hedge"
  | "monitor";

interface PlaybookAction {
  type: ActionType;
  description: string;
  estimatedImpact: string;
}
interface Playbook {
  id: string;
  trigger: string;
  affectedArea: string;
  severity: Severity;
  actions: PlaybookAction[];
  rationale: string;
  confidence: "high" | "medium" | "low";
}
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const FONT_HEAD = "'Rajdhani', sans-serif";
const FONT_BODY = "'Inter', sans-serif";

const riskColor: Record<Risk, string> = {
  low: "#10b981",
  elevated: "#f59e0b",
  high: "#ef4444",
};
const sevColor: Record<Severity, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#10b981",
};

const ACTION_META: Record<
  ActionType,
  { label: string; icon: React.ReactNode }
> = {
  switch_carrier: {
    label: "Switch carrier",
    icon: <ArrowRightLeft size={12} />,
  },
  pre_buy: { label: "Pre-buy", icon: <PackagePlus size={12} /> },
  reprice: { label: "Reprice", icon: <Tag size={12} /> },
  reroute: { label: "Reroute", icon: <Navigation size={12} /> },
  hedge: { label: "Hedge", icon: <Fuel size={12} /> },
  monitor: { label: "Monitor", icon: <Eye size={12} /> },
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  padding: "16px",
};

function Badge({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "3px",
        background: `${color}1f`,
        border: `1px solid ${color}4d`,
        color,
        fontFamily: FONT_HEAD,
        fontWeight: 700,
        fontSize: "0.6rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "10px",
      }}
    >
      {icon}
      <h2
        style={{
          fontFamily: FONT_HEAD,
          fontWeight: 700,
          fontSize: "0.95rem",
          color: "rgba(255,255,255,0.9)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {children}
      </h2>
    </div>
  );
}

// ─── Daily Briefing ───────────────────────────────────────────────────────────

function BriefingCard() {
  const { data, isLoading, isFetching, refetch } =
    trpc.analyst.briefing.useQuery(undefined, {
      refetchInterval: 6 * 60 * 60 * 1000,
      staleTime: 6 * 60 * 60 * 1000 - 60_000,
    });

  return (
    <div style={card}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <SectionTitle icon={<Sparkles size={16} color="#f97316" />}>
          Daily Briefing
        </SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {data && (
            <Badge color={riskColor[data.overallRisk]}>
              {data.overallRisk} risk
            </Badge>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh briefing"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "5px",
              color: "rgba(255,255,255,0.5)",
              cursor: isFetching ? "default" : "pointer",
              fontFamily: FONT_HEAD,
              fontSize: "0.65rem",
            }}
          >
            <RefreshCw
              size={11}
              style={{
                animation: isFetching ? "spin 1s linear infinite" : "none",
              }}
            />
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Generating today's briefing…
        </p>
      ) : (
        <>
          <h3
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 600,
              fontSize: "1.05rem",
              color: "rgba(255,255,255,0.95)",
              margin: "0 0 6px",
            }}
          >
            {data.headline}
          </h3>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: "0.82rem",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.6)",
              margin: "0 0 12px",
            }}
          >
            {data.summary}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {data.keyPoints.length > 0 && (
              <div>
                <Label>Key points</Label>
                <ul style={listStyle}>
                  {data.keyPoints.map((p, i) => (
                    <li key={i} style={liStyle}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.watchItems.length > 0 && (
              <div>
                <Label>Watch next 24–72h</Label>
                <ul style={listStyle}>
                  {data.watchItems.map((p, i) => (
                    <li key={i} style={liStyle}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const listStyle: React.CSSProperties = {
  margin: "6px 0 0",
  padding: "0 0 0 16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};
const liStyle: React.CSSProperties = {
  fontFamily: FONT_BODY,
  fontSize: "0.78rem",
  lineHeight: 1.4,
  color: "rgba(255,255,255,0.7)",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: FONT_HEAD,
        fontWeight: 700,
        fontSize: "0.62rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.35)",
      }}
    >
      {children}
    </span>
  );
}

// ─── Action Playbooks ─────────────────────────────────────────────────────────

function PlaybooksSection() {
  const { data, isLoading, isFetching, refetch } = trpc.playbooks.get.useQuery(
    undefined,
    {
      refetchInterval: 30 * 60 * 1000,
      staleTime: 28 * 60 * 1000,
    }
  );

  const playbooks: Playbook[] = data?.playbooks ?? [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <SectionTitle icon={<ShieldCheck size={16} color="#f97316" />}>
          Action Playbooks
        </SectionTitle>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh playbooks"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 8px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "5px",
            color: "rgba(255,255,255,0.5)",
            cursor: isFetching ? "default" : "pointer",
            fontFamily: FONT_HEAD,
            fontSize: "0.65rem",
          }}
        >
          <RefreshCw
            size={11}
            style={{
              animation: isFetching ? "spin 1s linear infinite" : "none",
            }}
          />
        </button>
      </div>

      {isLoading ? (
        <p style={{ ...liStyle, color: "rgba(255,255,255,0.4)" }}>
          Generating mitigation playbooks…
        </p>
      ) : playbooks.length === 0 ? (
        <div
          style={{
            ...card,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <ShieldCheck size={18} color="#10b981" />
          <span style={{ ...liStyle, color: "rgba(255,255,255,0.55)" }}>
            No material disruptions require action right now. We'll surface
            playbooks here as soon as live signals warrant it.
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "12px",
          }}
        >
          {playbooks.map(pb => (
            <div key={pb.id} style={card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <AlertTriangle size={14} color={sevColor[pb.severity]} />
                  <span
                    style={{
                      fontFamily: FONT_HEAD,
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    {pb.trigger}
                  </span>
                </div>
                <Badge color={sevColor[pb.severity]}>{pb.severity}</Badge>
              </div>

              {pb.affectedArea && (
                <p
                  style={{
                    ...liStyle,
                    color: "rgba(255,255,255,0.45)",
                    margin: "0 0 10px",
                  }}
                >
                  Affects: {pb.affectedArea}
                </p>
              )}

              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {pb.actions.map((a, i) => {
                  const meta = ACTION_META[a.type];
                  return (
                    <div
                      key={i}
                      style={{
                        background: "rgba(249,115,22,0.06)",
                        border: "1px solid rgba(249,115,22,0.18)",
                        borderRadius: "6px",
                        padding: "8px 10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#f97316",
                          fontFamily: FONT_HEAD,
                          fontWeight: 700,
                          fontSize: "0.62rem",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          marginBottom: "4px",
                        }}
                      >
                        {meta.icon}
                        {meta.label}
                      </div>
                      <p style={{ ...liStyle, margin: 0 }}>{a.description}</p>
                      {a.estimatedImpact && (
                        <p
                          style={{
                            ...liStyle,
                            margin: "4px 0 0",
                            color: "rgba(255,255,255,0.45)",
                            fontStyle: "italic",
                          }}
                        >
                          Impact: {a.estimatedImpact}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {pb.rationale && (
                <p
                  style={{
                    ...liStyle,
                    color: "rgba(255,255,255,0.5)",
                    margin: "10px 0 0",
                  }}
                >
                  {pb.rationale}
                </p>
              )}
              <div style={{ marginTop: "8px" }}>
                <Label>Confidence: {pb.confidence}</Label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ask the Analyst (chat) ───────────────────────────────────────────────────

const SUGGESTIONS = [
  "What's my biggest margin risk this week?",
  "Which carriers should I avoid right now?",
  "How is oil affecting freight costs today?",
];

function AskAnalyst() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const ask = trpc.analyst.ask.useMutation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || ask.isPending) return;
    const history = messages.slice(-8);
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setInput("");
    ask.mutate(
      { question, history },
      {
        onSuccess: res => {
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: res.answer },
          ]);
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
            });
          });
        },
        onError: () => {
          setMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content:
                "Something went wrong reaching the analyst. Please try again.",
            },
          ]);
        },
      }
    );
  };

  return (
    <div style={card}>
      <SectionTitle icon={<Brain size={16} color="#f97316" />}>
        Ask the Analyst
      </SectionTitle>

      <div
        ref={scrollRef}
        style={{
          maxHeight: "340px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "12px",
          minHeight: messages.length ? "120px" : "auto",
        }}
      >
        {messages.length === 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  color: "rgba(255,255,255,0.6)",
                  fontFamily: FONT_BODY,
                  fontSize: "0.74rem",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "8px 12px",
              borderRadius: "10px",
              background:
                m.role === "user"
                  ? "rgba(249,115,22,0.14)"
                  : "rgba(255,255,255,0.04)",
              border:
                m.role === "user"
                  ? "1px solid rgba(249,115,22,0.3)"
                  : "1px solid rgba(255,255,255,0.08)",
              fontFamily: FONT_BODY,
              fontSize: "0.82rem",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.85)",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </div>
        ))}

        {ask.isPending && (
          <div
            style={{
              alignSelf: "flex-start",
              ...liStyle,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Analyst is thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: "flex", gap: "8px" }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about disruptions, carriers, prices, or your margins…"
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            color: "rgba(255,255,255,0.9)",
            fontFamily: FONT_BODY,
            fontSize: "0.82rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={ask.isPending || !input.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 14px",
            background:
              ask.isPending || !input.trim()
                ? "rgba(249,115,22,0.3)"
                : "#f97316",
            border: "none",
            borderRadius: "6px",
            color: "#0a0a0f",
            fontFamily: FONT_HEAD,
            fontWeight: 700,
            fontSize: "0.72rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: ask.isPending || !input.trim() ? "default" : "pointer",
          }}
        >
          <Send size={13} />
          Send
        </button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Analyst() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0f" }}>
      <NavigationSidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: "20px 24px",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <Brain size={18} color="#f97316" />
            <h1
              style={{
                fontFamily: FONT_HEAD,
                fontWeight: 700,
                fontSize: "1.4rem",
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              AI Analyst
            </h1>
            <Badge color="#f97316">Live</Badge>
          </div>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.35)",
              margin: 0,
            }}
          >
            Briefing, prescriptive playbooks, and a grounded analyst chat —
            powered by live prices, disruptions, and risk signals.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <BriefingCard />
          <PlaybooksSection />
          <AskAnalyst />
        </div>
      </main>
    </div>
  );
}
