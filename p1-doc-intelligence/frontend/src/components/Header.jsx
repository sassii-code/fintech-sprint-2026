import { Sparkles, LogOut, BookOpen } from "lucide-react";
import { API_BASE_URL } from "../api";
import StatusIndicator from "./StatusIndicator";

export default function Header({ authenticated, onLogout, serverStatus }) {
  return (
    <header
      className="fade-in"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
        background: "rgba(10, 14, 26, 0.65)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--accent-grad)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px -4px rgba(99,102,241,0.6)",
            }}
          >
            <Sparkles size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.1 }}>
              DocSense <span className="gradient-text">AI</span>
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-faint)" }}>Document Intelligence Platform</div>
          </div>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusIndicator status={serverStatus} />
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ padding: "8px 14px", fontSize: "0.8rem", textDecoration: "none" }}
          >
            <BookOpen size={14} />
            API Docs
          </a>
          {authenticated && (
            <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: "0.8rem" }} onClick={onLogout}>
              <LogOut size={14} />
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
