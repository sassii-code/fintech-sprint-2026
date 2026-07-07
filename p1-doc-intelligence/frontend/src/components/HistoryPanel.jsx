export default function HistoryPanel({ items, loading, error, selectedId, onSelect, onRefresh }) {
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "0.95rem", margin: 0, color: "var(--text-muted)" }}>History</h2>
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {loading && <div style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>Loading…</div>}
      {error && <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>No extractions yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              textAlign: "left",
              background: item.id === selectedId ? "rgba(56, 189, 248, 0.08)" : "transparent",
              border: "1px solid",
              borderColor: item.id === selectedId ? "rgba(56, 189, 248, 0.35)" : "var(--border)",
              borderRadius: 8,
              padding: "10px 12px",
              cursor: "pointer",
              color: "var(--text)",
            }}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.filename}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-a)", textTransform: "uppercase" }}>
                {item.doc_type?.replace("_", " ")}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
