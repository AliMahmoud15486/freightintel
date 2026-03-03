/* NavigationSidebar — Margin Sentinel
 * Design: Dark Intelligence — orange active border, icon+label nav items
 * Fixed left sidebar with branding, nav links, and user profile
 * Uses wouter Link for routing to implemented pages
 */
import {
  LayoutDashboard,
  Map,
  Droplets,
  TrendingUp,
  Bell,
  FileText,
  ChevronDown,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  id: string;
  href: string;
  badge?: number;
  implemented: boolean;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={16} />, label: "Dashboard", id: "dashboard", href: "/", implemented: true },
  { icon: <Map size={16} />, label: "Maps", id: "maps", href: "/maps", implemented: false },
  { icon: <Droplets size={16} />, label: "Oil Data", id: "oil", href: "/oil", implemented: false },
  { icon: <TrendingUp size={16} />, label: "Margins", id: "margins", href: "/margins", implemented: true },
  { icon: <Bell size={16} />, label: "Alerts", id: "alerts", href: "/alerts", badge: 2, implemented: false },
  { icon: <FileText size={16} />, label: "Reports", id: "reports", href: "/reports", implemented: false },
];

interface NavigationSidebarProps {
  activeSection?: string;
  onSectionChange?: (id: string) => void;
}

export default function NavigationSidebar({ activeSection, onSectionChange }: NavigationSidebarProps) {
  const [location] = useLocation();

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
      <nav style={{ flex: 1, padding: "0 8px" }}>
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
              {item.badge && (
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
      </nav>

      {/* User profile */}
      <div
        style={{
          padding: "12px 12px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
        }}
        onClick={() => toast.info("Profile settings coming soon")}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
          }}
        >
          AS
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "rgba(255,255,255,0.8)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Alexis Sedoser
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.65rem",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Dashboard
          </div>
        </div>
        <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
      </div>
    </aside>
  );
}
