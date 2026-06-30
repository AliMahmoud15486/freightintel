/**
 * CrisisScenarios.tsx — Freight Intel
 *
 * Strait of Hormuz Crisis Impact Analysis
 * Interactive 5-element × 4-sector matrix with live market signals.
 *
 * Elements: Hidden Cargo Costs · Nitrogen Fortress · Logistics Trap · 24-Hour Shock · Inflationary Tail
 * Sectors:  Inflation · E-commerce · E-Grocery · Customs Agencies
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import NavigationSidebar from "@/components/NavigationSidebar";
import {
  RefreshCw,
  Shield,
  Leaf,
  Navigation,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Flame,
  BarChart2,
  ShoppingCart,
  Package,
  FileText,
  DollarSign,
} from "lucide-react";

// ─── Types (mirrored from server) ─────────────────────────────────────────────

type Severity = "critical" | "high" | "moderate" | "low";

interface LiveSignal {
  label: string;
  value: string;
  unit: string;
  change?: number;
  direction: "up" | "down" | "neutral";
}

interface MatrixCell {
  elementId: string;
  sectorId: string;
  severity: Severity;
  headline: string;
  description: string;
  liveSignals: LiveSignal[];
  impactScore: number;
  timeHorizon: "immediate" | "short" | "medium" | "long";
}

interface CrisisElement {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  overallSeverity: Severity;
  summary: string;
  keyMetric: string;
  keyMetricValue: string;
  keyMetricUnit: string;
  keyMetricChange: number;
}

interface CrisisSector {
  id: string;
  name: string;
  subtitle: string;
  overallSeverity: Severity;
  aggregateImpactScore: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  Severity,
  { bg: string; border: string; text: string; label: string; dot: string }
> = {
  critical: {
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    text: "#ef4444",
    label: "CRITICAL",
    dot: "#ef4444",
  },
  high: {
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
    text: "#f59e0b",
    label: "HIGH",
    dot: "#f59e0b",
  },
  moderate: {
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.3)",
    text: "#3b82f6",
    label: "MODERATE",
    dot: "#3b82f6",
  },
  low: {
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    text: "#10b981",
    label: "LOW",
    dot: "#10b981",
  },
};

const TIME_HORIZON_CONFIG: Record<string, { label: string; color: string }> = {
  immediate: { label: "IMMEDIATE", color: "#ef4444" },
  short: { label: "1–3 MONTHS", color: "#f59e0b" },
  medium: { label: "3–12 MONTHS", color: "#3b82f6" },
  long: { label: "12–24 MONTHS", color: "#8b5cf6" },
};

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  Shield: <Shield size={16} />,
  Leaf: <Leaf size={16} />,
  Navigation: <Navigation size={16} />,
  Zap: <Zap size={16} />,
  TrendingUp: <TrendingUp size={16} />,
};

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  inflation: <DollarSign size={14} />,
  ecommerce: <ShoppingCart size={14} />,
  egrocery: <Package size={14} />,
  customs: <FileText size={14} />,
};

function SeverityBadge({
  severity,
  small,
}: {
  severity: Severity;
  small?: boolean;
}) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      style={{
        padding: small ? "1px 5px" : "2px 7px",
        borderRadius: "3px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.text,
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: small ? "0.58rem" : "0.65rem",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

function ImpactBar({ score, severity }: { score: number; severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div
        style={{
          flex: 1,
          height: "4px",
          borderRadius: "2px",
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, score)}%`,
            height: "100%",
            background: cfg.text,
            borderRadius: "2px",
            transition: "width 0.5s ease",
            boxShadow: `0 0 6px ${cfg.text}60`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.65rem",
          color: cfg.text,
          minWidth: "28px",
          textAlign: "right",
        }}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}

function SignalChip({ signal }: { signal: LiveSignal }) {
  const dirColor =
    signal.direction === "up"
      ? "#ef4444"
      : signal.direction === "down"
        ? "#10b981"
        : "rgba(255,255,255,0.3)";
  const DirIcon =
    signal.direction === "up"
      ? TrendingUp
      : signal.direction === "down"
        ? TrendingDown
        : Minus;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 7px",
        borderRadius: "4px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <DirIcon size={9} color={dirColor} />
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.6rem",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {signal.label}
      </span>
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.68rem",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        {signal.value}
      </span>
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.55rem",
          color: "rgba(255,255,255,0.25)",
        }}
      >
        {signal.unit}
      </span>
      {signal.change !== undefined && Math.abs(signal.change) > 0.5 && (
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.6rem",
            color: dirColor,
          }}
        >
          {signal.change > 0 ? "+" : ""}
          {signal.change.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// ─── Matrix Cell Component ────────────────────────────────────────────────────

function MatrixCellCard({
  cell,
  isSelected,
  onClick,
}: {
  cell: MatrixCell;
  isSelected: boolean;
  onClick: () => void;
}) {
  const cfg = SEVERITY_CONFIG[cell.severity];
  const horizon = TIME_HORIZON_CONFIG[cell.timeHorizon];

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px",
        borderRadius: "6px",
        background: isSelected ? cfg.bg : "rgba(255,255,255,0.02)",
        border: `1px solid ${isSelected ? cfg.border : "rgba(255,255,255,0.06)"}`,
        cursor: "pointer",
        transition: "all 0.15s",
        minHeight: "80px",
      }}
    >
      {/* Severity dot + score */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "5px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: cfg.dot,
              boxShadow: `0 0 5px ${cfg.dot}80`,
              flexShrink: 0,
            }}
          />
          <SeverityBadge severity={cell.severity} small />
        </div>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.7rem",
            color: cfg.text,
          }}
        >
          {Math.round(cell.impactScore)}
        </span>
      </div>

      {/* Headline */}
      <div
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.8)",
          lineHeight: 1.3,
          marginBottom: "4px",
        }}
      >
        {cell.headline}
      </div>

      {/* Time horizon */}
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.55rem",
          color: horizon.color,
          letterSpacing: "0.04em",
        }}
      >
        {horizon.label}
      </div>

      {/* Impact bar */}
      <div style={{ marginTop: "6px" }}>
        <ImpactBar score={cell.impactScore} severity={cell.severity} />
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function CellDetailPanel({
  cell,
  onClose,
}: {
  cell: MatrixCell;
  onClose: () => void;
}) {
  const cfg = SEVERITY_CONFIG[cell.severity];
  const horizon = TIME_HORIZON_CONFIG[cell.timeHorizon];

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${cfg.border}`,
        marginTop: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <SeverityBadge severity={cell.severity} />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.62rem",
                color: horizon.color,
                letterSpacing: "0.04em",
              }}
            >
              {horizon.label}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "1rem",
              color: "rgba(255,255,255,0.9)",
              lineHeight: 1.2,
            }}
          >
            {cell.headline}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.3)",
            padding: "2px",
            flexShrink: 0,
          }}
        >
          <ChevronUp size={14} />
        </button>
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.6,
          marginBottom: "12px",
        }}
      >
        {cell.description}
      </p>

      {/* Impact score */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.6rem",
            color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "4px",
          }}
        >
          Impact Score
        </div>
        <ImpactBar score={cell.impactScore} severity={cell.severity} />
      </div>

      {/* Live signals */}
      {cell.liveSignals.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.6rem",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "6px",
            }}
          >
            Live Signals
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {cell.liveSignals.map((s, i) => (
              <SignalChip key={i} signal={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Element Row Header ───────────────────────────────────────────────────────

function ElementHeader({ element }: { element: CrisisElement }) {
  const cfg = SEVERITY_CONFIG[element.overallSeverity];
  const changeColor =
    element.keyMetricChange > 5
      ? "#ef4444"
      : element.keyMetricChange > 0
        ? "#f59e0b"
        : "#10b981";

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "6px",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid rgba(255,255,255,0.06)`,
        marginBottom: "2px",
      }}
    >
      {/* Icon + name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          marginBottom: "5px",
        }}
      >
        <span style={{ color: cfg.text, flexShrink: 0 }}>
          {ELEMENT_ICONS[element.icon] ?? <Flame size={16} />}
        </span>
        <div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "0.03em",
              lineHeight: 1.2,
            }}
          >
            {element.name}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.58rem",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {element.subtitle}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <SeverityBadge severity={element.overallSeverity} small />
        </div>
      </div>

      {/* Key metric */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.6rem",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          {element.keyMetric}:
        </span>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          {element.keyMetricValue}
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.55rem",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          {element.keyMetricUnit}
        </span>
        {Math.abs(element.keyMetricChange) > 0.5 && (
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "0.65rem",
              color: changeColor,
            }}
          >
            {element.keyMetricChange > 0 ? "+" : ""}
            {element.keyMetricChange.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Summary Table ────────────────────────────────────────────────────────────

function SummaryTable({
  elements,
  sectors,
  matrix,
}: {
  elements: CrisisElement[];
  sectors: CrisisSector[];
  matrix: MatrixCell[];
}) {
  const getCell = (eId: string, sId: string) =>
    matrix.find(c => c.elementId === eId && c.sectorId === sId);

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}
      >
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            <th
              style={{
                padding: "10px 12px",
                textAlign: "left",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                width: "200px",
              }}
            >
              Crisis Element
            </th>
            {sectors.map(s => (
              <th
                key={s.id}
                style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.6rem",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  borderLeft: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{ color: SEVERITY_CONFIG[s.overallSeverity].text }}
                  >
                    {SECTOR_ICONS[s.id]}
                  </span>
                  {s.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {elements.map((el, ei) => (
            <tr
              key={el.id}
              style={{
                background:
                  ei % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              <td
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span
                    style={{
                      color: SEVERITY_CONFIG[el.overallSeverity].text,
                      flexShrink: 0,
                    }}
                  >
                    {ELEMENT_ICONS[el.icon] ?? <Flame size={13} />}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      {el.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.55rem",
                        color: "rgba(255,255,255,0.25)",
                      }}
                    >
                      {el.subtitle}
                    </div>
                  </div>
                </div>
              </td>
              {sectors.map(s => {
                const cell = getCell(el.id, s.id);
                if (!cell)
                  return (
                    <td
                      key={s.id}
                      style={{
                        borderLeft: "1px solid rgba(255,255,255,0.04)",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    />
                  );
                const cfg = SEVERITY_CONFIG[cell.severity];
                return (
                  <td
                    key={s.id}
                    style={{
                      padding: "8px 12px",
                      textAlign: "center",
                      borderLeft: "1px solid rgba(255,255,255,0.04)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          color: cfg.text,
                        }}
                      >
                        {Math.round(cell.impactScore)}
                      </div>
                      <SeverityBadge severity={cell.severity} small />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CrisisScenarios() {
  const [selectedCell, setSelectedCell] = useState<{
    elementId: string;
    sectorId: string;
  } | null>(null);
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const [view, setView] = useState<"matrix" | "summary">("matrix");

  const { data, isLoading, isFetching, refetch } =
    trpc.crisisScenarios.getMatrix.useQuery(undefined, {
      refetchInterval: 30 * 60 * 1000,
      staleTime: 28 * 60 * 1000,
    });

  const elements = data?.elements ?? [];
  const sectors = data?.sectors ?? [];
  const matrix = data?.matrix ?? [];
  const snap = data?.marketSnapshot;

  const getCell = (eId: string, sId: string) =>
    matrix.find(c => c.elementId === eId && c.sectorId === sId);

  const selectedCellData = selectedCell
    ? getCell(selectedCell.elementId, selectedCell.sectorId)
    : null;

  const overallScore = data?.overallCrisisScore ?? 0;
  const overallSeverity: Severity =
    overallScore >= 75
      ? "critical"
      : overallScore >= 50
        ? "high"
        : overallScore >= 25
          ? "moderate"
          : "low";

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
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "4px",
              }}
            >
              <Flame size={18} color="#ef4444" />
              <h1
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.4rem",
                  color: "rgba(255,255,255,0.92)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Strait of Hormuz Crisis
              </h1>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "3px",
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.6rem",
                  letterSpacing: "0.06em",
                }}
              >
                ACTIVE SCENARIO
              </span>
            </div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.35)",
                margin: 0,
              }}
            >
              5-element impact analysis across Inflation · E-commerce ·
              E-Grocery · Customs Agencies
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* View toggle */}
            <div
              style={{
                display: "flex",
                borderRadius: "5px",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              {(["matrix", "summary"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: "5px 12px",
                    background:
                      view === v ? "rgba(233,30,140,0.15)" : "transparent",
                    border: "none",
                    borderRight:
                      v === "matrix"
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "none",
                    color: view === v ? "#E91E8C" : "rgba(255,255,255,0.35)",
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.68rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {v === "matrix" ? "MATRIX" : "SUMMARY"}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "5px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "0.68rem",
                letterSpacing: "0.04em",
                cursor: isFetching ? "not-allowed" : "pointer",
                opacity: isFetching ? 0.5 : 1,
              }}
            >
              <RefreshCw
                size={11}
                style={{
                  animation: isFetching ? "spin 1s linear infinite" : "none",
                }}
              />
              REFRESH
            </button>
          </div>
        </div>

        {/* ── Overall Crisis Score ─────────────────────────────────────────── */}
        {!isLoading && data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            {/* Overall score */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "7px",
                background: SEVERITY_CONFIG[overallSeverity].bg,
                border: `1px solid ${SEVERITY_CONFIG[overallSeverity].border}`,
              }}
            >
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.6rem",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "4px",
                }}
              >
                Overall Crisis Score
              </div>
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.6rem",
                  color: SEVERITY_CONFIG[overallSeverity].text,
                  lineHeight: 1,
                }}
              >
                {overallScore}
              </div>
              <div style={{ marginTop: "6px" }}>
                <SeverityBadge severity={overallSeverity} />
              </div>
            </div>

            {/* Market snapshot chips */}
            {snap &&
              [
                {
                  label: "BRENT",
                  value: snap.brentPrice.toFixed(2),
                  unit: "$/bbl",
                },
                {
                  label: "BDRY",
                  value: snap.bdryPrice.toFixed(2),
                  unit: "USD",
                },
                {
                  label: "UREA (UAN)",
                  value: snap.uanPrice.toFixed(2),
                  unit: "USD",
                },
                {
                  label: "WAR RISK",
                  value: snap.warRiskPremium.toFixed(2),
                  unit: "% cargo",
                },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "7px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.6rem",
                      color: "rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "4px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.3rem",
                      color: "rgba(255,255,255,0.85)",
                      lineHeight: 1,
                    }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.6rem",
                      color: "rgba(255,255,255,0.25)",
                      marginTop: "2px",
                    }}
                  >
                    {item.unit}
                  </div>
                </div>
              ))}

            {/* Last updated */}
            {data.lastUpdated && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "7px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.6rem",
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "4px",
                  }}
                >
                  Last Updated
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {new Date(data.lastUpdated).toLocaleTimeString()}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.6rem",
                    color: "rgba(255,255,255,0.25)",
                    marginTop: "2px",
                  }}
                >
                  30-min cache
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  height: "60px",
                  borderRadius: "7px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
            <div
              style={{
                textAlign: "center",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.25)",
                marginTop: "4px",
              }}
            >
              Loading live market data…
            </div>
          </div>
        )}

        {/* ── Summary View ─────────────────────────────────────────────────── */}
        {!isLoading && data && view === "summary" && (
          <div>
            <SummaryTable
              elements={elements}
              sectors={sectors}
              matrix={matrix}
            />

            {/* Sector score bars */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              {sectors.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "7px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{ color: SEVERITY_CONFIG[s.overallSeverity].text }}
                    >
                      {SECTOR_ICONS[s.id]}
                    </span>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.58rem",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {s.subtitle}
                      </div>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <SeverityBadge severity={s.overallSeverity} small />
                    </div>
                  </div>
                  <ImpactBar
                    score={s.aggregateImpactScore}
                    severity={s.overallSeverity}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Matrix View ──────────────────────────────────────────────────── */}
        {!isLoading && data && view === "matrix" && (
          <div>
            {/* Sector column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "260px repeat(4, 1fr)",
                gap: "8px",
                marginBottom: "6px",
                paddingLeft: "0",
              }}
            >
              <div />
              {sectors.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      marginBottom: "3px",
                    }}
                  >
                    <span
                      style={{ color: SEVERITY_CONFIG[s.overallSeverity].text }}
                    >
                      {SECTOR_ICONS[s.id]}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: "rgba(255,255,255,0.8)",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {s.name}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.55rem",
                      color: "rgba(255,255,255,0.25)",
                      marginBottom: "4px",
                    }}
                  >
                    {s.subtitle}
                  </div>
                  <ImpactBar
                    score={s.aggregateImpactScore}
                    severity={s.overallSeverity}
                  />
                </div>
              ))}
            </div>

            {/* Element rows */}
            {elements.map(el => (
              <div key={el.id} style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "260px repeat(4, 1fr)",
                    gap: "8px",
                    alignItems: "start",
                  }}
                >
                  {/* Element header */}
                  <div
                    onClick={() =>
                      setActiveElement(activeElement === el.id ? null : el.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <ElementHeader element={el} />
                  </div>

                  {/* Sector cells */}
                  {sectors.map(s => {
                    const cell = getCell(el.id, s.id);
                    if (!cell) return <div key={s.id} />;
                    const isSelected =
                      selectedCell?.elementId === el.id &&
                      selectedCell?.sectorId === s.id;
                    return (
                      <MatrixCellCard
                        key={s.id}
                        cell={cell}
                        isSelected={isSelected}
                        onClick={() =>
                          setSelectedCell(
                            isSelected
                              ? null
                              : { elementId: el.id, sectorId: s.id }
                          )
                        }
                      />
                    );
                  })}
                </div>

                {/* Element summary (expandable) */}
                {activeElement === el.id && (
                  <div
                    style={{
                      marginTop: "4px",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <BarChart2
                      size={13}
                      color="rgba(255,255,255,0.2)"
                      style={{ flexShrink: 0, marginTop: "2px" }}
                    />
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.72rem",
                        color: "rgba(255,255,255,0.45)",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {el.summary}
                    </p>
                  </div>
                )}

                {/* Cell detail panel */}
                {selectedCellData && selectedCell?.elementId === el.id && (
                  <CellDetailPanel
                    cell={selectedCellData}
                    onClose={() => setSelectedCell(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: "20px",
            padding: "10px 14px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={11} color="rgba(255,255,255,0.2)" />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.62rem",
                color: "rgba(255,255,255,0.2)",
              }}
            >
              Impact scores are computed from live market data (Brent, BDRY,
              UAN, MOS, ZC=F, ZW=F) · 30-min cache · Not financial advice
            </span>
          </div>
          <a
            href="https://datajar.co"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "rgba(255,255,255,0.2)",
              textDecoration: "none",
            }}
          >
            <span
              style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem" }}
            >
              Powered by Datajar
            </span>
            <ExternalLink size={9} />
          </a>
        </div>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
