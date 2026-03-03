/* Dashboard — Margin Sentinel
 * Design: Dark Intelligence / Cyber-Industrial Analytics
 * Layout: Fixed left nav → top header → pulse bar → alerts → main content grid
 * Main content: Full-width map → stats cards → bottom split (charts | news) + right sidebar
 *
 * KPI cards are live:
 *   Active Disruptions  → count of critical news items from live RSS feed
 *   Avg Delay Impact    → parsed from LLM-extracted etaImpact fields
 *   Freight Cost Index  → avg daily % change of BDRY + ZIM + CHRW shipping proxies
 *   Categories at Risk  → derived from union of affectedCategories in critical/warning news
 */
import { useMemo, useState } from "react";
import NavigationSidebar from "@/components/NavigationSidebar";
import TopHeader from "@/components/TopHeader";
import GlobalPulseBar from "@/components/GlobalPulseBar";
import AlertsSystem from "@/components/AlertsSystem";
import SupplyChainMap from "@/components/SupplyChainMap";
import CostInflationDrivers from "@/components/CostInflationDrivers";
import ImpactNewsFeed from "@/components/ImpactNewsFeed";
import RetailerActionPanel from "@/components/RetailerActionPanel";
import { trpc } from "@/lib/trpc";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Parse a delay string like "+14 days", "14 days", "2 weeks" → number of days */
function parseDelayDays(etaImpact: string | undefined): number | null {
  if (!etaImpact) return null;
  const clean = etaImpact.replace(/[+\s]/g, "").toLowerCase();
  const weekMatch = clean.match(/(\d+(?:\.\d+)?)week/);
  if (weekMatch) return Math.round(parseFloat(weekMatch[1]) * 7);
  const dayMatch = clean.match(/(\d+(?:\.\d+)?)day/);
  if (dayMatch) return Math.round(parseFloat(dayMatch[1]));
  return null;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // Shared category filter — lifted state shared between sidebar and news feed
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Live news for Active Disruptions, Avg Delay Impact, Categories at Risk
  const { data: newsData, isLoading: newsLoading } = trpc.news.feed.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  // Live market data for Freight Cost Index
  const { data: kpiData, isLoading: kpiLoading } = trpc.marketData.kpis.useQuery(undefined, {
    refetchInterval: 60 * 1000,
    staleTime: 55 * 1000,
  });

  // ── Derived KPI values ──────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const items = newsData?.items ?? [];
    const critical = items.filter((i) => i.severity === "critical");
    const impactful = items.filter((i) => i.severity === "critical" || i.severity === "warning");

    // Active Disruptions = count of critical news items
    const activeDisruptions = critical.length;

    // Avg Delay Impact = mean of parsed ETA delay fields across critical+warning items
    const delayValues = impactful
      .map((i) => parseDelayDays(i.etaImpact))
      .filter((d): d is number => d !== null);
    const avgDelay = delayValues.length > 0
      ? delayValues.reduce((a, b) => a + b, 0) / delayValues.length
      : null;
    const avgDelayStr = avgDelay !== null
      ? `+${avgDelay.toFixed(1)} days`
      : null;

    // Categories at Risk = unique affected categories across critical+warning items
    const allCategories = impactful.flatMap((i) => i.affectedCategories ?? []);
    const uniqueCategories = Array.from(new Set(allCategories));
    const totalCategories = 12;
    const categoriesAtRisk = uniqueCategories.length;
    const topCats = uniqueCategories.slice(0, 2).join(", ");

    return {
      activeDisruptions,
      avgDelayStr,
      delayCount: delayValues.length,
      categoriesAtRisk,
      totalCategories,
      topCats,
    };
  }, [newsData]);

  // ── Stat card definitions ───────────────────────────────────────────────────

  const stats = [
    {
      label: "Active Disruptions",
      value: newsLoading ? "—" : String(kpis.activeDisruptions),
      change: newsLoading ? "Loading..." : kpis.activeDisruptions > 0 ? `${kpis.activeDisruptions} critical events` : "No critical events",
      color: kpis.activeDisruptions >= 5 ? "#ef4444" : kpis.activeDisruptions >= 2 ? "#f59e0b" : "#10b981",
      live: !newsLoading,
    },
    {
      label: "Avg Delay Impact",
      value: newsLoading ? "—" : (kpis.avgDelayStr ?? "N/A"),
      change: newsLoading ? "Loading..." : kpis.delayCount > 0 ? `Based on ${kpis.delayCount} disruption${kpis.delayCount !== 1 ? "s" : ""}` : "No delay data",
      color: "#f59e0b",
      live: !newsLoading,
    },
    {
      label: "Freight Cost Index",
      value: kpiLoading ? "—" : (kpiData?.freightCostIndex ?? "+0.0%"),
      change: kpiLoading ? "Loading..." : (kpiData?.freightSubtext ?? "vs. prior close"),
      color: (kpiData?.freightChangePct ?? 0) >= 5 ? "#ef4444" : (kpiData?.freightChangePct ?? 0) >= 2 ? "#f97316" : "#10b981",
      live: !kpiLoading,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#0a0e1a",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(249,115,22,0.03) 0%, transparent 50%)",
      }}
    >
      {/* Left Navigation Sidebar */}
      <NavigationSidebar />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Top header */}
        <TopHeader />

        {/* Global Pulse Bar */}
        <GlobalPulseBar />

        {/* Alerts System */}
        <AlertsSystem />

        {/* Scrollable main content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px",
            display: "flex",
            gap: "12px",
          }}
        >
          {/* Center content (map + stats + bottom panels) */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              minWidth: 0,
            }}
          >
            {/* Supply Chain Disruption Map */}
            <SupplyChainMap />

            {/* Live KPI Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
              }}
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="ms-panel"
                  style={{ padding: "10px 14px", position: "relative" }}
                >
                  {/* LIVE badge */}
                  {stat.live && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <div
                        className="animate-blink"
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "#10b981",
                          boxShadow: "0 0 4px #10b981",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.55rem",
                          color: "rgba(16,185,129,0.7)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        LIVE
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.68rem",
                      color: "rgba(255,255,255,0.4)",
                      marginBottom: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.2rem",
                      color: stat.color,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.65rem",
                      color: "rgba(255,255,255,0.3)",
                      marginTop: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stat.change}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom row: Cost Inflation Drivers + Impact News Feed */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                minHeight: "380px",
              }}
            >
              <CostInflationDrivers />
              <ImpactNewsFeed selectedCategory={selectedCategory} onClearCategory={() => setSelectedCategory(null)} />
            </div>
          </div>

          {/* Right sidebar — Retailer Action Panel */}
          <div
            style={{
              width: "260px",
              minWidth: "260px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              overflowY: "auto",
            }}
          >
            <RetailerActionPanel selectedCategory={selectedCategory} onCategorySelect={setSelectedCategory} />
          </div>
        </div>
      </div>
    </div>
  );
}
