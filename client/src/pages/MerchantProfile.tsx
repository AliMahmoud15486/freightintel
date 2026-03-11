/**
 * MerchantProfile.tsx — Freight Intel
 *
 * Five-section profile hub for the logged-in merchant/business:
 *   1. Business Details      — name, industry, size, regions, categories, bio
 *   2. Margin Targets        — per-category target & floor sliders
 *   3. Carrier Preferences   — preferred / avoided carriers and lanes
 *   4. Notification Prefs    — email alerts, digest, margin-drop threshold
 *   5. Historical Snapshots  — monthly margin sparkline + add-snapshot form
 *
 * All data persisted to DB via tRPC merchantProfile procedures.
 */
import { useState, useEffect } from "react";
import {
  User, Building2, Target, Ship, Bell, BarChart3,
  Save, Plus, X, ChevronDown, ChevronUp, Edit3,
  CheckCircle2, AlertCircle, Globe, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
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
  "Electronics", "Apparel & Footwear", "Home & Furniture", "Toys & Games",
  "Health & Beauty", "Automotive Parts", "Food & Beverage", "Industrial Equipment",
  "Sporting Goods", "Jewellery & Accessories", "Other",
];

const COMPANY_SIZES = [
  "Solo / Freelancer", "2–10 employees", "11–50 employees",
  "51–200 employees", "201–1,000 employees", "1,000+ employees",
];

const IMPORT_VOLUMES = [
  "< $100K / year", "$100K–$500K", "$500K–$2M",
  "$2M–$10M", "$10M–$50M", "$50M+",
];

const SOURCING_REGIONS = [
  "China", "Vietnam", "Bangladesh", "India", "Turkey",
  "Mexico", "Indonesia", "Thailand", "South Korea", "Germany",
  "USA", "UK", "Japan", "Taiwan", "Malaysia",
];

const PRODUCT_CATEGORIES = [
  "Electronics", "Apparel", "Home & Garden", "Toys", "Auto Parts",
  "Industrial", "Health & Beauty", "Food & Beverage", "Sporting Goods", "Jewellery",
];

const CARRIERS = [
  "Maersk", "MSC", "CMA CGM", "COSCO", "Hapag-Lloyd",
  "Evergreen", "ONE", "Yang Ming", "HMM", "ZIM",
];

const TRADE_LANES = [
  "Shanghai → Rotterdam", "Shenzhen → Los Angeles", "Guangzhou → New York",
  "Mumbai → Felixstowe", "Ho Chi Minh → Hamburg", "Busan → Long Beach",
  "Jakarta → Rotterdam", "Bangkok → Antwerp", "Colombo → Southampton",
  "Karachi → Jebel Ali",
];

const MARGIN_CATEGORIES = [
  { id: "electronics",   label: "Electronics"    },
  { id: "apparel",       label: "Apparel"         },
  { id: "home-garden",   label: "Home & Garden"   },
  { id: "toys",          label: "Toys"            },
  { id: "auto-parts",    label: "Auto Parts"      },
  { id: "industrial",    label: "Industrial"      },
];

// ─── shared style helpers ─────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  overflow: "hidden",
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: "14px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "6px",
  padding: "8px 12px",
  color: "rgba(255,255,255,0.85)",
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.82rem",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.7rem",
  fontWeight: 500,
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "5px",
  display: "block",
};

