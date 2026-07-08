import { DOC_TYPES } from "../api";

export default function DocTypeSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {DOC_TYPES.map((type) => {
        const active = type.value === value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className="btn"
            style={{
              padding: "8px 16px",
              fontSize: "0.85rem",
              background: active ? "var(--accent-grad)" : "rgba(255,255,255,0.03)",
              color: active ? "#fff" : "var(--text-muted)",
              border: active ? "none" : "1px solid var(--glass-border)",
              boxShadow: active ? "0 4px 14px -4px rgba(99,102,241,0.5)" : "none",
            }}
          >
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
