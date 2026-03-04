/* Dashboard — Margin Sentinel
 * Responsive: mobile (< 640px), tablet (640–1023px), desktop (≥ 1024px)
 * Mobile:  single column, stacked panels, collapsible sidebar
 * Tablet:  KPI 3-col, charts stacked, sidebar below news
 * Desktop: full layout with right sidebar
 */
import { useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";
import GlobalPulseBar from "@/components/GlobalPulseBar";
import AlertsSystem from "@/components/AlertsSystem";
import SupplyChainMap from "@/components/SupplyChainMap";
import CostInflationDrivers from "@/components/CostInflationDrivers";
import ImpactNewsFeed from "@/components/ImpactNewsFeed";
import RetailerActionPanel from "@/components/RetailerActionPanel";
import { trpc } from "@/lib/trpc";
import { useBreakpoint } from "@/hooks/useBreakpoint";

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
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Shared category filter — multi-select Set lifted to Dashboard
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const clearCategories = () => setSelectedCategories(new Set());

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

    const activeDisruptions = critical.length;

    const delayValues = impactful
      .map((i) => parseDelayDays(i.etaImpact))
      .filter((d): d is number => d !== null);
    const avgDelay = delayValues.length > 0
      ? delayValues.reduce((a, b) => a + b, 0) / delayValues.length
      : null;
    const avgDelayStr = avgDelay !== null ? `+${avgDelay.toFixed(1)} days` : null;

    const allCategories = impactful.flatMap((i) => i.affectedCategories ?? []);
    const uniqueCategories = Array.from(new Set(allCategories));
    const categoriesAtRisk = uniqueCategories.length;
    const topCats = uniqueCategories.slice(0, 2).join(", ");

    return { activeDisruptions, avgDelayStr, delayCount: delayValues.length, categoriesAtRisk, totalCategories: 12, topCats };
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
      color: "#E91E8C",
      live: !newsLoading,
    },
    {
      label: "Freight Cost Index",
      value: kpiLoading ? "—" : (kpiData?.freightCostIndex ?? "+0.0%"),
      change: kpiLoading ? "Loading..." : (kpiData?.freightSubtext ?? "vs. prior close"),
      color: (kpiData?.freightChangePct ?? 0) >= 5 ? "#ef4444" : (kpiData?.freightChangePct ?? 0) >= 2 ? "#E91E8C" : "#10b981",
      live: !kpiLoading,
    },
  ];

  // ── Layout helpers ──────────────────────────────────────────────────────────

  // KPI grid: 1 col on mobile, 3 cols on tablet+
  const kpiGridCols = isMobile ? "1fr" : "repeat(3, 1fr)";

  // Content padding
  const contentPadding = isMobile ? "8px" : "12px";
  const contentGap = isMobile ? "8px" : "12px";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#0a0e1a",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(233,30,140,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(249,115,22,0.04) 0%, transparent 50%)",
      }}
    >
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
            padding: contentPadding,
            display: "flex",
            flexDirection: "column",
            gap: contentGap,
            // Smooth momentum scrolling on iOS
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {/* Full-width Supply Chain Disruption Map (includes ShippingLinesPanel below it) */}
          <SupplyChainMap />

          {/* Full-width Retailer Action Panel (Shipping Companies + Alerts + Categories) */}
          {/* Placed directly below ShippingLinesPanel as requested */}
          <RetailerActionPanel
            selectedCategories={selectedCategories}
            onCategoryToggle={toggleCategory}
            onClearCategories={clearCategories}
          />

          {/* KPI cards + Cost Inflation Drivers + Impact News Feed */}
          <div
            style={{
              display: "flex",
              flexDirection: isDesktop ? "row" : "column",
              gap: contentGap,
              minWidth: 0,
            }}
          >
            {/* Center content: KPI stats + bottom panels */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: contentGap,
                minWidth: 0,
              }}
            >
              {/* Live KPI Stats row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: kpiGridCols,
                  gap: isMobile ? "8px" : "10px",
                }}
              >
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="ms-panel"
                    style={{ padding: isMobile ? "12px" : "10px 14px", position: "relative" }}
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
                        fontSize: isMobile ? "1.5rem" : "1.2rem",
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
              {/* Desktop: side by side | Mobile/Tablet: stacked */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
                  gap: contentGap,
                  minHeight: isMobile ? "auto" : "380px",
                }}
              >
                <CostInflationDrivers />
                <ImpactNewsFeed
                  selectedCategories={selectedCategories}
                  onClearCategories={clearCategories}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
