/* NavigationSidebar — Freight Intel / Margin Sentinel
 * Design: Dark Intelligence — orange active border, icon+label nav items
 * Fixed left sidebar with branding and nav links.
 * Collapsible: toggle between full (192px) and icon-only (56px) modes.
 */
import {
  LayoutDashboard,
  TrendingUp,
  Globe,
  Ship,
  BarChart3,
  Newspaper,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  id: string;
  href: string;
  badge?: number;
  implemented: boolean;
}

interface NavigationSidebarProps {
  activeSection?: string;
  onSectionChange?: (id: string) => void;
}

export default function NavigationSidebar({ activeSection, onSectionChange }: NavigationSidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Live critical count from news feed — same cache, no extra request
  const { data: newsData } = trpc.news.feed.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });
  const liveCriticalCount = (newsData?.items ?? []).filter((i) => i.severity === "critical").length;

  // Section scroll handler — scrolls the inner dashboard container to the target section
  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    const container = document.querySelector('[data-scroll-container="main"]') as HTMLElement | null;
    if (!target) return;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + container.scrollTop - 8;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Dashboard sections
  const dashboardSections = [
    { icon: <Globe size={14} />,      label: "Supply Chain Map",   sectionId: "section-map"     },
    { icon: <Ship size={14} />,       label: "Carrier Engine",     sectionId: "section-carrier" },
    { icon: <BarChart3 size={14} />,  label: "Risk Forecast",      sectionId: "section-risk"    },
    { icon: <Newspaper size={14} />,  label: "News Feed",          sectionId: "section-news"    },
  ];

  // Margins page sections
  const marginsSections = [
    { icon: <TrendingUp size={14} />,  label: "Margin Analysis",    sectionId: "section-kpis"           },
    { icon: <Calculator size={14} />,  label: "Margin Calculator",  sectionId: "section-margin-calculator" },
  ];

  const sectionItems = location === "/" ? dashboardSections : location.startsWith("/margins") ? marginsSections : [];

  const navItems: NavItem[] = [
    { icon: <LayoutDashboard size={16} />, label: "Dashboard",       id: "dashboard", href: "/",          implemented: true  },
    { icon: <TrendingUp size={16} />,     label: "Margins",         id: "margins",   href: "/margins",   implemented: true  },
    { icon: <Flame size={16} />,          label: "Crisis Scenarios", id: "scenarios", href: "/scenarios", implemented: true  },
    { icon: <User size={16} />,           label: "Merchant Profile", id: "profile",   href: "/profile",   implemented: true  },
  ];

  const isActive = (item: NavItem) => {
    if (item.href === "/") return location === "/";
    return location.startsWith(item.href);
  };

  const handleUnimplementedClick = (item: NavItem) => {
    toast.info(`${item.label} — Feature coming soon`, {
      description: "This section is under development.",
      duration: 2500,
    });
  };

  const sidebarWidth = collapsed ? "56px" : "192px";

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: "rgba(11, 15, 25, 0.97)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 30,
        flexShrink: 0,
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          padding: collapsed ? "14px 0" : "12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          minHeight: "60px",
          position: "relative",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : "10px",
        }}
      >
        {/* Logo icon */}
        <div
          style={{
            width: 32,
            height: 32,
            background: "linear-gradient(135deg, #f97316, #dc2626)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(249,115,22,0.4)",
            flexShrink: 0,
          }}
        >
          <Zap size={16} style={{ color: "white" }} />
        </div>

        {/* Brand text — hidden when collapsed */}
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "1.05rem",
                letterSpacing: "0.06em",
                background: "linear-gradient(90deg, #f97316, #E91E8C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                lineHeight: 1.15,
                whiteSpace: "nowrap",
              }}
            >
              FREIGHT INTEL
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontSize: "0.6rem",
                letterSpacing: "0.04em",
                color: "rgba(255,255,255,0.35)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              Powered by{" "}
              <a
                href="https://datajar.co"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "linear-gradient(90deg, #f97316, #E91E8C)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Datajar
              </a>
            </div>
          </div>
        )}

        {/* Collapse toggle — floats on the right edge of the sidebar */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(255,255,255,0.4)",
            flexShrink: 0,
            transition: "background 0.15s, color 0.15s",
            position: "absolute",
            right: "-10px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 40,
          }}
          className="hover:bg-white/10 hover:text-white/70"
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </div>

      {/* Nav section label */}
      {!collapsed && (
        <div style={{ padding: "14px 16px 6px" }}>
          <span className="section-label">NAVIGATION</span>
        </div>
      )}
      {collapsed && <div style={{ height: "14px" }} />}

      {/* Nav items */}
      <nav style={{ flex: 1, padding: collapsed ? "0 6px" : "0 8px", overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map((item) => {
          const active = isActive(item);
          const navStyle: React.CSSProperties = {
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: collapsed ? 0 : "10px",
            padding: collapsed ? "9px 0" : "9px 10px",
            borderRadius: "6px",
            marginBottom: "2px",
            border: "none",
            cursor: "pointer",
            background: active ? "rgba(249,115,22,0.1)" : "transparent",
            borderLeft: active ? "3px solid #f97316" : "3px solid transparent",
            color: active ? "#f97316" : "rgba(255,255,255,0.55)",
            transition: "all 0.15s ease",
            textAlign: "left",
            position: "relative",
            textDecoration: "none",
            justifyContent: collapsed ? "center" : "flex-start",
          };

          const content = (
            <>
              <span
                style={{ flexShrink: 0 }}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      letterSpacing: "0.04em",
                      flex: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    {item.label}
                  </span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="alert-badge" style={{ flexShrink: 0 }}>
                      {item.badge}
                    </span>
                  )}
                  {/* Down arrow indicating sub-sections are available */}
                  <ChevronDown
                    size={12}
                    style={{
                      flexShrink: 0,
                      color: active ? "rgba(249,115,22,0.7)" : "rgba(255,255,255,0.25)",
                      transition: "color 0.15s ease",
                    }}
                  />
                </>
              )}
            </>
          );

          if (item.implemented) {
            return (
              <Link
                key={item.id}
                href={item.href}
                style={navStyle}
                className={active ? "" : "hover:bg-white/5 hover:text-white/80"}
                onClick={() => onSectionChange?.(item.id)}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleUnimplementedClick(item)}
              style={navStyle}
              className={active ? "" : "hover:bg-white/5 hover:text-white/80"}
            >
              {content}
            </button>
          );
        })}

        {/* SECTIONS quick-jump group — shown on Dashboard and Margins (hidden when collapsed) */}
        {!collapsed && sectionItems.length > 0 && (
          <>
            <div style={{ padding: "14px 16px 6px", marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="section-label">JUMP TO</span>
            </div>
            {sectionItems.map((item) => (
              <button
                key={item.sectionId}
                onClick={() => scrollToSection(item.sectionId)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  marginBottom: "2px",
                  border: "none",
                  cursor: "pointer",
                  background: "transparent",
                  borderLeft: "3px solid transparent",
                  color: "rgba(255,255,255,0.4)",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                }}
                className="hover:bg-white/5 hover:text-white/70"
              >
                <span style={{ flexShrink: 0, color: "rgba(249,115,22,0.6)" }}>{item.icon}</span>
                <span
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 500,
                    fontSize: "0.78rem",
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
