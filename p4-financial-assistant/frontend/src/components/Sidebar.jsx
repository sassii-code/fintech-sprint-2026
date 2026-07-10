import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Upload, Receipt, Sparkles, Repeat, HeartPulse,
  FileDown, Settings, ChevronsLeft, ChevronsRight, TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/insights", label: "AI Insights", icon: Sparkles },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/health-score", label: "Health Score", icon: HeartPulse },
  { to: "/export", label: "Export", icon: FileDown },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      style={{
        width: collapsed ? 76 : 232,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--glass-border)",
        background: "rgba(10, 14, 20, 0.7)",
        backdropFilter: "blur(16px)",
        transition: "width 0.25s var(--ease)",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 18px", minWidth: 0 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--accent-grad)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 14px -4px rgba(99,102,241,0.6)",
          }}
        >
          <TrendingUp size={18} color="#fff" strokeWidth={2.4} />
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", whiteSpace: "nowrap" }}>
              FinSight <span className="gradient-text">AI</span>
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: collapsed ? "10px" : "10px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 10,
              textDecoration: "none",
              color: isActive ? "var(--text)" : "var(--text-muted)",
              background: isActive ? "rgba(99, 102, 241, 0.14)" : "transparent",
              border: isActive ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
              fontSize: "0.86rem",
              fontWeight: isActive ? 600 : 500,
              transition: "background 0.15s var(--ease), color 0.15s var(--ease), border-color 0.15s var(--ease)",
              whiteSpace: "nowrap",
            })}
          >
            <Icon size={17} style={{ flexShrink: 0 }} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      <button
        className="icon-btn"
        onClick={onToggle}
        style={{ margin: "10px 12px 18px", alignSelf: collapsed ? "center" : "flex-end" }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>
    </aside>
  );
}
