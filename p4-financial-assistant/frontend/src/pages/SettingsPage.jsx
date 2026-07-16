import { User, Server, Info } from "lucide-react";
import { useAuth } from "../AuthContext";
import { API_BASE_URL } from "../api";

export default function SettingsPage() {
  const { clientId } = useAuth();

  return (
    <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card fade-in" style={{ padding: 24 }}>
        <div className="metric-label" style={{ marginBottom: 14 }}>Account</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.88rem", marginBottom: 10 }}>
          <User size={15} color="var(--text-faint)" /> Shared demo account <strong>({clientId})</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.88rem", color: "var(--text-muted)" }}>
          <Server size={15} color="var(--text-faint)" /> {API_BASE_URL}
        </div>
      </div>
      <div className="card fade-in" style={{ padding: 24, display: "flex", gap: 10, fontSize: "0.85rem", color: "var(--text-muted)" }}>
        <Info size={15} color="var(--text-faint)" style={{ flexShrink: 0, marginTop: 1 }} />
        This is a public portfolio demo with no login. All visitors share the same seeded demo data, and anything you upload is added to that shared account.
      </div>
    </div>
  );
}
