import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, User } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function Topbar({ title, accounts = [], selectedAccountId, onSelectAccount }) {
  const { clientId } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const bellRef = useRef(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 32px",
        borderBottom: "1px solid var(--glass-border)",
        background: "rgba(10, 14, 20, 0.55)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>{title}</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {accounts.length > 0 && (
          <select
            className="input"
            value={selectedAccountId ?? ""}
            onChange={(e) => onSelectAccount?.(e.target.value ? Number(e.target.value) : null)}
            style={{ width: "auto", padding: "8px 12px", fontSize: "0.82rem" }}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        <div style={{ position: "relative" }} ref={bellRef}>
          <button className="icon-btn" onClick={() => setBellOpen((o) => !o)} aria-label="Notifications">
            <Bell size={17} />
          </button>
          {bellOpen && (
            <div className="card fade-in" style={{ position: "absolute", right: 0, top: 40, width: 240, padding: 16, zIndex: 50 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No new notifications.</div>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }} ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--glass-border)",
              borderRadius: 999,
              padding: "5px 10px 5px 5px",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--accent-grad)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {(clientId || "U").slice(0, 1).toUpperCase()}
            </div>
            <ChevronDown size={13} color="var(--text-faint)" />
          </button>
          {avatarOpen && (
            <div className="card fade-in" style={{ position: "absolute", right: 0, top: 40, width: 200, padding: 8, zIndex: 50 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <User size={14} /> {clientId} (public demo)
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
