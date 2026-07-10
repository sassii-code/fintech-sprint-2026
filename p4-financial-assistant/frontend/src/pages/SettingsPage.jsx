import { LogOut, User, Server } from "lucide-react";
import { useAuth } from "../AuthContext";
import { API_BASE_URL } from "../api";

export default function SettingsPage() {
  const { clientId, logout } = useAuth();

  return (
    <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card fade-in" style={{ padding: 24 }}>
        <div className="metric-label" style={{ marginBottom: 14 }}>Account</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.88rem", marginBottom: 10 }}>
          <User size={15} color="var(--text-faint)" /> Signed in as <strong>{clientId}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.88rem", color: "var(--text-muted)" }}>
          <Server size={15} color="var(--text-faint)" /> {API_BASE_URL}
        </div>
      </div>
      <button className="btn btn-ghost" onClick={logout} style={{ alignSelf: "flex-start" }}>
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
}
