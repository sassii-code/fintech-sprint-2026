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
              background: active ? "var(--accent-grad)" : "transparent",
              color: active ? "#0f172a" : "var(--text-muted)",
              border: active ? "none" : "1px solid var(--border)",
            }}
          >
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
