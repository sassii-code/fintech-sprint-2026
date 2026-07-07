import { useState } from "react";
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
    <div className="card" style={{ padding: 32, maxWidth: 380, margin: "80px auto" }}>
      <h1 style={{ fontSize: "1.4rem", margin: "0 0 4px" }}>
        <span className="gradient-text">Document Intelligence</span>
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0 0 24px" }}>
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
        {error && (
          <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div>
        )}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
