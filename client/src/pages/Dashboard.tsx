/* Dashboard — Margin Sentinel
 * Design: Dark Intelligence / Cyber-Industrial Analytics
 * Layout: Fixed left nav → top header → pulse bar → alerts → main content grid
 * Main content: Full-width map → bottom split (charts | news) + right sidebar
 */
import { useState } from "react";
import NavigationSidebar from "@/components/NavigationSidebar";
import TopHeader from "@/components/TopHeader";
import GlobalPulseBar from "@/components/GlobalPulseBar";
import AlertsSystem from "@/components/AlertsSystem";
import SupplyChainMap from "@/components/SupplyChainMap";
import CostInflationDrivers from "@/components/CostInflationDrivers";
import ImpactNewsFeed from "@/components/ImpactNewsFeed";
import RetailerActionPanel from "@/components/RetailerActionPanel";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");

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
      <NavigationSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

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
        <TopHeader alertCount={1} />

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
          {/* Center content (map + bottom panels) */}
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

            {/* Stats summary row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
              }}
            >
              {[
                { label: "Active Disruptions", value: "3", change: "+1 this week", color: "#ef4444" },
                { label: "Avg Delay Impact", value: "+8.7 days", change: "Asia-EU routes", color: "#f59e0b" },
                { label: "Freight Cost Index", value: "+18.4%", change: "vs. 6mo avg", color: "#f97316" },
                { label: "Categories at Risk", value: "5 / 12", change: "Electronics, Toys...", color: "#3b82f6" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="ms-panel"
                  style={{ padding: "10px 14px" }}
                >
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: stat.color, letterSpacing: "0.02em" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
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
              <ImpactNewsFeed />
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
            <RetailerActionPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