const saveButtonStyle = (saving: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 18px",
  background: saving ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.2)",
  border: "1px solid rgba(249,115,22,0.4)",
  borderRadius: "6px",
  color: saving ? "rgba(249,115,22,0.5)" : "#f97316",
  fontFamily: "'Rajdhani', sans-serif",
  fontWeight: 700,
  fontSize: "0.8rem",
  letterSpacing: "0.06em",
  cursor: saving ? "not-allowed" : "pointer",
  transition: "all 0.15s",
});

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, subtitle, expanded, onToggle, action,
}: {
  icon: any; title: string; subtitle: string;
  expanded: boolean; onToggle: () => void; action?: React.ReactNode;
}) {
  return (
    <div style={sectionHeaderStyle} onClick={onToggle}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: 34, height: 34, borderRadius: "8px",
          background: "rgba(249,115,22,0.12)",
          border: "1px solid rgba(249,115,22,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={15} style={{ color: "#f97316" }} />
        </div>
        <div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", letterSpacing: "0.04em" }}>
            {title}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>
            {subtitle}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={e => e.stopPropagation()}>
        {action}
        <div onClick={onToggle} style={{ cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: "4px" }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
    </div>
  );
}

function TagSelector({
  options, selected, onToggle, color = "#f97316",
}: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; color?: string;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "0.72rem",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              cursor: "pointer",
              background: active ? `${color}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
              color: active ? color : "rgba(255,255,255,0.5)",
              transition: "all 0.15s",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MarginSlider({
  label, value, onChange, color,
}: {
  label: string; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", width: "50px", flexShrink: 0 }}>
        {label}
      </span>
      <input
        type="range" min={0} max={80} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: color, height: "4px", cursor: "pointer" }}
      />
      <span style={{
        fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.9rem",
        color, width: "38px", textAlign: "right", flexShrink: 0,
      }}>
        {value}%
      </span>
    </div>
  );
}

function Toggle({
  checked, onChange, label, description,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: "11px", flexShrink: 0,
          background: checked ? "#f97316" : "rgba(255,255,255,0.1)",
          border: "none", cursor: "pointer", position: "relative",
          transition: "background 0.2s",
        }}
      >
        <span style={{
          position: "absolute", top: "3px",
          left: checked ? "21px" : "3px",
          width: 16, height: 16, borderRadius: "50%",
          background: "white",
          transition: "left 0.2s",
          display: "block",
        }} />
      </button>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function MerchantProfile() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // ── tRPC queries / mutations ────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading, refetch } = trpc.merchantProfile.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const { data: historyRows, refetch: refetchHistory } = trpc.merchantProfile.getMarginHistory.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const updateProfile  = trpc.merchantProfile.updateProfile.useMutation({ onSuccess: () => { refetch(); toast.success("Business details saved"); } });
  const upsertTargets  = trpc.merchantProfile.upsertMarginTargets.useMutation({ onSuccess: () => toast.success("Margin targets saved") });
  const upsertCarriers = trpc.merchantProfile.upsertCarrierPrefs.useMutation({ onSuccess: () => toast.success("Carrier preferences saved") });
  const upsertNotifs   = trpc.merchantProfile.upsertNotificationPrefs.useMutation({ onSuccess: () => toast.success("Notification preferences saved") });
  const addSnapshot    = trpc.merchantProfile.addMarginSnapshot.useMutation({ onSuccess: () => { refetchHistory(); toast.success("Snapshot recorded"); setShowSnapshotForm(false); } });

  // ── section expand state ────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState({ business: true, targets: true, carriers: true, notifications: true, history: true });
  const toggle = (k: keyof typeof expanded) => setExpanded(p => ({ ...p, [k]: !p[k] }));

  // ── local form state — Business Details ────────────────────────────────────
  const [biz, setBiz] = useState({
    businessName: "", industry: "", companySize: "", annualImportVolume: "",
    sourcingRegions: [] as string[], productCategories: [] as string[],
    website: "", bio: "",
  });

  // ── local form state — Margin Targets ──────────────────────────────────────
  const [targets, setTargets] = useState<Record<string, { target: number; floor: number }>>({});

  // ── local form state — Carrier Prefs ───────────────────────────────────────
  const [carrierPrefs, setCarrierPrefs] = useState({
    preferredCarriers: [] as string[],
    avoidCarriers:     [] as string[],
    preferredLanes:    [] as string[],
  });

  // ── local form state — Notification Prefs ──────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState({
    emailAlerts: true, criticalOnly: false, weeklyDigest: true,
    marginDropAlert: true, marginDropThreshold: 5,
  });

  // ── local form state — Snapshot ────────────────────────────────────────────
  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [snapshot, setSnapshot] = useState({
    month: new Date().toISOString().slice(0, 7),
    avgMargin: 28, bestMargin: 42, worstMargin: 18,
    avgBrentPrice: 85, criticalSkuCount: 2, note: "",
  });

  // Sync profile data into local state once loaded
  useEffect(() => {
    if (!profile) return;
    setBiz({
      businessName:       profile.businessName,
      industry:           profile.industry,
      companySize:        profile.companySize,
      annualImportVolume: profile.annualImportVolume,
      sourcingRegions:    profile.sourcingRegions,
      productCategories:  profile.productCategories,
      website:            profile.website,
      bio:                profile.bio,
    });
    setTargets(profile.marginTargets as Record<string, { target: number; floor: number }>);
    setCarrierPrefs(profile.carrierPrefs as typeof carrierPrefs);
    setNotifPrefs(profile.notificationPrefs as typeof notifPrefs);
  }, [profile]);

  // ── auth guard ──────────────────────────────────────────────────────────────
  if (authLoading || profileLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", background: "#0a0e1a" }}>
        <NavigationSidebar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <TopHeader />
          <GlobalPulseBar />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div className="animate-spin" style={{ width: 32, height: 32, border: "2px solid rgba(249,115,22,0.3)", borderTop: "2px solid #f97316", borderRadius: "50%", margin: "0 auto 12px" }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>Loading profile…</p>
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
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 340 }}>
              <div style={{ width: 56, height: 56, borderRadius: "14px", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <User size={24} style={{ color: "#f97316" }} />
              </div>
              <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.3rem", color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", margin: "0 0 8px" }}>
                SIGN IN REQUIRED
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", margin: "0 0 20px", lineHeight: 1.6 }}>
                Your Merchant Profile is tied to your account. Sign in to view and edit your business settings.
              </p>
              <a
                href={getLoginUrl()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "10px 24px", borderRadius: "8px",
                  background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.4)",
                  color: "#f97316", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
                  fontSize: "0.85rem", letterSpacing: "0.06em", textDecoration: "none",
                }}
              >
                SIGN IN
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── chart data ──────────────────────────────────────────────────────────────
  const chartData = [...(historyRows ?? [])]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(r => ({
      month:  r.month,
      margin: r.avgMargin,
      best:   r.bestMargin ?? r.avgMargin + 5,
      worst:  r.worstMargin ?? r.avgMargin - 5,
    }));

  const latestMargin = chartData.length > 0 ? chartData[chartData.length - 1].margin : null;
  const prevMargin   = chartData.length > 1 ? chartData[chartData.length - 2].margin : null;
  const marginDelta  = latestMargin != null && prevMargin != null ? latestMargin - prevMargin : null;

  // ── toggle helpers ──────────────────────────────────────────────────────────
  const toggleRegion   = (r: string) => setBiz(p => ({ ...p, sourcingRegions:   p.sourcingRegions.includes(r)   ? p.sourcingRegions.filter(x => x !== r)   : [...p.sourcingRegions, r]   }));
  const toggleCategory = (c: string) => setBiz(p => ({ ...p, productCategories: p.productCategories.includes(c) ? p.productCategories.filter(x => x !== c) : [...p.productCategories, c] }));
  const togglePref     = (field: "preferredCarriers" | "avoidCarriers" | "preferredLanes", v: string) =>
    setCarrierPrefs(p => ({ ...p, [field]: p[field].includes(v) ? p[field].filter(x => x !== v) : [...p[field], v] }));

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0a0e1a" }}>
      <NavigationSidebar activeSection="profile" />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopHeader />
        <GlobalPulseBar />

        {/* Page header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Avatar */}
            <div style={{ width: 42, height: 42, borderRadius: "10px", background: "linear-gradient(135deg, #f97316, #E91E8C)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(249,115,22,0.3)", flexShrink: 0 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "white" }}>
                {(biz.businessName || user?.name || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
                {biz.businessName || user?.name || "Merchant Profile"}
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
                {biz.industry || "No industry set"} · {user?.email ?? ""}
              </p>
            </div>
          </div>
          {/* Stats strip */}
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "Sourcing Regions",    value: biz.sourcingRegions.length    || "—" },
              { label: "Product Categories",  value: biz.productCategories.length  || "—" },
              { label: "Margin Snapshots",    value: historyRows?.length ?? "—"          },
              { label: "Latest Avg Margin",   value: latestMargin != null ? `${latestMargin.toFixed(1)}%` : "—" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#f97316" }}>{s.value}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div data-scroll-container="main" style={{ flex: 1, overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* ── 1. Business Details ─────────────────────────────────────────── */}
          <div style={panelStyle}>
            <SectionHeader
              icon={Building2} title="Business Details" subtitle="Company info, sourcing regions, and product categories"
              expanded={expanded.business} onToggle={() => toggle("business")}
              action={
                <button
                  onClick={() => updateProfile.mutate(biz)}
                  disabled={updateProfile.isPending}
                  style={saveButtonStyle(updateProfile.isPending)}
                >
                  <Save size={12} />
                  {updateProfile.isPending ? "SAVING…" : "SAVE"}
                </button>
              }
            />
            {expanded.business && (
              <div style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                  {/* Business Name */}
                  <div>
                    <label style={labelStyle}>Business Name</label>
                    <input style={inputStyle} value={biz.businessName} onChange={e => setBiz(p => ({ ...p, businessName: e.target.value }))} placeholder="e.g. Acme Imports Ltd" />
                  </div>
                  {/* Website */}
                  <div>
                    <label style={labelStyle}>Website</label>
                    <div style={{ position: "relative" }}>
                      <Globe size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                      <input style={{ ...inputStyle, paddingLeft: "30px" }} value={biz.website} onChange={e => setBiz(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" />
                    </div>
                  </div>
                  {/* Industry */}
                  <div>
                    <label style={labelStyle}>Industry</label>
                    <select style={{ ...inputStyle, cursor: "pointer" }} value={biz.industry} onChange={e => setBiz(p => ({ ...p, industry: e.target.value }))}>
                      <option value="">Select industry…</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  {/* Company Size */}
                  <div>
                    <label style={labelStyle}>Company Size</label>
                    <select style={{ ...inputStyle, cursor: "pointer" }} value={biz.companySize} onChange={e => setBiz(p => ({ ...p, companySize: e.target.value }))}>
                      <option value="">Select size…</option>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {/* Annual Import Volume */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Annual Import Volume</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {IMPORT_VOLUMES.map(v => (
                        <button key={v} onClick={() => setBiz(p => ({ ...p, annualImportVolume: v }))}
                          style={{
                            padding: "5px 12px", borderRadius: "20px", fontSize: "0.72rem",
                            fontFamily: "'Inter', sans-serif", fontWeight: 500, cursor: "pointer",
                            background: biz.annualImportVolume === v ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${biz.annualImportVolume === v ? "#f97316" : "rgba(255,255,255,0.1)"}`,
                            color: biz.annualImportVolume === v ? "#f97316" : "rgba(255,255,255,0.5)",
                            transition: "all 0.15s",
                          }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sourcing Regions */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Primary Sourcing Regions</label>
                  <TagSelector options={SOURCING_REGIONS} selected={biz.sourcingRegions} onToggle={toggleRegion} />
                </div>

                {/* Product Categories */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Product Categories</label>
                  <TagSelector options={PRODUCT_CATEGORIES} selected={biz.productCategories} onToggle={toggleCategory} color="#3b82f6" />
                </div>

                {/* Bio */}
                <div>
                  <label style={labelStyle}>Business Description</label>
                  <textarea
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                    value={biz.bio}
                    onChange={e => setBiz(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Brief description of your business, key products, and import strategy…"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Margin Targets ───────────────────────────────────────────── */}
          <div style={panelStyle}>
            <SectionHeader
              icon={Target} title="Margin Targets" subtitle="Set target and floor margins per product category"
              expanded={expanded.targets} onToggle={() => toggle("targets")}
              action={
                <button
                  onClick={() => upsertTargets.mutate(targets)}
                  disabled={upsertTargets.isPending}
                  style={saveButtonStyle(upsertTargets.isPending)}
                >
                  <Save size={12} />
                  {upsertTargets.isPending ? "SAVING…" : "SAVE"}
                </button>
              }
            />
            {expanded.targets && (
              <div style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {MARGIN_CATEGORIES.map(cat => {
                    const t = targets[cat.id] ?? { target: 30, floor: 20 };
                    return (
                      <div key={cat.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em" }}>
                            {cat.label}
                          </span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: t.target >= 30 ? "#10b981" : "#f59e0b", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "3px" }}>
                              T: {t.target}%
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#ef4444", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "3px" }}>
                              F: {t.floor}%
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <MarginSlider
                            label="Target"
                            value={t.target}
                            onChange={v => setTargets(p => ({ ...p, [cat.id]: { ...t, target: v } }))}
                            color="#10b981"
                          />
                          <MarginSlider
                            label="Floor"
                            value={t.floor}
                            onChange={v => setTargets(p => ({ ...p, [cat.id]: { ...t, floor: v } }))}
                            color="#ef4444"
                          />
                        </div>
                        {/* Visual bar */}
                        <div style={{ marginTop: "10px", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", left: `${t.floor}%`, width: `${t.target - t.floor}%`, height: "100%", background: "linear-gradient(90deg, #ef444440, #10b98140)", borderRadius: "3px" }} />
                          <div style={{ position: "absolute", left: `${t.target}%`, top: 0, width: "2px", height: "100%", background: "#10b981" }} />
                          <div style={{ position: "absolute", left: `${t.floor}%`, top: 0, width: "2px", height: "100%", background: "#ef4444" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", marginTop: "14px" }}>
                  <strong style={{ color: "rgba(255,255,255,0.4)" }}>Target</strong> — the margin % you aim for. SKUs above this are marked Safe.&nbsp;
                  <strong style={{ color: "rgba(255,255,255,0.4)" }}>Floor</strong> — the minimum acceptable margin. SKUs below this trigger Critical alerts.
                </p>
              </div>
            )}
          </div>

          {/* ── 3. Carrier Preferences ──────────────────────────────────────── */}
          <div style={panelStyle}>
            <SectionHeader
              icon={Ship} title="Carrier & Lane Preferences" subtitle="Preferred carriers, lanes to prioritise, and carriers to avoid"
              expanded={expanded.carriers} onToggle={() => toggle("carriers")}
              action={
                <button
                  onClick={() => upsertCarriers.mutate(carrierPrefs)}
                  disabled={upsertCarriers.isPending}
                  style={saveButtonStyle(upsertCarriers.isPending)}
                >
                  <Save size={12} />
                  {upsertCarriers.isPending ? "SAVING…" : "SAVE"}
                </button>
              }
            />
            {expanded.carriers && (
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={labelStyle}>Preferred Carriers</label>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 8px" }}>Carriers you trust and prefer to book with</p>
                  <TagSelector options={CARRIERS} selected={carrierPrefs.preferredCarriers} onToggle={v => togglePref("preferredCarriers", v)} color="#10b981" />
                </div>
                <div>
                  <label style={labelStyle}>Carriers to Avoid</label>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 8px" }}>Carriers with reliability or cost issues for your lanes</p>
                  <TagSelector options={CARRIERS} selected={carrierPrefs.avoidCarriers} onToggle={v => togglePref("avoidCarriers", v)} color="#ef4444" />
                </div>
                <div>
                  <label style={labelStyle}>Preferred Trade Lanes</label>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", margin: "0 0 8px" }}>Primary routes you regularly ship on</p>
                  <TagSelector options={TRADE_LANES} selected={carrierPrefs.preferredLanes} onToggle={v => togglePref("preferredLanes", v)} color="#3b82f6" />
                </div>
              </div>
            )}
          </div>

          {/* ── 4. Notification Preferences ─────────────────────────────────── */}
          <div style={panelStyle}>
            <SectionHeader
              icon={Bell} title="Notification Preferences" subtitle="Control when and how Freight Intel alerts you"
              expanded={expanded.notifications} onToggle={() => toggle("notifications")}
              action={
                <button
                  onClick={() => upsertNotifs.mutate(notifPrefs)}
                  disabled={upsertNotifs.isPending}
                  style={saveButtonStyle(upsertNotifs.isPending)}
                >
                  <Save size={12} />
                  {upsertNotifs.isPending ? "SAVING…" : "SAVE"}
                </button>
              }
            />
            {expanded.notifications && (
              <div style={{ padding: "20px" }}>
                <div style={{ maxWidth: 520 }}>
                  <Toggle
                    checked={notifPrefs.emailAlerts}
                    onChange={v => setNotifPrefs(p => ({ ...p, emailAlerts: v }))}
                    label="Email Alerts"
                    description="Receive disruption and margin alerts by email"
                  />
                  <Toggle
                    checked={notifPrefs.criticalOnly}
                    onChange={v => setNotifPrefs(p => ({ ...p, criticalOnly: v }))}
                    label="Critical Alerts Only"
                    description="Only send emails for critical severity events (suppresses warnings)"
                  />
                  <Toggle
                    checked={notifPrefs.weeklyDigest}
                    onChange={v => setNotifPrefs(p => ({ ...p, weeklyDigest: v }))}
                    label="Weekly Digest"
                    description="Receive a weekly summary of margin performance and supply chain events"
                  />
                  <Toggle
                    checked={notifPrefs.marginDropAlert}
                    onChange={v => setNotifPrefs(p => ({ ...p, marginDropAlert: v }))}
                    label="Margin Drop Alert"
                    description="Alert when any category margin drops by the threshold below"
                  />
                  {/* Threshold slider */}
                  <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: notifPrefs.marginDropAlert ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                          Margin Drop Threshold
                        </div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                          Alert when margin falls by this many percentage points
                        </div>
                      </div>
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#f97316", minWidth: "40px", textAlign: "right" }}>
                        {notifPrefs.marginDropThreshold}%
                      </span>
                    </div>
                    <input
                      type="range" min={1} max={20} step={1}
                      value={notifPrefs.marginDropThreshold}
                      disabled={!notifPrefs.marginDropAlert}
                      onChange={e => setNotifPrefs(p => ({ ...p, marginDropThreshold: Number(e.target.value) }))}
                      style={{ width: "100%", accentColor: "#f97316", cursor: notifPrefs.marginDropAlert ? "pointer" : "not-allowed", opacity: notifPrefs.marginDropAlert ? 1 : 0.3 }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>1% (sensitive)</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>20% (major drops only)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 5. Historical Margin Snapshots ──────────────────────────────── */}
          <div style={panelStyle}>
            <SectionHeader
              icon={BarChart3} title="Historical Margin Snapshots" subtitle="Monthly margin performance over time"
              expanded={expanded.history} onToggle={() => toggle("history")}
              action={
                <button
                  onClick={() => setShowSnapshotForm(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "6px 12px", borderRadius: "6px",
                    background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",
                    color: "#3b82f6", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
                    fontSize: "0.75rem", letterSpacing: "0.06em", cursor: "pointer",
                  }}
                >
                  {showSnapshotForm ? <X size={11} /> : <Plus size={11} />}
                  {showSnapshotForm ? "CANCEL" : "ADD SNAPSHOT"}
                </button>
              }
            />
            {expanded.history && (
              <div style={{ padding: "20px" }}>

                {/* Add snapshot form */}
                {showSnapshotForm && (
                  <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#3b82f6", letterSpacing: "0.06em", marginBottom: "12px" }}>
                      NEW MONTHLY SNAPSHOT
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
                      {[
                        { key: "month",            label: "Month (YYYY-MM)", type: "text",   placeholder: "2026-03" },
                        { key: "avgMargin",         label: "Avg Margin %",    type: "number", placeholder: "28" },
                        { key: "bestMargin",        label: "Best Margin %",   type: "number", placeholder: "42" },
                        { key: "worstMargin",       label: "Worst Margin %",  type: "number", placeholder: "18" },
                        { key: "avgBrentPrice",     label: "Avg Brent $/bbl", type: "number", placeholder: "85" },
                        { key: "criticalSkuCount",  label: "Critical SKUs",   type: "number", placeholder: "2" },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={labelStyle}>{f.label}</label>
                          <input
                            type={f.type}
                            style={inputStyle}
                            placeholder={f.placeholder}
                            value={(snapshot as any)[f.key]}
                            onChange={e => setSnapshot(p => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={labelStyle}>Note (optional)</label>
                      <input style={inputStyle} placeholder="e.g. Red Sea disruption impacted Q1 margins" value={snapshot.note} onChange={e => setSnapshot(p => ({ ...p, note: e.target.value }))} />
                    </div>
                    <button
                      onClick={() => addSnapshot.mutate(snapshot)}
                      disabled={addSnapshot.isPending}
                      style={{ ...saveButtonStyle(addSnapshot.isPending), background: "rgba(59,130,246,0.2)", borderColor: "rgba(59,130,246,0.4)", color: "#3b82f6" }}
                    >
                      <Save size={12} />
                      {addSnapshot.isPending ? "SAVING…" : "SAVE SNAPSHOT"}
                    </button>
                  </div>
                )}

                {/* Chart */}
                {chartData.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <BarChart3 size={32} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 10px" }} />
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.3)" }}>
                      No snapshots yet. Add your first monthly margin snapshot above.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary strip */}
                    <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                      {[
                        { label: "Latest Avg Margin",  value: latestMargin != null ? `${latestMargin.toFixed(1)}%` : "—", color: "#3b82f6" },
                        { label: "Month-on-Month",      value: marginDelta != null ? `${marginDelta >= 0 ? "+" : ""}${marginDelta.toFixed(1)}%` : "—", color: marginDelta != null && marginDelta >= 0 ? "#10b981" : "#ef4444" },
                        { label: "Months Tracked",      value: String(chartData.length), color: "rgba(255,255,255,0.7)" },
                        { label: "Best Month",          value: chartData.length > 0 ? `${Math.max(...chartData.map(d => d.margin)).toFixed(1)}%` : "—", color: "#10b981" },
                      ].map(s => (
                        <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "7px", padding: "10px 14px", flex: 1 }}>
                          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.15rem", color: s.color }}>{s.value}</div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 60]} />
                        <Tooltip
                          formatter={(v: any, name: string) => [`${(v as number).toFixed(1)}%`, name === "margin" ? "Avg Margin" : name === "best" ? "Best" : "Worst"]}
                          contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", fontFamily: "'Inter', sans-serif", fontSize: "0.75rem" }}
                        />
                        <ReferenceLine y={30} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1} label={{ value: "Target 30%", fill: "#f97316", fontSize: 9, fontFamily: "'Rajdhani', sans-serif" }} />
                        <Area type="monotone" dataKey="best"   stroke="#10b981" strokeWidth={1} fill="transparent" strokeDasharray="3 3" dot={false} />
                        <Area type="monotone" dataKey="margin" stroke="#3b82f6" strokeWidth={2.5} fill="url(#marginGrad)" dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} />
                        <Area type="monotone" dataKey="worst"  stroke="#ef4444" strokeWidth={1} fill="transparent" strokeDasharray="3 3" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>

                    {/* Snapshot table */}
                    <div style={{ marginTop: "16px", overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            {["Month", "Avg Margin", "Best", "Worst", "Brent $/bbl", "Critical SKUs", "Note"].map(h => (
                              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...(historyRows ?? [])].sort((a, b) => b.month.localeCompare(a.month)).map((r, i) => (
                            <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                              <td style={{ padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>{r.month}</td>
                              <td style={{ padding: "8px 12px" }}>
                                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: r.avgMargin >= 30 ? "#10b981" : r.avgMargin >= 20 ? "#f59e0b" : "#ef4444" }}>
                                  {r.avgMargin.toFixed(1)}%
                                </span>
                              </td>
                              <td style={{ padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#10b981" }}>{r.bestMargin != null ? `${r.bestMargin.toFixed(1)}%` : "—"}</td>
                              <td style={{ padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#ef4444" }}>{r.worstMargin != null ? `${r.worstMargin.toFixed(1)}%` : "—"}</td>
                              <td style={{ padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{r.avgBrentPrice != null ? `$${r.avgBrentPrice.toFixed(1)}` : "—"}</td>
                              <td style={{ padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: (r.criticalSkuCount ?? 0) > 0 ? "#ef4444" : "rgba(255,255,255,0.4)" }}>{r.criticalSkuCount ?? 0}</td>
                              <td style={{ padding: "8px 12px", fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.note ?? "—"}</td>
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
    </div>
  );
}
