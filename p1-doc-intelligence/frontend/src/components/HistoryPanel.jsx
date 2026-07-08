import { History, RefreshCw, Inbox } from "lucide-react";
import Skeleton from "./Skeleton";

export default function HistoryPanel({ items, loading, error, selectedId, onSelect, onRefresh }) {
  return (
    <div className="card fade-in" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, maxHeight: "74vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "0.9rem", margin: 0, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 7, fontWeight: 600 }}>
          <History size={15} /> History
        </h2>
        <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={onRefresh}>
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={52} />
          ))}
        </div>
      )}
      {error && <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div style={{ color: "var(--text-faint)", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>
          <Inbox size={22} style={{ opacity: 0.5, marginBottom: 8 }} />
          <div>No extractions yet.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              textAlign: "left",
              background: item.id === selectedId ? "rgba(99, 102, 241, 0.1)" : "transparent",
              border: "1px solid",
              borderColor: item.id === selectedId ? "rgba(99, 102, 241, 0.4)" : "var(--glass-border)",
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
              color: "var(--text)",
              transition: "border-color 0.15s var(--ease), background 0.15s var(--ease), transform 0.15s var(--ease)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.filename}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: "0.7rem", color: "var(--accent-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3 }}>
                {item.doc_type?.replace("_", " ")}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
