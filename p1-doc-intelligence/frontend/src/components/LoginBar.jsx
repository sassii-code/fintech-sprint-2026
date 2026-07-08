import { useState } from "react";
import { Sparkles, KeyRound, Loader2 } from "lucide-react";
import { login } from "../api";

export default function LoginBar({ onAuthenticated }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clientId || !clientSecret) return;
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await login(clientId, clientSecret);
      onAuthenticated(access_token);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div className="card slide-in" style={{ padding: 36, maxWidth: 400, width: "100%" }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 13,
            background: "var(--accent-grad)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            boxShadow: "0 8px 24px -8px rgba(99,102,241,0.6)",
          }}
        >
          <Sparkles size={22} color="#fff" strokeWidth={2.2} />
        </div>
        <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px", fontWeight: 700 }}>
          DocSense <span className="gradient-text">AI</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0 0 26px" }}>
          Sign in to extract and browse documents.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            className="input"
            placeholder="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            type="password"
            placeholder="Client Secret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />
          {error && <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
