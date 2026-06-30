/**
 * MerchantProfile.tsx — Freight Intel
 *
 * Redesigned with improved UX:
 *   - Sticky profile header with avatar, completeness ring, and key stats
 *   - Tab-based navigation (no all-expanded accordion overwhelm)
 *   - Business Details: clean 2-col grid with section grouping
 *   - Margin Targets: visual target/floor range cards with live margin comparison
 *   - Carrier Preferences: three grouped columns with colour-coded chips
 *   - Notifications: card-based toggles with clear descriptions
 *   - History: sparkline + table with an inline add-snapshot drawer
 */
import { useState, useEffect, useMemo } from "react";
import {
  User,
  Building2,
  Target,
  Ship,
  Bell,
  BarChart3,
  Save,
  Plus,
  X,
  Globe,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  MapPin,
  Package,
  Truck,
  Mail,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import NavigationSidebar from "@/components/NavigationSidebar";
import TopHeader from "@/components/TopHeader";
import GlobalPulseBar from "@/components/GlobalPulseBar";

// ─── constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Electronics",
  "Apparel & Footwear",
  "Home & Furniture",
  "Toys & Games",
  "Health & Beauty",
  "Automotive Parts",
  "Food & Beverage",
  "Industrial Equipment",
  "Sporting Goods",
  "Jewellery & Accessories",
  "Other",
];

const COMPANY_SIZES = [
  "Solo / Freelancer",
  "2–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–1,000 employees",
  "1,000+ employees",
];

const IMPORT_VOLUMES = [
  "< $100K / year",
  "$100K–$500K",
  "$500K–$2M",
  "$2M–$10M",
  "$10M–$50M",
  "$50M+",
];

const SOURCING_REGIONS = [
  "China",
  "Vietnam",
  "Bangladesh",
  "India",
  "Turkey",
  "Mexico",
  "Indonesia",
  "Thailand",
  "South Korea",
  "Germany",
  "USA",
  "UK",
  "Japan",
  "Taiwan",
  "Malaysia",
];

const PRODUCT_CATEGORIES = [
  "Electronics",
  "Apparel",
  "Home & Garden",
  "Toys",
  "Auto Parts",
  "Industrial",
  "Health & Beauty",
  "Food & Beverage",
  "Sporting Goods",
  "Jewellery",
];

const CARRIERS = [
  "Maersk",
  "MSC",
  "CMA CGM",
  "COSCO",
  "Hapag-Lloyd",
  "Evergreen",
  "ONE",
  "Yang Ming",
  "HMM",
  "ZIM",
];

const TRADE_LANES = [
  "Shanghai → Rotterdam",
  "Shenzhen → Los Angeles",
  "Guangzhou → New York",
  "Mumbai → Felixstowe",
  "Ho Chi Minh → Hamburg",
  "Busan → Long Beach",
  "Jakarta → Rotterdam",
  "Bangkok → Antwerp",
  "Colombo → Southampton",
  "Karachi → Jebel Ali",
];

const MARGIN_CATEGORIES = [
  { id: "electronics", label: "Electronics", icon: "📦" },
  { id: "apparel", label: "Apparel", icon: "👕" },
  { id: "home-garden", label: "Home & Garden", icon: "🏡" },
  { id: "toys", label: "Toys", icon: "🎮" },
  { id: "auto-parts", label: "Auto Parts", icon: "🔧" },
  { id: "industrial", label: "Industrial", icon: "⚙️" },
];

type TabId = "business" | "targets" | "carriers" | "notifications" | "history";

const TABS: { id: TabId; label: string; icon: any; description: string }[] = [
  {
    id: "business",
    label: "Business",
    icon: Building2,
    description: "Company info & sourcing",
  },
  {
    id: "targets",
    label: "Margin Targets",
    icon: Target,
    description: "Category targets & floors",
  },
  {
    id: "carriers",
    label: "Carriers",
    icon: Ship,
    description: "Preferred carriers & lanes",
  },
  {
    id: "notifications",
    label: "Alerts",
    icon: Bell,
    description: "Notification preferences",
  },
  {
    id: "history",
    label: "History",
    icon: BarChart3,
    description: "Monthly margin snapshots",
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function computeCompleteness(
  biz: any,
  targets: any,
  carriers: any,
  notifs: any,
  history: any[]
): number {
  let score = 0;
  if (biz.businessName) score += 15;
  if (biz.industry) score += 10;
  if (biz.companySize) score += 5;
  if (biz.annualImportVolume) score += 5;
  if (biz.sourcingRegions.length) score += 15;
  if (biz.productCategories.length) score += 10;
  if (biz.website) score += 5;
  if (biz.bio) score += 5;
  if (Object.keys(targets).length > 0) score += 10;
  if (carriers.preferredCarriers.length > 0) score += 5;
  if (carriers.preferredLanes.length > 0) score += 5;
  if (history.length > 0) score += 10;
  return Math.min(100, score);
}

// SVG completeness ring
function CompletenessRing({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f97316" : "#ef4444";
  return (
    <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={28}
        cy={28}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={4}
      />
      <circle
        cx={28}
        cy={28}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// Chip tag selector
function ChipSelector({
  options,
  selected,
  onToggle,
  color = "#f97316",
  size = "md",
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  color?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: size === "sm" ? "5px" : "7px",
      }}
    >
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            style={{
              padding: size === "sm" ? "3px 9px" : "5px 13px",
              borderRadius: "20px",
              fontSize: size === "sm" ? "0.68rem" : "0.73rem",
              fontFamily: "'Inter', sans-serif",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              background: active ? `${color}20` : "rgba(255,255,255,0.04)",
              border: `1px solid ${active ? color + "80" : "rgba(255,255,255,0.1)"}`,
              color: active ? color : "rgba(255,255,255,0.45)",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {active && <CheckCircle2 size={10} />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// Field group wrapper
function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ marginBottom: "6px" }}>
        <label
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {label}
        </label>
        {hint && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.25)",
              marginLeft: "6px",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "7px",
  padding: "9px 13px",
  color: "rgba(255,255,255,0.85)",
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.82rem",
  outline: "none",
  boxSizing: "border-box",
};

// Section divider
function SectionDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        margin: "20px 0 14px",
      }}
    >
      <div
        style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }}
      />
      <span
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "0.65rem",
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.25)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div
        style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }}
      />
    </div>
  );
}

