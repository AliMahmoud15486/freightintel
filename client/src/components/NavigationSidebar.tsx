/* NavigationSidebar — Margin Sentinel
 * Design: Dark Intelligence — orange active border, icon+label nav items
 * Fixed left sidebar with branding and nav links.
 * alertCount prop drives the live badge on the Alerts nav item.
 */
import {
  LayoutDashboard,
  Map,
  Droplets,
  TrendingUp,
  Bell,
  Shield,
  Globe,
  Ship,
  Calculator,
  BarChart3,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

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
      // Calculate offset relative to the scrollable container
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + container.scrollTop - 8;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    } else {
      // Fallback for non-nested layouts
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sectionItems = [
    { icon: <Globe size={14} />,      label: "Supply Chain Map",   sectionId: "section-map"     },
    { icon: <Ship size={14} />,       label: "Carrier Engine",     sectionId: "section-carrier" },
    { icon: <Calculator size={14} />, label: "Margin Calculator",  sectionId: "section-margin"  },
    { icon: <BarChart3 size={14} />,  label: "Risk Forecast",      sectionId: "section-risk"    },
    { icon: <Newspaper size={14} />,  label: "News Feed",          sectionId: "section-news"    },
  ];

  const navItems: NavItem[] = [
    { icon: <LayoutDashboard size={16} />, label: "Dashboard", id: "dashboard", href: "/",        implemented: true  },
    { icon: <Map size={16} />,            label: "Maps",       id: "maps",      href: "/maps",     implemented: false },
    { icon: <Droplets size={16} />,       label: "Oil Data",   id: "oil",       href: "/oil",      implemented: false },
    { icon: <TrendingUp size={16} />,     label: "Margins",    id: "margins",   href: "/margins",  implemented: true  },
    { icon: <Bell size={16} />,           label: "Alerts",     id: "alerts",    href: "/alerts",   badge: liveCriticalCount || undefined, implemented: false },
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

  return (
    <aside
      style={{
        width: "192px",
        minWidth: "192px",
        background: "rgba(11, 15, 25, 0.97)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 30,
        flexShrink: 0,
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          padding: "18px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
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
          <Shield size={16} style={{ color: "white" }} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "0.08em",
              color: "white",
              lineHeight: 1.1,
            }}
          >
            MARGIN
          </div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "0.08em",
              color: "#f97316",
              lineHeight: 1.1,
            }}
          >
            SENTINEL
          </div>
        </div>
      </div>

      {/* Nav section label */}
      <div style={{ padding: "16px 16px 8px" }}>
        <span className="section-label">NAVIGATION</span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "0 8px", overflowY: 'auto' }}>
        {navItems.map((item) => {
          const active = isActive(item);
          const navStyle: React.CSSProperties = {
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 10px",
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
          };

          const content = (
            <>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  letterSpacing: "0.04em",
                  flex: 1,
                }}
              >
                {item.label}
              </span>
              {item.badge != null && item.badge > 0 && (
                <span className="alert-badge" style={{ flexShrink: 0 }}>
                  {item.badge}
                </span>
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
        {/* SECTIONS quick-jump group — only shown on Dashboard */}
        {location === "/" && (
          <>
            <div style={{ padding: "16px 16px 8px", marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