// Save button
function SaveBtn({
  isPending,
  onClick,
  label = "SAVE CHANGES",
}: {
  isPending: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        padding: "10px 22px",
        background: isPending
          ? "rgba(249,115,22,0.1)"
          : "rgba(249,115,22,0.18)",
        border: `1px solid ${isPending ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.5)"}`,
        borderRadius: "8px",
        color: isPending ? "rgba(249,115,22,0.4)" : "#f97316",
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        fontSize: "0.82rem",
        letterSpacing: "0.07em",
        cursor: isPending ? "not-allowed" : "pointer",
        transition: "all 0.15s",
      }}
    >
      <Save size={13} />
      {isPending ? "SAVING…" : label}
    </button>
  );
}

// Notification toggle card
function NotifCard({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  accent = "#f97316",
}: {
  icon: any;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        padding: "14px 16px",
        borderRadius: "10px",
        cursor: "pointer",
        background: checked ? `${accent}0d` : "rgba(255,255,255,0.03)",
        border: `1px solid ${checked ? accent + "40" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "9px",
          flexShrink: 0,
          background: checked ? `${accent}20` : "rgba(255,255,255,0.05)",
          border: `1px solid ${checked ? accent + "40" : "rgba(255,255,255,0.08)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        <Icon
          size={15}
          style={{ color: checked ? accent : "rgba(255,255,255,0.3)" }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: checked ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
            marginBottom: "2px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.3)",
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
      {/* Toggle pill */}
      <div
        style={{
          width: 42,
          height: 24,
          borderRadius: "12px",
          flexShrink: 0,
          background: checked ? accent : "rgba(255,255,255,0.1)",
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "4px",
            left: checked ? "22px" : "4px",
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "white",
            transition: "left 0.2s",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function MerchantProfile() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("business");
  const [showSnapshotForm, setShowSnapshotForm] = useState(false);

  // ── tRPC queries / mutations ────────────────────────────────────────────────
  const {
    data: profile,
    isLoading: profileLoading,
    refetch,
  } = trpc.merchantProfile.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const { data: historyRows, refetch: refetchHistory } =
    trpc.merchantProfile.getMarginHistory.useQuery(undefined, {
      enabled: isAuthenticated,
      staleTime: 5 * 60 * 1000,
    });

  const updateProfile = trpc.merchantProfile.updateProfile.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Business details saved");
    },
  });
  const upsertTargets = trpc.merchantProfile.upsertMarginTargets.useMutation({
    onSuccess: () => toast.success("Margin targets saved"),
  });
  const upsertCarriers = trpc.merchantProfile.upsertCarrierPrefs.useMutation({
    onSuccess: () => toast.success("Carrier preferences saved"),
  });
  const upsertNotifs = trpc.merchantProfile.upsertNotificationPrefs.useMutation(
    { onSuccess: () => toast.success("Notification preferences saved") }
  );
  const addSnapshot = trpc.merchantProfile.addMarginSnapshot.useMutation({
    onSuccess: () => {
      refetchHistory();
      toast.success("Snapshot recorded");
      setShowSnapshotForm(false);
    },
  });

  // ── local form state ────────────────────────────────────────────────────────
  const [biz, setBiz] = useState({
    businessName: "",
    industry: "",
    companySize: "",
    annualImportVolume: "",
    sourcingRegions: [] as string[],
    productCategories: [] as string[],
    website: "",
    bio: "",
  });

  const [targets, setTargets] = useState<
    Record<string, { target: number; floor: number }>
  >({});

  const [carrierPrefs, setCarrierPrefs] = useState({
    preferredCarriers: [] as string[],
    avoidCarriers: [] as string[],
    preferredLanes: [] as string[],
  });

  const [notifPrefs, setNotifPrefs] = useState({
    emailAlerts: true,
    criticalOnly: false,
    weeklyDigest: true,
    marginDropAlert: true,
    marginDropThreshold: 5,
  });

  const [snapshot, setSnapshot] = useState({
    month: new Date().toISOString().slice(0, 7),
    avgMargin: 28,
    bestMargin: 42,
    worstMargin: 18,
    avgBrentPrice: 85,
    criticalSkuCount: 2,
    note: "",
  });

  // Sync profile data into local state once loaded
  useEffect(() => {
    if (!profile) return;
    setBiz({
      businessName: profile.businessName,
      industry: profile.industry,
      companySize: profile.companySize,
      annualImportVolume: profile.annualImportVolume,
      sourcingRegions: profile.sourcingRegions,
      productCategories: profile.productCategories,
      website: profile.website,
      bio: profile.bio,
    });
    setTargets(
      profile.marginTargets as Record<string, { target: number; floor: number }>
    );
    setCarrierPrefs(profile.carrierPrefs as typeof carrierPrefs);
    setNotifPrefs(profile.notificationPrefs as typeof notifPrefs);
  }, [profile]);

  // ── derived ─────────────────────────────────────────────────────────────────
  const completeness = useMemo(
    () =>
      computeCompleteness(
        biz,
        targets,
        carrierPrefs,
        notifPrefs,
        historyRows ?? []
      ),
    [biz, targets, carrierPrefs, notifPrefs, historyRows]
  );

  const chartData = useMemo(
    () =>
      [...(historyRows ?? [])]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(r => ({
          month: r.month,
          margin: r.avgMargin,
          best: r.bestMargin ?? r.avgMargin + 5,
          worst: r.worstMargin ?? r.avgMargin - 5,
        })),
    [historyRows]
  );

  const latestMargin =
    chartData.length > 0 ? chartData[chartData.length - 1].margin : null;
  const prevMargin =
    chartData.length > 1 ? chartData[chartData.length - 2].margin : null;
  const marginDelta =
    latestMargin != null && prevMargin != null
      ? latestMargin - prevMargin
      : null;

  // ── toggle helpers ──────────────────────────────────────────────────────────
  const toggleRegion = (r: string) =>
    setBiz(p => ({
      ...p,
      sourcingRegions: p.sourcingRegions.includes(r)
        ? p.sourcingRegions.filter(x => x !== r)
        : [...p.sourcingRegions, r],
    }));
  const toggleCategory = (c: string) =>
    setBiz(p => ({
      ...p,
      productCategories: p.productCategories.includes(c)
        ? p.productCategories.filter(x => x !== c)
        : [...p.productCategories, c],
    }));
  const togglePref = (
    field: "preferredCarriers" | "avoidCarriers" | "preferredLanes",
    v: string
  ) =>
    setCarrierPrefs(p => ({
      ...p,
      [field]: p[field].includes(v)
        ? p[field].filter(x => x !== v)
        : [...p[field], v],
    }));

  // ── auth / loading guards ───────────────────────────────────────────────────
  if (authLoading || profileLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", background: "#0a0e1a" }}>
        <NavigationSidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <TopHeader />
          <GlobalPulseBar />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                className="animate-spin"
                style={{
                  width: 36,
                  height: 36,
                  border: "2px solid rgba(249,115,22,0.2)",
                  borderTop: "2px solid #f97316",
                  borderRadius: "50%",
                  margin: "0 auto 14px",
                }}
              />
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.8rem",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                Loading your profile…
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", height: "100vh", background: "#0a0e1a" }}>
        <NavigationSidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <TopHeader />
          <GlobalPulseBar />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center", maxWidth: 360 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "16px",
                  background: "rgba(249,115,22,0.1)",
                  border: "1px solid rgba(249,115,22,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <User size={28} style={{ color: "#f97316" }} />
              </div>
              <h2
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.4rem",
                  color: "rgba(255,255,255,0.9)",
                  letterSpacing: "0.06em",
                  margin: "0 0 10px",
                }}
              >
                SIGN IN REQUIRED
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.8rem",
                  color: "rgba(255,255,255,0.4)",
                  margin: "0 0 24px",
                  lineHeight: 1.7,
                }}
              >
                Your Merchant Profile is tied to your account. Sign in to view
                and manage your business settings, margin targets, and carrier
                preferences.
              </p>
              <a
                href={getLoginUrl()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "11px 28px",
                  borderRadius: "9px",
                  background: "rgba(249,115,22,0.18)",
                  border: "1px solid rgba(249,115,22,0.4)",
                  color: "#f97316",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  letterSpacing: "0.06em",
                  textDecoration: "none",
                }}
              >
                SIGN IN <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#0a0e1a",
      }}
    >
      <NavigationSidebar activeSection="profile" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <TopHeader />
        <GlobalPulseBar />

        {/* ── Profile Header ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.01)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {/* Avatar + completeness ring */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <CompletenessRing pct={completeness} />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 36,
                height: 36,
                borderRadius: "9px",
                background: "linear-gradient(135deg, #f97316, #E91E8C)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 14px rgba(249,115,22,0.35)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "white",
                }}
              >
                {(biz.businessName || user?.name || "?")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "1.25rem",
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                margin: "0 0 3px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {biz.businessName || user?.name || "Your Business"}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {biz.industry && (
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {biz.industry}
                </span>
              )}
              {biz.companySize && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    {biz.companySize}
                  </span>
                </>
              )}
              {user?.email && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {user.email}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Completeness indicator */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "10px 16px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 800,
                fontSize: "1.4rem",
                color:
                  completeness >= 80
                    ? "#10b981"
                    : completeness >= 50
                      ? "#f97316"
                      : "#ef4444",
                lineHeight: 1,
              }}
            >
              {completeness}%
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.3)",
                marginTop: "2px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Profile Complete
            </span>
          </div>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
            {[
              {
                icon: MapPin,
                value: biz.sourcingRegions.length || "—",
                label: "Regions",
              },
              {
                icon: Package,
                value: biz.productCategories.length || "—",
                label: "Categories",
              },
              {
                icon: BarChart3,
                value: historyRows?.length ?? "—",
                label: "Snapshots",
              },
              {
                icon: TrendingUp,
                value:
                  latestMargin != null ? `${latestMargin.toFixed(1)}%` : "—",
                label: "Avg Margin",
              },
            ].map(s => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  minWidth: "60px",
                }}
              >
                <s.icon
                  size={13}
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "3px",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.58rem",
                    color: "rgba(255,255,255,0.25)",
                    marginTop: "2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab Bar ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            padding: "8px 24px 0",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
            overflowX: "auto",
          }}
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "9px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? "#f97316" : "transparent"}`,
                  color: active ? "#f97316" : "rgba(255,255,255,0.4)",
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                  marginBottom: "-1px",
                }}
              >
                <Icon size={14} />
                {tab.label.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 32px" }}>
          {/* ── TAB: Business Details ─────────────────────────────────── */}
          {activeTab === "business" && (
            <div style={{ maxWidth: 760 }}>
              <div style={{ marginBottom: "20px" }}>
                <h2
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    color: "rgba(255,255,255,0.85)",
                    letterSpacing: "0.05em",
                    margin: "0 0 4px",
                  }}
                >
                  BUSINESS DETAILS
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.35)",
                    margin: 0,
                  }}
                >
                  Tell us about your company so Freight Intel can personalise
                  margin and risk insights for your specific trade profile.
                </p>
              </div>

              <SectionDivider label="Company Information" />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <FieldGroup label="Business Name" hint="required">
                  <input
                    style={inputStyle}
                    value={biz.businessName}
                    onChange={e =>
                      setBiz(p => ({ ...p, businessName: e.target.value }))
                    }
                    placeholder="e.g. Acme Imports Ltd"
                  />
                </FieldGroup>
                <FieldGroup label="Website">
                  <div style={{ position: "relative" }}>
                    <Globe
                      size={13}
                      style={{
                        position: "absolute",
                        left: 11,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(255,255,255,0.25)",
                      }}
                    />
                    <input
                      style={{ ...inputStyle, paddingLeft: "32px" }}
                      value={biz.website}
                      onChange={e =>
                        setBiz(p => ({ ...p, website: e.target.value }))
                      }
                      placeholder="https://yoursite.com"
                    />
                  </div>
                </FieldGroup>
                <FieldGroup label="Industry" hint="required">
                  <select
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={biz.industry}
                    onChange={e =>
                      setBiz(p => ({ ...p, industry: e.target.value }))
                    }
                  >
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map(i => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </FieldGroup>
                <FieldGroup label="Company Size">
                  <select
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={biz.companySize}
                    onChange={e =>
                      setBiz(p => ({ ...p, companySize: e.target.value }))
                    }
                  >
                    <option value="">Select size…</option>
                    {COMPANY_SIZES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </FieldGroup>
              </div>

              <FieldGroup label="Annual Import Volume">
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginTop: "2px",
                  }}
                >
                  {IMPORT_VOLUMES.map(v => (
                    <button
                      key={v}
                      onClick={() =>
                        setBiz(p => ({ ...p, annualImportVolume: v }))
                      }
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "0.73rem",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: biz.annualImportVolume === v ? 600 : 400,
                        cursor: "pointer",
                        background:
                          biz.annualImportVolume === v
                            ? "rgba(249,115,22,0.18)"
                            : "rgba(255,255,255,0.04)",
                        border: `1px solid ${biz.annualImportVolume === v ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.1)"}`,
                        color:
                          biz.annualImportVolume === v
                            ? "#f97316"
                            : "rgba(255,255,255,0.45)",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      {biz.annualImportVolume === v && (
                        <CheckCircle2 size={11} />
                      )}
                      {v}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              <SectionDivider label="Sourcing & Products" />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <FieldGroup
                  label="Primary Sourcing Regions"
                  hint={`${biz.sourcingRegions.length} selected`}
                >
                  <div style={{ marginTop: "6px" }}>
                    <ChipSelector
                      options={SOURCING_REGIONS}
                      selected={biz.sourcingRegions}
                      onToggle={toggleRegion}
                      color="#f97316"
                    />
                  </div>
                </FieldGroup>

                <FieldGroup
                  label="Product Categories"
                  hint={`${biz.productCategories.length} selected`}
                >
                  <div style={{ marginTop: "6px" }}>
                    <ChipSelector
                      options={PRODUCT_CATEGORIES}
                      selected={biz.productCategories}
                      onToggle={toggleCategory}
                      color="#3b82f6"
                    />
                  </div>
                </FieldGroup>
              </div>

              <SectionDivider label="About Your Business" />

              <FieldGroup label="Business Description">
                <textarea
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    lineHeight: 1.7,
                    marginTop: "2px",
                  }}
                  value={biz.bio}
                  onChange={e => setBiz(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Brief description of your business, key products, main trade routes, and import strategy…"
                />
              </FieldGroup>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <SaveBtn
                  isPending={updateProfile.isPending}
                  onClick={() => updateProfile.mutate(biz)}
                />
              </div>
            </div>
          )}

          {/* ── TAB: Margin Targets ───────────────────────────────────── */}
          {activeTab === "targets" && (
            <div style={{ maxWidth: 760 }}>
              <div style={{ marginBottom: "20px" }}>
                <h2
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    color: "rgba(255,255,255,0.85)",
                    letterSpacing: "0.05em",
                    margin: "0 0 4px",
                  }}
                >
                  MARGIN TARGETS
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.35)",
                    margin: 0,
                  }}
                >
                  Set a{" "}
                  <strong style={{ color: "rgba(255,255,255,0.55)" }}>
                    target
                  </strong>{" "}
                  (your goal) and a{" "}
                  <strong style={{ color: "rgba(255,255,255,0.55)" }}>
                    floor
                  </strong>{" "}
                  (minimum acceptable margin) for each product category. SKUs
                  below the floor trigger critical alerts.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "14px",
                }}
              >
                {MARGIN_CATEGORIES.map(cat => {
                  const t = targets[cat.id] ?? { target: 30, floor: 20 };
                  const floorPct = (t.floor / 80) * 100;
                  const targetPct = (t.target / 80) * 100;
                  const rangePct = targetPct - floorPct;
                  return (
                    <div
                      key={cat.id}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        padding: "18px",
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                          }}
                        >
                          <span style={{ fontSize: "1.1rem" }}>{cat.icon}</span>
                          <span
                            style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              fontWeight: 700,
                              fontSize: "0.92rem",
                              color: "rgba(255,255,255,0.85)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {cat.label}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "0.68rem",
                              color: t.target >= 30 ? "#10b981" : "#f59e0b",
                              background: "rgba(255,255,255,0.05)",
                              padding: "3px 7px",
                              borderRadius: "4px",
                            }}
                          >
                            T {t.target}%
                          </span>
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "0.68rem",
                              color: "#ef4444",
                              background: "rgba(255,255,255,0.05)",
                              padding: "3px 7px",
                              borderRadius: "4px",
                            }}
                          >
                            F {t.floor}%
                          </span>
                        </div>
                      </div>

                      {/* Visual range bar */}
                      <div style={{ marginBottom: "16px" }}>
                        <div
                          style={{
                            height: "8px",
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: "4px",
                            position: "relative",
                            overflow: "visible",
                          }}
                        >
                          {/* Range fill */}
                          <div
                            style={{
                              position: "absolute",
                              left: `${floorPct}%`,
                              width: `${rangePct}%`,
                              height: "100%",
                              background:
                                "linear-gradient(90deg, rgba(239,68,68,0.3), rgba(16,185,129,0.3))",
                              borderRadius: "4px",
                            }}
                          />
                          {/* Floor marker */}
                          <div
                            style={{
                              position: "absolute",
                              left: `${floorPct}%`,
                              top: "-3px",
                              width: "3px",
                              height: "14px",
                              background: "#ef4444",
                              borderRadius: "2px",
                            }}
                          />
                          {/* Target marker */}
                          <div
                            style={{
                              position: "absolute",
                              left: `${targetPct}%`,
                              top: "-3px",
                              width: "3px",
                              height: "14px",
                              background: "#10b981",
                              borderRadius: "2px",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "5px",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.6rem",
                              color: "#ef444470",
                            }}
                          >
                            0%
                          </span>
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "0.6rem",
                              color: "rgba(255,255,255,0.2)",
                            }}
                          >
                            80%
                          </span>
                        </div>
                      </div>

                      {/* Sliders */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        {/* Target slider */}
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "5px",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "0.68rem",
                                color: "#10b981",
                                fontWeight: 500,
                              }}
                            >
                              Target
                            </span>
                            <span
                              style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontWeight: 700,
                                fontSize: "0.88rem",
                                color: "#10b981",
                              }}
                            >
                              {t.target}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={80}
                            step={1}
                            value={t.target}
                            onChange={e =>
                              setTargets(p => ({
                                ...p,
                                [cat.id]: {
                                  ...t,
                                  target: Number(e.target.value),
                                },
                              }))
                            }
                            style={{
                              width: "100%",
                              accentColor: "#10b981",
                              height: "4px",
                              cursor: "pointer",
                            }}
                          />
                        </div>
                        {/* Floor slider */}
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "5px",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "0.68rem",
                                color: "#ef4444",
                                fontWeight: 500,
                              }}
                            >
                              Floor
                            </span>
                            <span
                              style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontWeight: 700,
                                fontSize: "0.88rem",
                                color: "#ef4444",
                              }}
                            >
                              {t.floor}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={80}
                            step={1}
                            value={t.floor}
                            onChange={e =>
                              setTargets(p => ({
                                ...p,
                                [cat.id]: {
                                  ...t,
                                  floor: Number(e.target.value),
                                },
                              }))
                            }
                            style={{
                              width: "100%",
                              accentColor: "#ef4444",
                              height: "4px",
                              cursor: "pointer",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <SaveBtn
                  isPending={upsertTargets.isPending}
                  onClick={() => upsertTargets.mutate(targets)}
                />
              </div>
            </div>
          )}

          {/* ── TAB: Carrier Preferences ──────────────────────────────── */}
          {activeTab === "carriers" && (
            <div style={{ maxWidth: 760 }}>
              <div style={{ marginBottom: "20px" }}>
                <h2
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    color: "rgba(255,255,255,0.85)",
                    letterSpacing: "0.05em",
                    margin: "0 0 4px",
                  }}
                >
                  CARRIER & LANE PREFERENCES
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.35)",
                    margin: 0,
                  }}
                >
                  Your preferences are used by the Carrier Recommendation Engine
                  to personalise route suggestions and flag reliability risks.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {/* Preferred carriers */}
                <div
                  style={{
                    background: "rgba(16,185,129,0.04)",
                    border: "1px solid rgba(16,185,129,0.15)",
                    borderRadius: "12px",
                    padding: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "7px",
                        background: "rgba(16,185,129,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          color: "rgba(255,255,255,0.85)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        PREFERRED CARRIERS
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.65rem",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {carrierPrefs.preferredCarriers.length > 0
                          ? `${carrierPrefs.preferredCarriers.length} selected`
                          : "None selected — carriers you trust and prefer to book with"}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <ChipSelector
                      options={CARRIERS}
                      selected={carrierPrefs.preferredCarriers}
                      onToggle={v => togglePref("preferredCarriers", v)}
                      color="#10b981"
                    />
                  </div>
                </div>

                {/* Carriers to avoid */}
                <div
                  style={{
                    background: "rgba(239,68,68,0.04)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    borderRadius: "12px",
                    padding: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "7px",
                        background: "rgba(239,68,68,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AlertCircle size={14} style={{ color: "#ef4444" }} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          color: "rgba(255,255,255,0.85)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        CARRIERS TO AVOID
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.65rem",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {carrierPrefs.avoidCarriers.length > 0
                          ? `${carrierPrefs.avoidCarriers.length} flagged`
                          : "None flagged — carriers with reliability or cost issues for your lanes"}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <ChipSelector
                      options={CARRIERS}
                      selected={carrierPrefs.avoidCarriers}
                      onToggle={v => togglePref("avoidCarriers", v)}
                      color="#ef4444"
                    />
                  </div>
                </div>

                {/* Preferred lanes */}
                <div
                  style={{
                    background: "rgba(59,130,246,0.04)",
                    border: "1px solid rgba(59,130,246,0.15)",
                    borderRadius: "12px",
                    padding: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "7px",
                        background: "rgba(59,130,246,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Truck size={14} style={{ color: "#3b82f6" }} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          color: "rgba(255,255,255,0.85)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        PREFERRED TRADE LANES
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.65rem",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {carrierPrefs.preferredLanes.length > 0
                          ? `${carrierPrefs.preferredLanes.length} selected`
                          : "None selected — primary routes you regularly ship on"}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <ChipSelector
                      options={TRADE_LANES}
                      selected={carrierPrefs.preferredLanes}
                      onToggle={v => togglePref("preferredLanes", v)}
                      color="#3b82f6"
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <SaveBtn
                  isPending={upsertCarriers.isPending}
                  onClick={() => upsertCarriers.mutate(carrierPrefs)}
                />
              </div>
            </div>
          )}

          {/* ── TAB: Notifications ────────────────────────────────────── */}
          {activeTab === "notifications" && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ marginBottom: "20px" }}>
                <h2
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    color: "rgba(255,255,255,0.85)",
                    letterSpacing: "0.05em",
                    margin: "0 0 4px",
                  }}
                >
                  NOTIFICATION PREFERENCES
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.35)",
                    margin: 0,
                  }}
                >
                  Control when and how Freight Intel alerts you to margin
                  changes and supply chain events.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                <NotifCard
                  icon={Mail}
                  label="Email Alerts"
                  accent="#f97316"
                  description="Receive disruption and margin alerts directly to your inbox"
                  checked={notifPrefs.emailAlerts}
                  onChange={v => setNotifPrefs(p => ({ ...p, emailAlerts: v }))}
                />
                <NotifCard
                  icon={AlertCircle}
                  label="Critical Alerts Only"
                  accent="#ef4444"
                  description="Suppress warning-level emails — only send alerts for critical severity events"
                  checked={notifPrefs.criticalOnly}
                  onChange={v =>
                    setNotifPrefs(p => ({ ...p, criticalOnly: v }))
                  }
                />
                <NotifCard
                  icon={Calendar}
                  label="Weekly Digest"
                  accent="#3b82f6"
                  description="Receive a weekly summary of margin performance and supply chain events every Monday"
                  checked={notifPrefs.weeklyDigest}
                  onChange={v =>
                    setNotifPrefs(p => ({ ...p, weeklyDigest: v }))
                  }
                />
                <NotifCard
                  icon={TrendingDown}
                  label="Margin Drop Alert"
                  accent="#f59e0b"
                  description="Alert when any category margin drops by the threshold you set below"
                  checked={notifPrefs.marginDropAlert}
                  onChange={v =>
                    setNotifPrefs(p => ({ ...p, marginDropAlert: v }))
                  }
                />
              </div>

              {/* Threshold slider — only shown when marginDropAlert is on */}
              <div
                style={{
                  background: notifPrefs.marginDropAlert
                    ? "rgba(245,158,11,0.06)"
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${notifPrefs.marginDropAlert ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "12px",
                  padding: "18px",
                  opacity: notifPrefs.marginDropAlert ? 1 : 0.4,
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      Margin Drop Threshold
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.68rem",
                        color: "rgba(255,255,255,0.35)",
                        marginTop: "2px",
                      }}
                    >
                      Alert when any category margin falls by this many
                      percentage points
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 800,
                      fontSize: "1.8rem",
                      color: "#f59e0b",
                      lineHeight: 1,
                      minWidth: "56px",
                      textAlign: "right",
                    }}
                  >
                    {notifPrefs.marginDropThreshold}%
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={notifPrefs.marginDropThreshold}
                  disabled={!notifPrefs.marginDropAlert}
                  onChange={e =>
                    setNotifPrefs(p => ({
                      ...p,
                      marginDropThreshold: Number(e.target.value),
                    }))
                  }
                  style={{
                    width: "100%",
                    accentColor: "#f59e0b",
                    cursor: notifPrefs.marginDropAlert
                      ? "pointer"
                      : "not-allowed",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.62rem",
                      color: "rgba(255,255,255,0.2)",
                    }}
                  >
                    1% — very sensitive
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.62rem",
                      color: "rgba(255,255,255,0.2)",
                    }}
                  >
                    20% — major drops only
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <SaveBtn
                  isPending={upsertNotifs.isPending}
                  onClick={() => upsertNotifs.mutate(notifPrefs)}
                />
              </div>
            </div>
          )}

          {/* ── TAB: History ──────────────────────────────────────────── */}
          {activeTab === "history" && (
            <div style={{ maxWidth: 860 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      color: "rgba(255,255,255,0.85)",
                      letterSpacing: "0.05em",
                      margin: "0 0 4px",
                    }}
                  >
                    HISTORICAL MARGIN SNAPSHOTS
                  </h2>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.72rem",
                      color: "rgba(255,255,255,0.35)",
                      margin: 0,
                    }}
                  >
                    Monthly margin performance over time — track trends,
                    identify seasonal patterns, and correlate with market
                    events.
                  </p>
                </div>
                <button
                  onClick={() => setShowSnapshotForm(v => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: showSnapshotForm
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(59,130,246,0.15)",
                    border: `1px solid ${showSnapshotForm ? "rgba(255,255,255,0.1)" : "rgba(59,130,246,0.35)"}`,
                    color: showSnapshotForm
                      ? "rgba(255,255,255,0.4)"
                      : "#3b82f6",
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {showSnapshotForm ? <X size={12} /> : <Plus size={12} />}
                  {showSnapshotForm ? "CANCEL" : "ADD SNAPSHOT"}
                </button>
              </div>

              {/* Add snapshot form — inline drawer */}
              {showSnapshotForm && (
                <div
                  style={{
                    background: "rgba(59,130,246,0.05)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: "#3b82f6",
                      letterSpacing: "0.07em",
                      marginBottom: "16px",
                    }}
                  >
                    NEW MONTHLY SNAPSHOT
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <FieldGroup label="Month">
                      <input
                        type="month"
                        style={inputStyle}
                        value={snapshot.month}
                        onChange={e =>
                          setSnapshot(p => ({ ...p, month: e.target.value }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup label="Avg Margin %">
                      <input
                        type="number"
                        style={inputStyle}
                        placeholder="28"
                        value={snapshot.avgMargin}
                        onChange={e =>
                          setSnapshot(p => ({
                            ...p,
                            avgMargin: Number(e.target.value),
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup label="Best Margin %">
                      <input
                        type="number"
                        style={inputStyle}
                        placeholder="42"
                        value={snapshot.bestMargin}
                        onChange={e =>
                          setSnapshot(p => ({
                            ...p,
                            bestMargin: Number(e.target.value),
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup label="Worst Margin %">
                      <input
                        type="number"
                        style={inputStyle}
                        placeholder="18"
                        value={snapshot.worstMargin}
                        onChange={e =>
                          setSnapshot(p => ({
                            ...p,
                            worstMargin: Number(e.target.value),
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup label="Avg Brent $/bbl">
                      <input
                        type="number"
                        style={inputStyle}
                        placeholder="85"
                        value={snapshot.avgBrentPrice}
                        onChange={e =>
                          setSnapshot(p => ({
                            ...p,
                            avgBrentPrice: Number(e.target.value),
                          }))
                        }
                      />
                    </FieldGroup>
                    <FieldGroup label="Critical SKUs">
                      <input
                        type="number"
                        style={inputStyle}
                        placeholder="2"
                        value={snapshot.criticalSkuCount}
                        onChange={e =>
                          setSnapshot(p => ({
                            ...p,
                            criticalSkuCount: Number(e.target.value),
                          }))
                        }
                      />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Note (optional)">
                    <input
                      style={inputStyle}
                      placeholder="e.g. Red Sea disruption impacted Q1 margins"
                      value={snapshot.note}
                      onChange={e =>
                        setSnapshot(p => ({ ...p, note: e.target.value }))
                      }
                    />
                  </FieldGroup>
                  <div
                    style={{
                      marginTop: "16px",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <SaveBtn
                      isPending={addSnapshot.isPending}
                      onClick={() => addSnapshot.mutate(snapshot)}
                      label="SAVE SNAPSHOT"
                    />
                  </div>
                </div>
              )}

              {/* Empty state */}
              {chartData.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px dashed rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                  }}
                >
                  <BarChart3
                    size={36}
                    style={{
                      color: "rgba(255,255,255,0.1)",
                      margin: "0 auto 12px",
                    }}
                  />
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.3)",
                      margin: "0 0 16px",
                    }}
                  >
                    No snapshots yet. Add your first monthly margin snapshot to
                    start tracking performance over time.
                  </p>
                  <button
                    onClick={() => setShowSnapshotForm(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      background: "rgba(59,130,246,0.15)",
                      border: "1px solid rgba(59,130,246,0.35)",
                      color: "#3b82f6",
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={12} /> ADD FIRST SNAPSHOT
                  </button>
                </div>
              ) : (
                <>
                  {/* Summary strip */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "10px",
                      marginBottom: "20px",
                    }}
                  >
                    {[
                      {
                        label: "Latest Avg Margin",
                        value:
                          latestMargin != null
                            ? `${latestMargin.toFixed(1)}%`
                            : "—",
                        color: "#3b82f6",
                        icon: TrendingUp,
                      },
                      {
                        label: "Month-on-Month",
                        value:
                          marginDelta != null
                            ? `${marginDelta >= 0 ? "+" : ""}${marginDelta.toFixed(1)}%`
                            : "—",
                        color:
                          marginDelta != null && marginDelta >= 0
                            ? "#10b981"
                            : "#ef4444",
                        icon:
                          marginDelta != null && marginDelta >= 0
                            ? TrendingUp
                            : TrendingDown,
                      },
                      {
                        label: "Months Tracked",
                        value: String(chartData.length),
                        color: "rgba(255,255,255,0.7)",
                        icon: Calendar,
                      },
                      {
                        label: "Best Month",
                        value:
                          chartData.length > 0
                            ? `${Math.max(...chartData.map(d => d.margin)).toFixed(1)}%`
                            : "—",
                        color: "#10b981",
                        icon: TrendingUp,
                      },
                    ].map(s => (
                      <div
                        key={s.label}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: "10px",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <s.icon
                          size={14}
                          style={{ color: s.color, opacity: 0.7 }}
                        />
                        <div
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 700,
                            fontSize: "1.3rem",
                            color: s.color,
                            lineHeight: 1,
                          }}
                        >
                          {s.value}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "0.62rem",
                            color: "rgba(255,255,255,0.3)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Area chart */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "10px",
                      padding: "16px",
                      marginBottom: "16px",
                    }}
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="marginGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{
                            fill: "rgba(255,255,255,0.4)",
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={v => `${v}%`}
                          domain={[0, 60]}
                        />
                        <Tooltip
                          formatter={(v: any, name: string) => [
                            `${(v as number).toFixed(1)}%`,
                            name === "margin"
                              ? "Avg Margin"
                              : name === "best"
                                ? "Best"
                                : "Worst",
                          ]}
                          contentStyle={{
                            background: "rgba(10,14,26,0.95)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "6px",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "0.75rem",
                          }}
                        />
                        <ReferenceLine
                          y={30}
                          stroke="#f97316"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{
                            value: "Target 30%",
                            fill: "#f97316",
                            fontSize: 9,
                            fontFamily: "'Rajdhani', sans-serif",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="best"
                          stroke="#10b981"
                          strokeWidth={1}
                          fill="transparent"
                          strokeDasharray="3 3"
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="margin"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fill="url(#marginGrad)"
                          dot={{ r: 3, fill: "#3b82f6" }}
                          activeDot={{ r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="worst"
                          stroke="#ef4444"
                          strokeWidth={1}
                          fill="transparent"
                          strokeDasharray="3 3"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Snapshot table */}
                  <div
                    style={{
                      overflowX: "auto",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "10px",
                    }}
                  >
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {[
                            "Month",
                            "Avg Margin",
                            "Best",
                            "Worst",
                            "Brent $/bbl",
                            "Critical SKUs",
                            "Note",
                          ].map(h => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 14px",
                                textAlign: "left",
                                fontFamily: "'Rajdhani', sans-serif",
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                letterSpacing: "0.08em",
                                color: "rgba(255,255,255,0.35)",
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...(historyRows ?? [])]
                          .sort((a, b) => b.month.localeCompare(a.month))
                          .map((r, i) => (
                            <tr
                              key={r.id}
                              style={{
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                                background:
                                  i % 2 === 0
                                    ? "transparent"
                                    : "rgba(255,255,255,0.01)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "0.75rem",
                                  color: "rgba(255,255,255,0.6)",
                                }}
                              >
                                {r.month}
                              </td>
                              <td style={{ padding: "10px 14px" }}>
                                <span
                                  style={{
                                    fontFamily: "'Rajdhani', sans-serif",
                                    fontWeight: 700,
                                    fontSize: "0.92rem",
                                    color:
                                      r.avgMargin >= 30
                                        ? "#10b981"
                                        : r.avgMargin >= 20
                                          ? "#f59e0b"
                                          : "#ef4444",
                                  }}
                                >
                                  {r.avgMargin.toFixed(1)}%
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "0.75rem",
                                  color: "#10b981",
                                }}
                              >
                                {r.bestMargin != null
                                  ? `${r.bestMargin.toFixed(1)}%`
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "0.75rem",
                                  color: "#ef4444",
                                }}
                              >
                                {r.worstMargin != null
                                  ? `${r.worstMargin.toFixed(1)}%`
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "0.75rem",
                                  color: "rgba(255,255,255,0.5)",
                                }}
                              >
                                {r.avgBrentPrice != null
                                  ? `$${r.avgBrentPrice.toFixed(1)}`
                                  : "—"}
                              </td>
                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "0.75rem",
                                  color:
                                    (r.criticalSkuCount ?? 0) > 0
                                      ? "#ef4444"
                                      : "rgba(255,255,255,0.4)",
                                }}
                              >
                                {r.criticalSkuCount ?? 0}
                              </td>
                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontFamily: "'Inter', sans-serif",
                                  fontSize: "0.72rem",
                                  color: "rgba(255,255,255,0.35)",
                                  maxWidth: "200px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {r.note ?? "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
